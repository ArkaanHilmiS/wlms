<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\Queries;

use App\Modules\Workload\Application\DTOs\WorkspaceAnalyticsInput;
use App\Modules\Workload\Application\DTOs\WorkspaceAnalyticsOutput;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

final class GetWorkspaceAnalyticsQuery
{
    public function execute(WorkspaceAnalyticsInput $input): WorkspaceAnalyticsOutput
    {
        // 1. Resolve date range
        [$startDate, $endDate, $dateRangeLabel] = $this->resolveDateRange(
            $input->dateRange,
            $input->from,
            $input->to
        );

        // 2. Query 1: Projects with issue aggregates in bounded O(1) query
        $todayStr = CarbonImmutable::now()->toDateString();
        $projectRows = DB::table('projects')
            ->leftJoin('issues', function ($join) {
                $join->on('issues.project_id', '=', 'projects.id')
                    ->whereNull('issues.deleted_at');
            })
            ->leftJoin('statuses', 'statuses.id', '=', 'issues.status_id')
            ->where('projects.workspace_id', $input->workspaceId)
            ->whereNull('projects.deleted_at')
            ->select([
                'projects.id',
                'projects.key',
                'projects.name',
                'projects.status',
                'projects.start_date',
                'projects.end_date',
                DB::raw('COUNT(issues.id) as total_issues'),
                DB::raw("SUM(CASE WHEN statuses.category = 'DONE' OR statuses.slug = 'done' THEN 1 ELSE 0 END) as completed_issues"),
                DB::raw("SUM(CASE WHEN issues.due_date IS NOT NULL AND issues.due_date < '{$todayStr}' AND statuses.category != 'DONE' AND statuses.slug != 'done' THEN 1 ELSE 0 END) as overdue_issues"),
                DB::raw('SUM(COALESCE(issues.original_estimate_seconds, 0)) as total_est_seconds'),
            ])
            ->groupBy(
                'projects.id',
                'projects.key',
                'projects.name',
                'projects.status',
                'projects.start_date',
                'projects.end_date'
            )
            ->orderBy('projects.name', 'asc')
            ->get();

        // If no projects found, check if workspace itself exists
        if ($projectRows->isEmpty()) {
            $workspaceExists = DB::table('workspaces')
                ->where('id', $input->workspaceId)
                ->whereNull('deleted_at')
                ->exists();

            if (! $workspaceExists) {
                throw new ModelNotFoundException("Workspace [{$input->workspaceId}] not found.");
            }

            // Return clean empty state
            return new WorkspaceAnalyticsOutput(
                summary: [
                    'total_projects' => 0,
                    'active_projects' => 0,
                    'total_issues' => 0,
                    'completed_issues' => 0,
                    'overdue_issues' => 0,
                    'completion_rate' => 0.0,
                ],
                projects: [],
                throughput: [],
                memberWorkload: $this->getEmptyWorkspaceMembers($input->workspaceId),
                filters: [
                    'date_range' => $dateRangeLabel,
                    'start_date' => $startDate->toDateString(),
                    'end_date' => $endDate->toDateString(),
                ],
            );
        }

        // Process project metrics
        $projectList = [];
        $totalIssues = 0;
        $completedIssues = 0;
        $overdueIssues = 0;
        $activeProjectsCount = 0;

        foreach ($projectRows as $row) {
            $pTotal = (int) $row->total_issues;
            $pCompleted = (int) $row->completed_issues;
            $pOverdue = (int) ($row->overdue_issues ?? 0);
            $totalIssues += $pTotal;
            $completedIssues += $pCompleted;
            $overdueIssues += $pOverdue;

            $statusStr = strtoupper((string) ($row->status ?? 'ACTIVE'));
            if ($statusStr === 'ACTIVE' || $statusStr === 'IN_PROGRESS') {
                $activeProjectsCount++;
            }

            $progress = $pTotal > 0 ? round(($pCompleted / $pTotal) * 100, 1) : 0.0;

            // Determine health status
            $healthStatus = 'on_track';
            if ($pTotal > 0 && $pCompleted === $pTotal) {
                $healthStatus = 'completed';
            } elseif ($row->end_date && CarbonImmutable::parse((string) $row->end_date)->isPast() && $pCompleted < $pTotal) {
                $healthStatus = 'at_risk';
            } elseif ($progress < 40.0 && $pTotal > 0) {
                $healthStatus = 'at_risk';
            }

            $projectList[] = [
                'id' => (string) $row->id,
                'key' => (string) $row->key,
                'name' => (string) $row->name,
                'status' => (string) $row->status,
                'total_issues' => $pTotal,
                'completed_issues' => $pCompleted,
                'progress_percent' => $progress,
                'health_status' => $healthStatus,
            ];
        }

        // 3. Query 2: Throughput (completed issues within date range)
        $completedRows = DB::table('issues')
            ->join('projects', 'projects.id', '=', 'issues.project_id')
            ->join('statuses', 'statuses.id', '=', 'issues.status_id')
            ->where('projects.workspace_id', $input->workspaceId)
            ->whereNull('projects.deleted_at')
            ->whereNull('issues.deleted_at')
            ->where(function ($q) {
                $q->where('statuses.category', 'DONE')
                    ->orWhere('statuses.slug', 'done');
            })
            ->whereBetween('issues.updated_at', [$startDate->toDateTimeString(), $endDate->toDateTimeString()])
            ->select(['issues.id', 'issues.updated_at'])
            ->get();

        $throughput = $this->aggregateThroughput($completedRows, $startDate, $endDate, $dateRangeLabel);

        // 4. Query 3: Members of workspace
        $memberRows = DB::table('workspace_members')
            ->join('users', 'workspace_members.user_id', '=', 'users.id')
            ->where('workspace_members.workspace_id', $input->workspaceId)
            ->select([
                'users.id',
                'users.name',
                'users.email',
                'workspace_members.daily_capacity_hours',
            ])
            ->get();

        // 5. Query 4: Member task counts across workspace
        $assigneeStats = DB::table('issues')
            ->join('projects', 'projects.id', '=', 'issues.project_id')
            ->join('statuses', 'statuses.id', '=', 'issues.status_id')
            ->where('projects.workspace_id', $input->workspaceId)
            ->whereNull('projects.deleted_at')
            ->whereNull('issues.deleted_at')
            ->whereNotNull('issues.assignee_id')
            ->select([
                'issues.assignee_id',
                DB::raw('COUNT(issues.id) as task_count'),
                DB::raw("SUM(CASE WHEN statuses.category = 'DONE' OR statuses.slug = 'done' THEN 1 ELSE 0 END) as completed_task_count"),
                DB::raw('SUM(COALESCE(issues.original_estimate_seconds, 0)) as total_estimate_seconds'),
            ])
            ->groupBy('issues.assignee_id')
            ->get()
            ->keyBy('assignee_id');

        // 6. Query 5: Worklogs per member across workspace
        $worklogStats = DB::table('worklogs')
            ->join('issues', 'worklogs.issue_id', '=', 'issues.id')
            ->join('projects', 'projects.id', '=', 'issues.project_id')
            ->where('projects.workspace_id', $input->workspaceId)
            ->whereNull('projects.deleted_at')
            ->whereNull('issues.deleted_at')
            ->select([
                'worklogs.author_id',
                DB::raw('SUM(worklogs.time_spent_seconds) as total_logged_seconds'),
            ])
            ->groupBy('worklogs.author_id')
            ->get()
            ->keyBy('author_id');

        // Combine member workload
        $memberWorkload = [];
        foreach ($memberRows as $member) {
            $userId = (int) $member->id;
            $assigneeData = $assigneeStats->get($userId);
            $worklogData = $worklogStats->get($userId);

            $taskCount = (int) ($assigneeData->task_count ?? 0);
            $completedCount = (int) ($assigneeData->completed_task_count ?? 0);
            $estSeconds = (int) ($assigneeData->total_estimate_seconds ?? 0);
            $loggedSeconds = (int) ($worklogData->total_logged_seconds ?? 0);

            $estHours = round($estSeconds / 3600.0, 1);
            $loggedHours = round($loggedSeconds / 3600.0, 1);

            $dailyCap = (float) ($member->daily_capacity_hours ?? 8.0);
            if ($dailyCap <= 0.0) {
                $dailyCap = 8.0;
            }

            // Normal weekly/period capacity: 5 working days per week
            $capacityHours = $dateRangeLabel === '7d'
                ? round($dailyCap * 5, 1)
                : round($dailyCap * 20, 1); // 40h weekly or 160h monthly

            $utilization = $capacityHours > 0.0
                ? round(($loggedHours / $capacityHours) * 100.0, 1)
                : 0.0;

            $memberWorkload[] = [
                'user_id' => $userId,
                'name' => (string) $member->name,
                'email' => (string) $member->email,
                'task_count' => $taskCount,
                'completed_task_count' => $completedCount,
                'estimated_hours' => $estHours,
                'logged_hours' => $loggedHours,
                'capacity_hours' => $capacityHours,
                'utilization_rate' => $utilization,
            ];
        }

        $summary = [
            'total_projects' => count($projectList),
            'active_projects' => $activeProjectsCount > 0 ? $activeProjectsCount : count($projectList),
            'total_issues' => $totalIssues,
            'completed_issues' => $completedIssues,
            'overdue_issues' => $overdueIssues,
            'completion_rate' => $totalIssues > 0 ? round(($completedIssues / $totalIssues) * 100.0, 1) : 0.0,
        ];

        return new WorkspaceAnalyticsOutput(
            summary: $summary,
            projects: $projectList,
            throughput: $throughput,
            memberWorkload: $memberWorkload,
            filters: [
                'date_range' => $dateRangeLabel,
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
            ],
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
                Log::debug("Workspace analytics date range parse failed for from: '{$from}', to: '{$to}': ".$e->getMessage());
            }
        }

