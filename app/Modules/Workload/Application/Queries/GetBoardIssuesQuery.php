<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\Queries;

use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\ProjectModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\StatusModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\WorkflowModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\WorkflowTransitionModel;
use Illuminate\Support\Carbon;

/**
 * CQRS Read: Bypass Domain Layer for read-optimized board view.
 * Groups issues by status for Kanban rendering.
 */
final class GetBoardIssuesQuery
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function execute(string $projectId, string $sprintId, bool $includeArchived = false): array
    {
        // Fetch project to know its workflow
        $project = ProjectModel::find($projectId);
        $workflowId = $project->workflow_id;
        if (! $workflowId) {
            $defaultWorkflow = WorkflowModel::where('is_default', true)->first();
            $workflowId = $defaultWorkflow->id;
        }

        // Get unique status IDs used in this workflow
        $transitions = WorkflowTransitionModel::where('workflow_id', $workflowId)->get();
        $statusIds = collect();
        foreach ($transitions as $t) {
            if ($t->from_status_id) {
                $statusIds->push($t->from_status_id);
            }
            if ($t->to_status_id) {
                $statusIds->push($t->to_status_id);
            }
        }
        $statusIds = $statusIds->unique()->values()->all();

        // Fetch only those statuses
        $statuses = StatusModel::query()->whereIn('id', $statusIds)->get();

        // Optionally sort them in a logical order (e.g. TODO -> IN_PROGRESS -> DONE)
        $statusOrder = ['TODO' => 1, 'IN_PROGRESS' => 2, 'DONE' => 3];
        $statuses = $statuses->sortBy(function (StatusModel $status) use ($statusOrder) {
            return $statusOrder[$status->category] ?? 99;
        })->values();
        $doneStatusIds = $statuses->filter(fn (StatusModel $s) => strtoupper((string) $s->category) === 'DONE')->pluck('id')->all();

        $issues = IssueModel::query()
            ->withLinkStats()
            ->where('project_id', $projectId)
            ->where('sprint_id', $sprintId)
            ->when(! $includeArchived && ! empty($doneStatusIds), function ($q) use ($doneStatusIds): void {
                $q->where(function ($sub) use ($doneStatusIds): void {
                    $sub->whereNotIn('status_id', $doneStatusIds)
                        ->orWhere('updated_at', '>=', now()->subDays(30));
                });
            })
            ->get()
            ->groupBy('status_id');

        return array_map(fn (StatusModel $status): array => [
            'status_id' => $status->id,
            'status_name' => $status->name,
            'status_slug' => $status->slug,
            'status_color' => $status->color,
            'issues' => collect($issues->get($status->id, []))->map(fn (IssueModel $issue) => [
                'id' => $issue->id,
                ...$issue->linkStats(),
                'number' => $issue->number,
                'title' => $issue->title,
                'story_points' => $issue->story_points,
                'assignee_id' => $issue->assignee_id,
                'priority_id' => $issue->priority_id,
                'issue_type_id' => $issue->issue_type_id,
                'start_date' => $issue->start_date ? Carbon::parse($issue->start_date)->format('Y-m-d') : null,
                'due_date' => $issue->due_date ? Carbon::parse($issue->due_date)->format('Y-m-d') : null,
                'is_overdue' => $issue->due_date !== null
                    && Carbon::parse($issue->due_date)->startOfDay()->lt(now()->startOfDay())
                    && strtoupper((string) $status->category) !== 'DONE',
            ])->values()->all(),
        ], $statuses->all());
    }
}
