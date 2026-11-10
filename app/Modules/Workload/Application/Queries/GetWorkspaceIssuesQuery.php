<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\Queries;

use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueModel;
use Illuminate\Contracts\Pagination\Paginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

final class GetWorkspaceIssuesQuery
{
    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<IssueModel>
     */
    public function buildQuery(string $workspaceId, array $filters = [], ?string $actorUserId = null): Builder
    {
        $query = IssueModel::with(['project', 'assignee', 'reporter', 'status', 'type', 'priority', 'sprint'])
            ->whereHas('project', function (Builder $q) use ($workspaceId) {
                $q->where('workspace_id', $workspaceId)
                    ->whereExists(function ($sub) {
                        $sub->select(DB::raw(1))
                            ->from('workspaces')
                            ->whereColumn('workspaces.id', 'projects.workspace_id')
                            ->whereNull('workspaces.deleted_at')
                            ->where('workspaces.status', 'ACTIVE');
                    });
            });

        if ($actorUserId !== null && $actorUserId !== '') {
            if (! WorkloadAccessChecker::canBypassWorkspaceFilter($actorUserId, $workspaceId)) {
                $query->whereHas('project', function (Builder $pq) use ($actorUserId, $workspaceId) {
                    $pq->where('projects.lead_id', $actorUserId)
                        ->orWhereExists(function ($sub) use ($actorUserId, $workspaceId) {
                            $sub->select(DB::raw(1))
                                ->from('user_roles')
                                ->where('user_roles.user_id', $actorUserId)
                                ->where(function ($rq) use ($workspaceId) {
                                    $rq->where('user_roles.context_type', 'PROJECT')
                                        ->whereColumn('user_roles.context_id', 'projects.id')
                                        ->orWhere(function ($wq) use ($workspaceId) {
                                            $wq->where('user_roles.context_type', 'WORKSPACE')
                                                ->where('user_roles.context_id', $workspaceId);
                                        });
                                });
                        })
                        ->orWhereExists(function ($sub) use ($actorUserId) {
                            $sub->select(DB::raw(1))
                                ->from('issues as i2')
                                ->whereColumn('i2.project_id', 'projects.id')
                                ->whereNull('i2.deleted_at')
                                ->where('i2.assignee_id', $actorUserId);
                        });
                });
            }
        }

        if (! empty($filters['status_category'])) {
            $query->whereHas('status', fn (Builder $q) => $q->where('category', $filters['status_category']));
        }

        if (! empty($filters['status_id'])) {
            $query->where('status_id', $filters['status_id']);
        }

        if (! empty($filters['assignee_id'])) {
            if ($filters['assignee_id'] === 'unassigned') {
                $query->whereNull('assignee_id');
            } else {
                $query->where('assignee_id', $filters['assignee_id']);
            }
        }

        if (! empty($filters['sprint_id'])) {
            $query->where('sprint_id', $filters['sprint_id']);
        }

        if (! empty($filters['project_id'])) {
            $query->where('project_id', $filters['project_id']);
        }

        if (! empty($filters['type_id'])) {
            $query->where('issue_type_id', $filters['type_id']);
        }

        if (! empty($filters['priority_id'])) {
            $query->where('priority_id', $filters['priority_id']);
        }

        if (! empty($filters['search'])) {
            $query->where(function (Builder $q) use ($filters) {
                $q->where('title', 'like', '%'.$filters['search'].'%')
                    ->orWhere('number', 'like', '%'.$filters['search'].'%');
            });
        }

        return $query;
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Paginator<int, IssueModel>
     */
    public function execute(string $workspaceId, array $filters = [], ?string $actorUserId = null): Paginator
    {
        $perPage = min(500, max(1, (int) ($filters['per_page'] ?? $filters['limit'] ?? 15)));

        return $this->buildQuery($workspaceId, $filters, $actorUserId)
            ->orderBy('created_at', 'desc')
            ->simplePaginate($perPage);
    }
}
