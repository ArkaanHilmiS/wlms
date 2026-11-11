<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\Queries;

use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueModel;
use Illuminate\Support\Carbon;

/**
 * CQRS Read: Issues not yet assigned to any sprint (the Backlog).
 */
final class GetBacklogIssuesQuery
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function execute(string $projectId): array
    {
        return IssueModel::query()
            ->withLinkStats()
            ->with('status:id,category')
            ->where('project_id', $projectId)
            ->whereNull('sprint_id')
            ->orderBy('number')
            ->get()
            ->map(fn (IssueModel $issue) => [
                'id' => $issue->id,
                ...$issue->linkStats(),
                'number' => $issue->number,
                'title' => $issue->title,
                'story_points' => $issue->story_points,
                'assignee_id' => $issue->assignee_id,
                'status_id' => $issue->status_id,
                'priority_id' => $issue->priority_id,
                'issue_type_id' => $issue->issue_type_id,
                'start_date' => $issue->start_date ? Carbon::parse($issue->start_date)->format('Y-m-d') : null,
                'due_date' => $issue->due_date ? Carbon::parse($issue->due_date)->format('Y-m-d') : null,
                'is_overdue' => $issue->due_date !== null
                    && Carbon::parse($issue->due_date)->startOfDay()->lt(now()->startOfDay())
                    && strtoupper((string) ($issue->status?->category ?? '')) !== 'DONE',
            ])
            ->toArray();
    }
}
