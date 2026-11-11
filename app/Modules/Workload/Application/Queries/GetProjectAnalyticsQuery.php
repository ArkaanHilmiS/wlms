<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\Queries;

use App\Modules\Workload\Application\DTOs\ProjectAnalyticsInput;
use App\Modules\Workload\Application\DTOs\ProjectAnalyticsOutput;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

final class GetProjectAnalyticsQuery
{
    public function execute(ProjectAnalyticsInput $input): ProjectAnalyticsOutput
    {
        // 1. Query 1: Project lookup
        $project = DB::table('projects')
            ->where('id', $input->projectId)
            ->whereNull('deleted_at')
            ->select(['id', 'key', 'name', 'status', 'workspace_id', 'start_date', 'end_date'])
            ->first();

        if (! $project) {
            throw new ModelNotFoundException("Project [{$input->projectId}] not found.");
        }

        // Resolve date range
        [$startDate, $endDate, $dateRangeLabel] = $this->resolveDateRange(
            $input->dateRange,
            $input->from,
            $input->to
        );

        // 2. Query 2: All issues in project with joined status, type, priority in O(1) query
        $issueRows = DB::table('issues')
            ->join('statuses', 'statuses.id', '=', 'issues.status_id')
            ->join('issue_types', 'issue_types.id', '=', 'issues.issue_type_id')
            ->join('priorities', 'priorities.id', '=', 'issues.priority_id')
            ->where('issues.project_id', $input->projectId)
            ->whereNull('issues.deleted_at')
            ->select([
                'issues.id',
                'issues.created_at',
                'issues.updated_at',
                'issues.start_date',
                'issues.due_date',
                'issues.story_points',
                'issues.sprint_id',
                'statuses.id as status_id',
                'statuses.name as status_name',
                'statuses.slug as status_slug',
                'statuses.category as status_category',
                'statuses.color as status_color',
                'issue_types.id as type_id',
                'issue_types.name as type_name',
                'issue_types.slug as type_slug',
                'issue_types.color as type_color',
                'priorities.id as priority_id',
                'priorities.name as priority_name',
                'priorities.slug as priority_slug',
                'priorities.level as priority_level',
                'priorities.color as priority_color',
            ])
            ->get();

        $filters = [
            'date_range' => $dateRangeLabel,
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
            'sprint_id' => $input->sprintId,
        ];

        // Handle empty project issues
        if ($issueRows->isEmpty()) {
            return new ProjectAnalyticsOutput(
                project: [
                    'id' => (string) $project->id,
                    'key' => (string) $project->key,
                    'name' => (string) $project->name,
                    'status' => (string) $project->status,
                ],
                summary: [
                    'total_issues' => 0,
                    'completed_issues' => 0,
                    'in_progress_issues' => 0,
                    'todo_issues' => 0,
                    'overdue_issues' => 0,
                    'completion_rate' => 0.0,
                ],
                leadTime: $this->emptyLeadTime(),
                cycleTime: $this->emptyLeadTime(),
                cumulativeFlow: [],
                issueTypes: [],
                priorities: [],
                sprintMetrics: [
                    'has_sprints' => false,
                    'mode' => 'non_sprint',
                    'burndown' => [],
                    'velocity' => [],
                ],
                filters: $filters,
            );
        }

        // Categorize issues
        $totalIssues = $issueRows->count();
        $completedIssues = $issueRows->filter(function (\stdClass $i): bool {
            $cat = strtoupper((string) ($i->status_category ?? ''));
            $slug = strtolower((string) ($i->status_slug ?? ''));

            return $cat === 'DONE' || $slug === 'done';
        });

        $inProgressIssues = $issueRows->filter(function (\stdClass $i): bool {
            $cat = strtoupper((string) ($i->status_category ?? ''));
            $slug = strtolower((string) ($i->status_slug ?? ''));

            return $cat === 'IN_PROGRESS' || str_contains($slug, 'progress');
        });

        $todoIssues = $issueRows->filter(function (\stdClass $i): bool {
            $cat = strtoupper((string) ($i->status_category ?? ''));
            $slug = strtolower((string) ($i->status_slug ?? ''));

            return $cat === 'TODO' || $slug === 'todo' || $slug === 'to-do';
        });

        $todayStr = CarbonImmutable::now()->toDateString();
        $overdueIssues = $issueRows->filter(function (\stdClass $i) use ($todayStr): bool {
            if (! $i->due_date) {
                return false;
            }
            $cat = strtoupper((string) ($i->status_category ?? ''));
            $slug = strtolower((string) ($i->status_slug ?? ''));
            if ($cat === 'DONE' || $slug === 'done') {
                return false;
            }

            return substr((string) $i->due_date, 0, 10) < $todayStr;
        });

        $summary = [
            'total_issues' => $totalIssues,
            'completed_issues' => $completedIssues->count(),
            'in_progress_issues' => $inProgressIssues->count(),
            'todo_issues' => $todoIssues->count(),
            'overdue_issues' => $overdueIssues->count(),
            'completion_rate' => $totalIssues > 0 ? round(($completedIssues->count() / $totalIssues) * 100.0, 1) : 0.0,
        ];

        // 3. Query 3: Status history for issues in this project
        $issueIds = $issueRows->pluck('id')->all();
        /** @var Collection<string, Collection<int, \stdClass>> $historyRows */
        $historyRows = DB::table('issue_histories')
            ->whereIn('issue_id', $issueIds)
            ->where('field_changed', 'status_id')
            ->orderBy('created_at', 'asc')
            ->get()
            ->groupBy(fn (\stdClass $h): string => (string) $h->issue_id);

        $leadTimeMetrics = $this->calculateLeadTime($completedIssues, $historyRows);
        $cycleTimeMetrics = $this->calculateCycleTime($completedIssues, $historyRows);

        // 4. Cumulative Flow Diagram
        $cumulativeFlow = $this->generateCumulativeFlow($issueRows, $startDate, $endDate);

        // 5. Issue Types Breakdown
        $issueTypesBreakdown = $this->aggregateIssueTypesBreakdown($issueRows);

        // 6. Priorities Breakdown
        $prioritiesBreakdown = $this->aggregatePrioritiesBreakdown($issueRows);

        // 7. Query 4: Sprints in project
        $sprintRows = DB::table('sprints')
            ->where('project_id', $input->projectId)
            ->orderBy('created_at', 'asc')
            ->get();

        $sprintMetrics = $this->aggregateSprintMetrics(
            $sprintRows,
            $input->sprintId,
            $issueRows,
            $startDate,
            $endDate
        );

        return new ProjectAnalyticsOutput(
            project: [
                'id' => (string) $project->id,
                'key' => (string) $project->key,
                'name' => (string) $project->name,
                'status' => (string) $project->status,
            ],
            summary: $summary,
            leadTime: $leadTimeMetrics,
            cycleTime: $cycleTimeMetrics,
            cumulativeFlow: $cumulativeFlow,
            issueTypes: $issueTypesBreakdown,
            priorities: $prioritiesBreakdown,
            sprintMetrics: $sprintMetrics,
            filters: $filters,
        );
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable, 2: string}
     */
    private function resolveDateRange(string $range, ?string $from, ?string $to): array
    {
        $now = CarbonImmutable::now();

        if ($range === '7d' || $range === 'last_7_days') {
            return [$now->subDays(7)->startOfDay(), $now->endOfDay(), '7d'];
        }

        if ($range === 'quarter' || $range === 'this_quarter') {
            return [$now->firstOfQuarter()->startOfDay(), $now->endOfDay(), 'quarter'];
        }

        if ($range === 'custom' && $from && $to) {
            try {
                $start = CarbonImmutable::parse($from)->startOfDay();
                $end = CarbonImmutable::parse($to)->endOfDay();
                if ($start->lte($end)) {
                    return [$start, $end, 'custom'];
                }
            } catch (\Throwable $e) {
                Log::debug("Project analytics date range parse failed for from: '{$from}', to: '{$to}': ".$e->getMessage());
            }
        }

        return [$now->subDays(30)->startOfDay(), $now->endOfDay(), '30d'];
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyLeadTime(): array
    {
        return [
            'average_days' => 0.0,
            'median_days' => 0.0,
            'p85_days' => 0.0,
            'distribution' => [
                ['bucket' => '0-2d', 'count' => 0],
                ['bucket' => '3-5d', 'count' => 0],
                ['bucket' => '6-10d', 'count' => 0],
                ['bucket' => '>10d', 'count' => 0],
            ],
        ];
    }

    /**
     * @param  Collection<int, \stdClass>  $completedIssues
     * @param  Collection<string, Collection<int, \stdClass>>  $historyRows
     * @return array<string, mixed>
     */
    private function calculateLeadTime(Collection $completedIssues, Collection $historyRows): array
    {
        if ($completedIssues->isEmpty()) {
            return $this->emptyLeadTime();
        }

        $durations = [];
        $buckets = ['0-2d' => 0, '3-5d' => 0, '6-10d' => 0, '>10d' => 0];

        foreach ($completedIssues as $issue) {
            $created = CarbonImmutable::parse((string) $issue->created_at);
            $done = CarbonImmutable::parse((string) $issue->updated_at);

            $diffSeconds = max(0, $done->getTimestamp() - $created->getTimestamp());
            $days = max(0.1, round($diffSeconds / 86400.0, 1));
            $durations[] = $days;

            if ($days <= 2.0) {
                $buckets['0-2d']++;
            } elseif ($days <= 5.0) {
                $buckets['3-5d']++;
            } elseif ($days <= 10.0) {
                $buckets['6-10d']++;
            } else {
                $buckets['>10d']++;
            }
        }

        sort($durations);
        $count = count($durations);
        $avg = round(array_sum($durations) / $count, 1);
        $median = $durations[(int) floor(($count - 1) * 0.5)];
        $p85Index = min($count - 1, (int) ceil($count * 0.85) - 1);
        $p85 = $durations[$p85Index];

        return [
            'average_days' => $avg,
            'median_days' => $median,
            'p85_days' => $p85,
            'distribution' => [
                ['bucket' => '0-2d', 'count' => $buckets['0-2d']],
                ['bucket' => '3-5d', 'count' => $buckets['3-5d']],
                ['bucket' => '6-10d', 'count' => $buckets['6-10d']],
                ['bucket' => '>10d', 'count' => $buckets['>10d']],
            ],
        ];
    }

    /**
     * @param  Collection<int, \stdClass>  $completedIssues
     * @param  Collection<string, Collection<int, \stdClass>>  $historyRows
     * @return array<string, mixed>
     */
    private function calculateCycleTime(Collection $completedIssues, Collection $historyRows): array
    {
        if ($completedIssues->isEmpty()) {
            return $this->emptyLeadTime();
        }

        $durations = [];
        $buckets = ['0-2d' => 0, '3-5d' => 0, '6-10d' => 0, '>10d' => 0];

        foreach ($completedIssues as $issue) {
            $created = CarbonImmutable::parse((string) $issue->created_at);
            $done = CarbonImmutable::parse((string) $issue->updated_at);
            $started = $created;

            $issueId = (string) $issue->id;
            $hist = $historyRows->get($issueId);
            if ($hist && $hist->isNotEmpty()) {
                $first = $hist->first();
                if (isset($first->created_at)) {
                    $started = CarbonImmutable::parse((string) $first->created_at);
                }
            } elseif ($issue->start_date) {
                $started = CarbonImmutable::parse((string) $issue->start_date);
            }

            $diffSeconds = max(0, $done->getTimestamp() - $started->getTimestamp());
            $days = max(0.1, round($diffSeconds / 86400.0, 1));
            $durations[] = $days;

            if ($days <= 2.0) {
                $buckets['0-2d']++;
            } elseif ($days <= 5.0) {
                $buckets['3-5d']++;
            } elseif ($days <= 10.0) {
                $buckets['6-10d']++;
            } else {
                $buckets['>10d']++;
            }
        }

        sort($durations);
        $count = count($durations);
        $avg = round(array_sum($durations) / $count, 1);
        $median = $durations[(int) floor(($count - 1) * 0.5)];
        $p85Index = min($count - 1, (int) ceil($count * 0.85) - 1);
        $p85 = $durations[$p85Index];

        return [
            'average_days' => $avg,
            'median_days' => $median,
            'p85_days' => $p85,
            'distribution' => [
                ['bucket' => '0-2d', 'count' => $buckets['0-2d']],
                ['bucket' => '3-5d', 'count' => $buckets['3-5d']],
                ['bucket' => '6-10d', 'count' => $buckets['6-10d']],
                ['bucket' => '>10d', 'count' => $buckets['>10d']],
            ],
        ];
    }

    /**
     * @param  Collection<int, \stdClass>  $issues
     * @return array<int, array<string, mixed>>
     */
    private function generateCumulativeFlow(
        Collection $issues,
        CarbonImmutable $startDate,
        CarbonImmutable $endDate
    ): array {
        if ($issues->isEmpty()) {
            return [];
        }

        $daysDiff = max(1, (int) $startDate->diffInDays($endDate));
        $steps = min(10, $daysDiff);
        $stepInterval = max(1, (int) floor($daysDiff / $steps));

        $points = [];
        $curr = $startDate;
        while ($curr->lte($endDate)) {
            $points[] = $curr;
            $curr = $curr->addDays($stepInterval);
        }
        $lastPoint = $points !== [] ? $points[count($points) - 1] : null;
        if ($lastPoint !== null && $lastPoint->lt($endDate)) {
            $points[] = $endDate;
        }

        $flow = [];
        foreach ($points as $datePoint) {
            $todoCount = 0;
            $inProgressCount = 0;
            $doneCount = 0;

            foreach ($issues as $issue) {
                $created = CarbonImmutable::parse((string) $issue->created_at);
                if ($created->gt($datePoint)) {
                    continue; // issue not yet created
                }

                $updated = CarbonImmutable::parse((string) $issue->updated_at);
                $cat = strtoupper((string) ($issue->status_category ?? ''));
                $slug = strtolower((string) ($issue->status_slug ?? ''));
                $isDone = ($cat === 'DONE' || $slug === 'done');
                $isInProgress = ($cat === 'IN_PROGRESS' || str_contains($slug, 'progress'));

                if ($isDone && $updated->lte($datePoint)) {
                    $doneCount++;
                } elseif ($isInProgress || ($isDone && $updated->gt($datePoint))) {
                    $inProgressCount++;
                } else {
                    $todoCount++;
                }
            }

            $flow[] = [
                'date' => $datePoint->toDateString(),
                'todo' => $todoCount,
                'in_progress' => $inProgressCount,
                'done' => $doneCount,
            ];
        }

        return $flow;
    }

    /**
     * @param  Collection<int, \stdClass>  $issues
     * @return array<int, array<string, mixed>>
     */
    private function aggregateIssueTypesBreakdown(Collection $issues): array
    {
        $total = $issues->count();
        $grouped = $issues->groupBy(fn (\stdClass $i): string => (string) $i->type_id);

        $result = [];
        foreach ($grouped as $group) {
            $first = $group->first();
            if (! $first) {
                continue;
            }

            $count = $group->count();
            $percentage = $total > 0 ? round(($count / $total) * 100.0, 1) : 0.0;

            $result[] = [
                'id' => (string) $first->type_id,
                'name' => (string) $first->type_name,
                'slug' => (string) $first->type_slug,
                'count' => $count,
                'percentage' => $percentage,
                'color' => (string) ($first->type_color ?? '#3B82F6'),
            ];
        }

        usort($result, fn (array $a, array $b): int => $b['count'] <=> $a['count']);

        return $result;
    }

    /**
     * @param  Collection<int, \stdClass>  $issues
     * @return array<int, array<string, mixed>>
     */
    private function aggregatePrioritiesBreakdown(Collection $issues): array
    {
        $total = $issues->count();
        $grouped = $issues->groupBy(fn (\stdClass $i): string => (string) $i->priority_id);

        $result = [];
        foreach ($grouped as $group) {
            $first = $group->first();
            if (! $first) {
                continue;
            }

            $count = $group->count();
            $percentage = $total > 0 ? round(($count / $total) * 100.0, 1) : 0.0;

            $result[] = [
                'id' => (string) $first->priority_id,
                'name' => (string) $first->priority_name,
                'slug' => (string) $first->priority_slug,
                'level' => (int) $first->priority_level,
                'count' => $count,
                'percentage' => $percentage,
                'color' => (string) ($first->priority_color ?? '#EF4444'),
            ];
        }

        usort($result, fn (array $a, array $b): int => $a['level'] <=> $b['level']);

        return $result;
    }

    /**
     * @param  Collection<int, \stdClass>  $sprintRows
     * @param  Collection<int, \stdClass>  $issues
     * @return array<string, mixed>
     */
    private function aggregateSprintMetrics(
        Collection $sprintRows,
        ?string $selectedSprintId,
        Collection $issues,
        CarbonImmutable $startDate,
        CarbonImmutable $endDate
    ): array {
        $pointOf = static fn (\stdClass $i): int => max(1, (int) ($i->story_points ?? 0));
        $isIssueDone = static function (\stdClass $i): bool {
            $cat = strtoupper((string) ($i->status_category ?? ''));
            $slug = strtolower((string) ($i->status_slug ?? ''));

            return $cat === 'DONE' || $slug === 'done';
        };

        if ($sprintRows->isEmpty() || $selectedSprintId === 'non_sprint') {
            $totalScope = (int) $issues->sum($pointOf);
            $durationDays = max(1, (int) $startDate->diffInDays($endDate));
            $steps = min(10, $durationDays);
            $stepDays = max(1, (int) floor($durationDays / $steps));

            $burndown = [];
            for ($step = 0; $step <= $steps; $step++) {
                $dayIndex = min($durationDays, $step * $stepDays);
                $pointDate = $startDate->addDays($dayIndex)->endOfDay();

                $doneByDate = (int) $issues
                    ->filter(function (\stdClass $i) use ($isIssueDone, $pointDate): bool {
                        if (! $isIssueDone($i)) {
                            return false;
                        }

                        return CarbonImmutable::parse((string) $i->updated_at)->lte($pointDate);
                    })
                    ->sum($pointOf);

                $ideal = round($totalScope - ($totalScope / $durationDays) * $dayIndex, 1);
                $actual = max(0, $totalScope - $doneByDate);

                $burndown[] = [
                    'day' => $pointDate->format('M d'),
                    'ideal_points' => max(0.0, $ideal),
                    'actual_points' => (float) $actual,
                ];
            }

            $velocity = [];
            $weekStart = $startDate->startOfWeek();
            $weekNum = 1;
            $weeklyTarget = max(1, (int) ceil($totalScope / max(1.0, ceil($durationDays / 7.0))));
            while ($weekStart->lte($endDate) && $weekNum <= 8) {
                $weekEnd = $weekStart->endOfWeek();

                $completedInWeek = (int) $issues
                    ->filter(function (\stdClass $i) use ($isIssueDone, $weekStart, $weekEnd): bool {
                        if (! $isIssueDone($i)) {
                            return false;
                        }
                        $updated = CarbonImmutable::parse((string) $i->updated_at);

                        return $updated->gte($weekStart) && $updated->lte($weekEnd);
                    })
                    ->sum($pointOf);

                $velocity[] = [
                    'sprint_id' => 'week_'.$weekNum,
                    'sprint_name' => $weekStart->format('M d'),
                    'committed_points' => max($completedInWeek, $weeklyTarget),
                    'completed_points' => $completedInWeek,
                ];

                $weekStart = $weekStart->addWeek();
                $weekNum++;
            }

            return [
                'has_sprints' => $sprintRows->isNotEmpty(),
                'mode' => 'non_sprint',
                'burndown' => $burndown,
                'velocity' => $velocity,
            ];
        }

        // Velocity history
        $velocity = [];
        foreach ($sprintRows as $sprint) {
            $committed = (int) $sprint->committed_points;
            $completed = (int) $sprint->completed_points;

            $sprintIssues = $issues->filter(fn (\stdClass $i): bool => (string) $i->sprint_id === (string) $sprint->id);
            $hasStoryPoints = $sprintIssues->sum(fn (\stdClass $i): int => (int) ($i->story_points ?? 0)) > 0;
            $issueWeight = $hasStoryPoints
                ? static fn (\stdClass $i): int => (int) ($i->story_points ?? 0)
                : static fn (\stdClass $i): int => 1;

            if ($completed === 0) {
                $completed = (int) $sprintIssues
                    ->filter($isIssueDone)
                    ->sum($issueWeight);
            }

            if ($committed === 0) {
                $committed = (int) $sprintIssues->sum($issueWeight);
            }

            $velocity[] = [
                'sprint_id' => (string) $sprint->id,
                'sprint_name' => (string) $sprint->name,
                'committed_points' => $committed,
                'completed_points' => $completed,
            ];
        }

        // Burndown for target sprint
        $targetSprint = null;
        if ($selectedSprintId) {
            $targetSprint = $sprintRows->first(fn (\stdClass $s): bool => (string) $s->id === $selectedSprintId);
        }
        $targetSprint ??= $sprintRows->first(fn (\stdClass $s): bool => strtoupper((string) $s->state) === 'ACTIVE') ?? $sprintRows->last();

        $burndown = [];
        $targetSprintId = (string) $targetSprint->id;
        $sprintIssues = $issues->filter(fn (\stdClass $i): bool => (string) $i->sprint_id === $targetSprintId);
        $hasStoryPoints = $sprintIssues->sum(fn (\stdClass $i): int => (int) ($i->story_points ?? 0)) > 0;
        $issueWeight = $hasStoryPoints
            ? static fn (\stdClass $i): int => (int) ($i->story_points ?? 0)
            : static fn (\stdClass $i): int => 1;

        $committed = (int) $targetSprint->committed_points;
        if ($committed === 0) {
            $committed = max(10, (int) $sprintIssues->sum($issueWeight));
        }

        $sprintStart = $targetSprint->start_date ? CarbonImmutable::parse((string) $targetSprint->start_date) : CarbonImmutable::now()->subDays(10);
        $sprintEnd = $targetSprint->end_date ? CarbonImmutable::parse((string) $targetSprint->end_date) : CarbonImmutable::now()->addDays(4);

        $durationDays = max(1, (int) $sprintStart->diffInDays($sprintEnd));
        $daysPassed = min($durationDays, max(0, (int) $sprintStart->diffInDays(CarbonImmutable::now())));

        $completedPoints = (int) $sprintIssues
            ->filter($isIssueDone)
            ->sum($issueWeight);

        $actualRemaining = max(0, $committed - $completedPoints);

        for ($day = 0; $day <= $durationDays; $day++) {
            $ideal = round($committed - ($committed / $durationDays) * $day, 1);
            $actual = $day <= $daysPassed
                ? round($committed - (($committed - $actualRemaining) / max(1, $daysPassed)) * $day, 1)
                : null;

            $burndown[] = [
                'day' => "Day {$day}",
                'ideal_points' => max(0.0, $ideal),
                'actual_points' => $actual !== null ? max(0.0, $actual) : null,
            ];
        }

        return [
            'has_sprints' => true,
            'mode' => 'sprint',
            'burndown' => $burndown,
            'velocity' => $velocity,
        ];
    }
}
