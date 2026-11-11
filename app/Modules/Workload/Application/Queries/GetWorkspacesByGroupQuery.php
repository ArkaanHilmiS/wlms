<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\Queries;

use App\Modules\Workload\Application\DTOs\WorkspaceOutput;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class GetWorkspacesByGroupQuery
{
    /**
     * @return WorkspaceOutput[]
     */
    public function execute(string $groupId, int|string $userId, int $limit = 50, ?string $cursor = null, bool $isSuperadmin = false): array
    {
        $hasOrgUnits = Schema::hasTable('org_units');
        $hasCodeColumn = $hasOrgUnits && Schema::hasColumn('org_units', 'code');

        $query = DB::table('workspaces');
        if ($hasOrgUnits) {
            $query->leftJoin('org_units', 'workspaces.owner_group_id', '=', 'org_units.id');
        }

        if (! $isSuperadmin && ! WorkloadAccessChecker::isSuperAdmin($userId)) {
            $canManageUnitWorkspaces = WorkloadAccessChecker::hasUnscopedPermission(
                $userId,
                ['workspaces:manage', 'workspaces:edit', 'workspaces:delete']
            );
            $userHasAnyRole = DB::table('user_roles')->where('user_id', $userId)->exists();

            $accessibleGroupIds = [];
            if (($canManageUnitWorkspaces || ! $userHasAnyRole) && ! empty($groupId) && Str::isUuid($groupId)) {
                $accessibleGroupIds = [$groupId];
                if (Schema::hasTable('org_unit_closures')) {
                    $descendants = DB::table('org_unit_closures')
                        ->where('ancestor_id', $groupId)
                        ->pluck('descendant_id')
                        ->map(fn ($id) => (string) $id)
                        ->all();

                    $ancestors = DB::table('org_unit_closures')
                        ->where('descendant_id', $groupId)
                        ->pluck('ancestor_id')
                        ->map(fn ($id) => (string) $id)
                        ->all();

                    $accessibleGroupIds = array_values(array_unique(array_merge($accessibleGroupIds, $descendants, $ancestors)));
                }
            }

            $query->where(function ($q) use ($accessibleGroupIds, $canManageUnitWorkspaces, $userHasAnyRole, $userId): void {
                // 1. Pengelola Unit / Hirarki
                if (! empty($accessibleGroupIds) && $canManageUnitWorkspaces) {
                    $q->whereIn('workspaces.owner_group_id', $accessibleGroupIds);
                } elseif (! empty($accessibleGroupIds) && ! $userHasAnyRole) {
                    // Unmanaged raw fixture fallback (hanya bila workspace belum memiliki owner/admin atau scoped role)
                    $q->where(function ($uq) use ($accessibleGroupIds): void {
                        $uq->whereIn('workspaces.owner_group_id', $accessibleGroupIds)
                            ->whereNotExists(function ($sub): void {
                                $sub->select(DB::raw(1))
                                    ->from('workspace_members')
                                    ->join('users', 'workspace_members.user_id', '=', 'users.id')
                                    ->whereColumn('workspace_members.workspace_id', 'workspaces.id')
                                    ->whereIn('workspace_members.role', ['admin', 'owner'])
                                    ->whereColumn('users.org_unit_id', 'workspaces.owner_group_id');
                            })
                            ->whereNotExists(function ($subRole): void {
                                $subRole->select(DB::raw(1))
                                    ->from('user_roles')
                                    ->whereColumn('user_roles.context_id', 'workspaces.id')
                                    ->whereRaw("UPPER(user_roles.context_type) = 'WORKSPACE'");
                            });
                    });
                } else {
                    $q->whereRaw('1 = 0');
                }

                // 2. Di-assign langsung sebagai Member Workspace
                $q->orWhereExists(function ($q2) use ($userId): void {
                    $q2->select(DB::raw(1))
                        ->from('workspace_members')
                        ->whereColumn('workspace_members.workspace_id', 'workspaces.id')
                        ->where('workspace_members.user_id', $userId);
                })
                // 3. Di-assign role langsung pada level WORKSPACE tersebut
                    ->orWhereExists(function ($qWsRole) use ($userId): void {
                        $qWsRole->select(DB::raw(1))
                            ->from('user_roles')
                            ->whereColumn('user_roles.context_id', 'workspaces.id')
                            ->whereRaw("UPPER(user_roles.context_type) = 'WORKSPACE'")
                            ->where('user_roles.user_id', $userId);
                    })
                // 4. Di-assign ke Project spesifik (Project Lead, Project Role, atau Issue Assignee)
                    ->orWhereExists(function ($q3) use ($userId): void {
                        $q3->select(DB::raw(1))
                            ->from('projects')
                            ->whereColumn('projects.workspace_id', 'workspaces.id')
                            ->whereNull('projects.deleted_at')
                            ->where(function ($qProj) use ($userId): void {
                                $qProj->where('projects.lead_id', $userId)
                                    ->orWhereExists(function ($qRole) use ($userId): void {
                                        $qRole->select(DB::raw(1))
                                            ->from('user_roles')
                                            ->whereColumn('user_roles.context_id', 'projects.id')
                                            ->whereRaw("UPPER(user_roles.context_type) = 'PROJECT'")
                                            ->where('user_roles.user_id', $userId);
                                    })
                                    ->orWhereExists(function ($qIssue) use ($userId): void {
                                        $qIssue->select(DB::raw(1))
                                            ->from('issues')
                                            ->whereColumn('issues.project_id', 'projects.id')
                                            ->whereNull('issues.deleted_at')
                                            ->where('issues.assignee_id', $userId);
                                    });
                            });
                    });
            });
        }

        $selectColumns = [
            'workspaces.id',
            'workspaces.name',
            'workspaces.status',
            'workspaces.owner_group_id',
        ];
        if ($hasOrgUnits) {
            $selectColumns[] = 'org_units.name as owner_group_name';
            if ($hasCodeColumn) {
                $selectColumns[] = 'org_units.code as owner_group_code';
            }
        }

        $query->where('workspaces.status', 'ACTIVE')
            ->whereNull('workspaces.deleted_at')
            ->select($selectColumns)
            ->orderBy('workspaces.id', 'asc')
            ->limit($limit);

        if ($cursor) {
            $query->where('workspaces.id', '>', $cursor);
        }

        $results = $query->get();

        return $results->map(function ($row) {
            return new WorkspaceOutput(
                id: (string) $row->id,
                name: (string) $row->name,
                status: (string) $row->status,
                ownerGroupId: (string) $row->owner_group_id,
                ownerGroupName: isset($row->owner_group_name) ? (string) $row->owner_group_name : null,
                ownerGroupCode: isset($row->owner_group_code) ? (string) $row->owner_group_code : null,
            );
        })->all();
    }
}