        return [$now->subDays(30)->startOfDay(), $now->endOfDay(), '30d'];
    }

    /**
     * @param  Collection<int, \stdClass>  $completedRows
     * @return array<int, array<string, mixed>>
     */
    private function aggregateThroughput(
        Collection $completedRows,
        CarbonImmutable $startDate,
        CarbonImmutable $endDate,
        string $range
    ): array {
        $buckets = [];

        if ($range === '7d' || $range === 'last_7_days') {
            $current = $startDate;
            while ($current->lte($endDate)) {
                $key = $current->format('Y-m-d');
                $buckets[$key] = 0;
                $current = $current->addDay();
            }

            foreach ($completedRows as $row) {
                $updatedAt = (string) $row->updated_at;
                $dateKey = CarbonImmutable::parse($updatedAt)->format('Y-m-d');
                if (isset($buckets[$dateKey])) {
                    $buckets[$dateKey]++;
                }
            }
        } else {
            $current = $startDate->startOfWeek();
            while ($current->lte($endDate)) {
                $key = $current->format('o-\WW');
                $buckets[$key] = 0;
                $current = $current->addWeek();
            }

            foreach ($completedRows as $row) {
                $updatedAt = (string) $row->updated_at;
                $weekKey = CarbonImmutable::parse($updatedAt)->format('o-\WW');
                if (isset($buckets[$weekKey])) {
                    $buckets[$weekKey]++;
                } else {
                    $buckets[$weekKey] = 1;
                }
            }
        }

        $result = [];
        foreach ($buckets as $period => $count) {
            $result[] = [
                'period' => (string) $period,
                'completed_count' => (int) $count,
            ];
        }

        return $result;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function getEmptyWorkspaceMembers(string $workspaceId): array
    {
        $members = DB::table('workspace_members')
            ->join('users', 'workspace_members.user_id', '=', 'users.id')
            ->where('workspace_members.workspace_id', $workspaceId)
            ->select([
                'users.id',
                'users.name',
                'users.email',
                'workspace_members.daily_capacity_hours',
            ])
            ->get();

        $result = [];
        foreach ($members as $m) {
            $dailyCap = (float) ($m->daily_capacity_hours ?? 8.0);
            $result[] = [
                'user_id' => (int) $m->id,
                'name' => (string) $m->name,
                'email' => (string) $m->email,
                'task_count' => 0,
                'completed_task_count' => 0,
                'estimated_hours' => 0.0,
                'logged_hours' => 0.0,
                'capacity_hours' => round($dailyCap * 20, 1),
                'utilization_rate' => 0.0,
            ];
        }

        return $result;
    }
}
