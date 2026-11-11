<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\Queries;

use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\ProjectModel;
use Illuminate\Support\Facades\DB;

final class GetDashboardDataQuery
{
    /**
     * @return array<string, mixed>
     */
    public function execute(int|string $userId, ?string $orgUnitId = null): array
    {
        $isSuperAdmin = WorkloadAccessChecker::isSuperAdmin($userId);

        $projectsQuery = ProjectModel::query()->whereNull('projects.deleted_at');

        if (! $isSuperAdmin) {
            $projectsQuery->where(function ($q) use ($userId, $orgUnitId): void {
                $q->whereExists(function ($ws) use ($userId, $orgUnitId): void {
                    $ws->select(DB::raw(1))
                        ->from('workspaces')
                        ->whereColumn('workspaces.id', 'projects.workspace_id')
                        ->whereNull('workspaces.deleted_at')
                        ->where(function ($wsAccess) use ($userId, $orgUnitId): void {
                            if ($orgUnitId !== null && $orgUnitId !== '') {
                                $wsAccess->where('workspaces.owner_group_id', $orgUnitId)
                                    ->orWhereExists(function ($wm) use ($userId): void {
                                        $wm->select(DB::raw(1))
                                            ->from('workspace_members')
                                            ->whereColumn('workspace_members.workspace_id', 'workspaces.id')
                                            ->where('workspace_members.user_id', $userId);
                                    });
                            } else {
                                $wsAccess->whereExists(function ($wm) use ($userId): void {
                                    $wm->select(DB::raw(1))
                                        ->from('workspace_members')
                                        ->whereColumn('workspace_members.workspace_id', 'workspaces.id')
                                        ->where('workspace_members.user_id', $userId);
                                });
                            }
                        });
                })
                    ->orWhere('projects.lead_id', $userId)
                    ->orWhereExists(function ($ur) use ($userId): void {
                        $ur->select(DB::raw(1))
                            ->from('user_roles')
                            ->whereColumn('user_roles.context_id', 'projects.id')
                            ->where('user_roles.context_type', 'PROJECT')
                            ->where('user_roles.user_id', $userId);
                    })
                    ->orWhereExists(function ($iss) use ($userId): void {
                        $iss->select(DB::raw(1))
                            ->from('issues')
                            ->whereColumn('issues.project_id', 'projects.id')
                            ->whereNull('issues.deleted_at')
                            ->where('issues.assignee_id', $userId);
                    });
            });
        }

        /** @var array<int, string> $accessibleProjectIds */
        $accessibleProjectIds = (clone $projectsQuery)->pluck('projects.id')->all();

        $activeProjects = (clone $projectsQuery)->where('projects.status', 'ACTIVE')->count();
        $totalIssues = IssueModel::whereIn('project_id', $accessibleProjectIds)->count();
        $completedIssues = IssueModel::whereIn('project_id', $accessibleProjectIds)
            ->whereHas('status', fn ($q) => $q->where('category', 'DONE'))
            ->count();
        $completionRate = $totalIssues > 0 ? (int) round(($completedIssues / $totalIssues) * 100) : 0;

        $myOpenTasks = IssueModel::whereIn('project_id', $accessibleProjectIds)
            ->where('assignee_id', $userId)
            ->whereHas('status', fn ($q) => $q->where('category', '!=', 'DONE'))
            ->count();

        $overdueTasks = IssueModel::whereIn('project_id', $accessibleProjectIds)
            ->where('assignee_id', $userId)
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', now()->toDateString())
            ->whereHas('status', fn ($q) => $q->where('category', '!=', 'DONE'))
            ->count();

        $myTasksModels = IssueModel::with([
            'project:id,name,key,workspace_id',
            'status:id,name,category,color',
            'priority:id,name,color,level',
            'type:id,name,icon',
        ])
            ->whereIn('project_id', $accessibleProjectIds)
            ->where('assignee_id', $userId)
            ->whereHas('status', fn ($q) => $q->where('category', '!=', 'DONE'))
            ->orderByRaw('CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC, created_at DESC')
            ->limit(20)
            ->get();

        $myTasks = $myTasksModels->map(function (IssueModel $issue): array {
            $urgency = 'upcoming';
            if ($issue->due_date !== null) {
                if ($issue->due_date->isBefore(now()->startOfDay())) {
                    $urgency = 'overdue';
                } elseif ($issue->due_date->isToday()) {
                    $urgency = 'today';
                }
            }

            return [
                'id' => (string) $issue->id,
                'key' => $issue->project ? $issue->project->key.'-'.$issue->number : (string) $issue->number,
                'title' => $issue->title,
                'start_date' => $issue->start_date?->format('Y-m-d'),
                'due_date' => $issue->due_date?->format('Y-m-d'),
                'is_overdue' => $urgency === 'overdue',
                'urgency' => $urgency,
                'project' => [
                    'id' => $issue->project?->id,
                    'name' => $issue->project?->name,
                    'key' => $issue->project?->key,
                    'workspace_id' => $issue->project?->workspace_id,
                ],
                'status' => [
                    'name' => $issue->status?->name,
                    'category' => $issue->status?->category,
                    'color' => $issue->status?->color,
                ],
                'priority' => [
                    'name' => $issue->priority?->name,
                    'color' => $issue->priority?->color,
                ],
            ];
        })->values()->all();

        $recentActivitiesRows = DB::table('issue_histories')
            ->join('issues', 'issue_histories.issue_id', '=', 'issues.id')
            ->join('projects', 'issues.project_id', '=', 'projects.id')
            ->leftJoin('users', 'issue_histories.actor_id', '=', 'users.id')
            ->whereIn('issues.project_id', $accessibleProjectIds)
            ->whereNull('issues.deleted_at')
            ->orderByDesc('issue_histories.created_at')
            ->limit(10)
            ->get([
                'issue_histories.id',
                'issue_histories.field_changed as action_type',
                'issue_histories.old_value',
                'issue_histories.new_value',
                'issue_histories.created_at',
                'issues.title as issue_title',
                'issues.number as issue_number',
                'projects.id as project_id',
                'projects.key as project_key',
                'projects.name as project_name',
                'users.name as actor_name',
            ]);

        $recentActivities = $recentActivitiesRows->map(fn ($row): array => [
            'id' => (string) $row->id,
            'action_type' => (string) $row->action_type,
            'old_value' => $row->old_value !== null ? (string) $row->old_value : null,
            'new_value' => $row->new_value !== null ? (string) $row->new_value : null,
            'created_at' => (string) $row->created_at,
            'issue_title' => (string) $row->issue_title,
            'issue_number' => (int) $row->issue_number,
            'project_id' => (string) $row->project_id,
            'project_key' => (string) $row->project_key,
            'project_name' => (string) $row->project_name,
            'actor_name' => $row->actor_name !== null ? (string) $row->actor_name : 'System',
        ])->values()->all();

        return [
            'stats' => [
                'active_projects' => $activeProjects,
                'total_issues' => $totalIssues,
                'completed_issues' => $completedIssues,
                'completion_rate' => $completionRate,
                'my_open_tasks' => $myOpenTasks,
                'overdue_tasks' => $overdueTasks,
            ],
            'my_tasks' => $myTasks,
            'recent_activities' => $recentActivities,
        ];
    }
}
