<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\UseCases;

use App\Modules\Workload\Application\DTOs\GetProjectsInput;
use App\Modules\Workload\Application\DTOs\ProjectOutput;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use Illuminate\Support\Facades\DB;

final class GetProjectsUseCase
{
    /**
     * @return ProjectOutput[]
     */
    public function execute(GetProjectsInput $input): array
    {
        // Pragmatic CQRS/Performance: Query Builder langsung untuk performa (tanpa hydration yang berat)
        $query = DB::table('projects')
            ->where('projects.workspace_id', $input->workspaceId)
            ->whereNull('projects.deleted_at')
            ->select(['id', 'workspace_id', 'key', 'name', 'description', 'status', 'lead_id', 'priority_id', 'start_date', 'end_date'])
            ->addSelect([
                'total_issues_count' => DB::table('issues')
                    ->selectRaw('count(*)')
                    ->whereColumn('issues.project_id', 'projects.id'),
                'completed_issues_count' => DB::table('issues')
                    ->join('statuses', 'issues.status_id', '=', 'statuses.id')
                    ->selectRaw('count(*)')
                    ->whereColumn('issues.project_id', 'projects.id')
                    ->where('statuses.category', 'DONE'),
            ])
            ->orderBy('id', 'asc') // untuk cursor pagination
            ->limit($input->limit);

        // Anti-IDOR / Context-Aware RBAC for Projects
        if (! WorkloadAccessChecker::canBypassWorkspaceFilter($input->actorUserId, $input->workspaceId)) {
            $query->where(function ($q) use ($input) {
                // 1. User is the Project Lead
                $q->where('projects.lead_id', $input->actorUserId)
                  // 2. User has a context role in the project or workspace
                    ->orWhereExists(function ($sub) use ($input) {
                        $sub->select(DB::raw(1))
                            ->from('user_roles')
                            ->where('user_roles.user_id', $input->actorUserId)
                            ->where(function ($rq) use ($input) {
                                $rq->where('user_roles.context_type', 'PROJECT')
                                    ->whereColumn('user_roles.context_id', 'projects.id')
                                    ->orWhere(function ($wq) use ($input) {
                                        $wq->where('user_roles.context_type', 'WORKSPACE')
                                            ->where('user_roles.context_id', $input->workspaceId);
                                    });
                            });
                    })
                  // 3. User is assigned to at least one issue in the project
                    ->orWhereExists(function ($sub) use ($input) {
                        $sub->select(DB::raw(1))
                            ->from('issues')
                            ->whereColumn('issues.project_id', 'projects.id')
                            ->whereNull('issues.deleted_at')
                            ->where('issues.assignee_id', $input->actorUserId);
                    });
            });
        }

        if ($input->cursor) {
            $query->where('id', '>', $input->cursor);
        }

        $results = $query->get();

        return $results->map(function ($row) {
            return new ProjectOutput(
                id: (string) $row->id,
                workspaceId: (string) $row->workspace_id,
                key: (string) $row->key,
                name: (string) $row->name,
                status: (string) $row->status,
                priorityId: $row->priority_id ? (string) $row->priority_id : null,
                totalIssuesCount: (int) ($row->total_issues_count ?? 0),
                completedIssuesCount: (int) ($row->completed_issues_count ?? 0),
                description: isset($row->description) && $row->description ? (string) $row->description : null,
                startDate: isset($row->start_date) && $row->start_date ? substr((string) $row->start_date, 0, 10) : null,
                endDate: isset($row->end_date) && $row->end_date ? substr((string) $row->end_date, 0, 10) : null,
                leadId: isset($row->lead_id) && $row->lead_id !== null ? (string) $row->lead_id : null,
            );
        })->all();
    }
}
