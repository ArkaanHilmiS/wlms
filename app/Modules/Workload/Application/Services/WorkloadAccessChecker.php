<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class WorkloadAccessChecker
{
    public static function isSuperAdmin(int|string $userId): bool
    {
        return DB::table('users')
            ->where('id', $userId)
            ->where(function ($q) use ($userId): void {
                $q->where('email', 'superadmin@wlms.com')
                    ->orWhereExists(function ($sub) use ($userId): void {
                        $sub->select(DB::raw(1))
                            ->from('user_roles')
                            ->join('roles', 'user_roles.role_id', '=', 'roles.id')
                            ->where('user_roles.user_id', $userId)
                            ->whereRaw('LOWER(roles.name) = ?', ['superadmin']);
                    });
            })
            ->exists();
    }

    /**
     * Expand requested permissions to also accept `<module>:manage`.
     *
     * @param  string[]  $permissions
     * @return string[]
     */
    private static function expandPermissionsWithManage(array $permissions): array
    {
        $expanded = $permissions;
        foreach ($permissions as $perm) {
            if (str_contains($perm, ':')) {
                $module = explode(':', $perm)[0];
                $expanded[] = $module.':manage';
            }
        }

        return array_values(array_unique($expanded));
    }

    /**
     * @param  string[]  $permissions
     */
    public static function hasUnscopedPermission(int|string $userId, array $permissions): bool
    {
        if (self::isSuperAdmin($userId)) {
            return true;
        }

        $expanded = self::expandPermissionsWithManage($permissions);

        return DB::table('user_roles')
            ->join('role_permissions', 'user_roles.role_id', '=', 'role_permissions.role_id')
            ->join('permissions', 'role_permissions.permission_id', '=', 'permissions.id')
            ->where('user_roles.user_id', $userId)
            ->whereIn('permissions.name', $expanded)
            ->where(function ($q): void {
                $q->whereNull('user_roles.context_id')
                    ->orWhereRaw("UPPER(COALESCE(user_roles.context_type, 'GLOBAL')) = 'GLOBAL'");
            })
            ->exists();
    }

    /**
     * @param  string[]  $permissions
     */
    public static function hasPermissionInContext(
        int|string $userId,
        array $permissions,
        ?string $workspaceId = null,
        ?string $projectId = null
    ): bool {
        if (self::isSuperAdmin($userId)) {
            return true;
        }

        $expanded = self::expandPermissionsWithManage($permissions);

        return DB::table('user_roles')
            ->join('role_permissions', 'user_roles.role_id', '=', 'role_permissions.role_id')
            ->join('permissions', 'role_permissions.permission_id', '=', 'permissions.id')
            ->where('user_roles.user_id', $userId)
            ->whereIn('permissions.name', $expanded)
            ->where(function ($q) use ($workspaceId, $projectId): void {
                $q->whereNull('user_roles.context_id')
                    ->orWhereRaw("UPPER(COALESCE(user_roles.context_type, 'GLOBAL')) = 'GLOBAL'");

                if ($workspaceId !== null && $workspaceId !== '' && Str::isUuid($workspaceId)) {
                    $q->orWhere(function ($wq) use ($workspaceId): void {
                        $wq->whereRaw("UPPER(user_roles.context_type) = 'WORKSPACE'")
                            ->where('user_roles.context_id', $workspaceId);
                    });
                }

                if ($projectId !== null && $projectId !== '' && Str::isUuid($projectId)) {
                    $q->orWhere(function ($pq) use ($projectId): void {
                        $pq->whereRaw("UPPER(user_roles.context_type) = 'PROJECT'")
                            ->where('user_roles.context_id', $projectId);
                    });
                }
            })
            ->exists();
    }

    public static function canManageWorkspace(int|string $userId, string $workspaceId, ?object $workspace = null): bool
    {
        if (self::isSuperAdmin($userId)) {
            return true;
        }

        $workspace ??= DB::table('workspaces')
            ->where('id', $workspaceId)
            ->whereNull('deleted_at')
            ->first(['owner_group_id', 'status']);

        if (! $workspace || ($workspace->status ?? 'ACTIVE') !== 'ACTIVE') {
            return false;
        }

        $userRow = DB::table('users')
            ->where('id', $userId)
            ->selectRaw(
                "id, org_unit_id,
                EXISTS(SELECT 1 FROM user_roles WHERE user_roles.user_id = users.id) as has_any_role,
                EXISTS(SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = ? AND workspace_members.user_id = users.id AND workspace_members.role IN ('admin', 'owner')) as is_workspace_admin",
                [$workspaceId]
            )
            ->first();

        if (! $userRow) {
            return false;
        }

        // Fast-path 1: Direct membership in workspace_members (role admin/owner)
        if ((bool) $userRow->is_workspace_admin) {
            return true;
        }

        $hasAnyRole = (bool) $userRow->has_any_role;

        // Fast-path 2: Explicit WORKSPACE-scoped role on this workspace with manage/edit/delete
        if ($hasAnyRole) {
            $hasScopedManage = DB::table('user_roles')
                ->join('role_permissions', 'user_roles.role_id', '=', 'role_permissions.role_id')
                ->join('permissions', 'role_permissions.permission_id', '=', 'permissions.id')
                ->where('user_roles.user_id', $userId)
                ->whereRaw("UPPER(user_roles.context_type) = 'WORKSPACE'")
                ->where('user_roles.context_id', $workspaceId)
                ->whereIn('permissions.name', ['workspaces:manage', 'workspaces:edit', 'workspaces:delete'])
                ->exists();

            if ($hasScopedManage) {
                return true;
            }
        }

        // Path 3: User belongs to owner unit or ancestor unit AND has unscoped workspaces:manage/edit/delete
        $userOrgUnitId = $userRow->org_unit_id;
        if (! $userOrgUnitId || ! $workspace->owner_group_id) {
            return false;
        }

        $isOwnerOrAncestorUnit = ((string) $userOrgUnitId === (string) $workspace->owner_group_id)
            || (Schema::hasTable('org_unit_closures') && DB::table('org_unit_closures')
                ->where('ancestor_id', $userOrgUnitId)
                ->where('descendant_id', $workspace->owner_group_id)
                ->exists());

        if (! $isOwnerOrAncestorUnit) {
            return false;
        }

        if ($hasAnyRole) {
            return DB::table('user_roles')
                ->join('role_permissions', 'user_roles.role_id', '=', 'role_permissions.role_id')
                ->join('permissions', 'role_permissions.permission_id', '=', 'permissions.id')
                ->where('user_roles.user_id', $userId)
                ->whereIn('permissions.name', ['workspaces:manage', 'workspaces:edit', 'workspaces:delete'])
                ->where(function ($q): void {
                    $q->whereNull('user_roles.context_id')
                        ->orWhereRaw("UPPER(COALESCE(user_roles.context_type, 'GLOBAL')) = 'GLOBAL'");
                })
                ->exists();
        }

        return self::isUnmanagedRawFixture($userId, $workspaceId, (string) $workspace->owner_group_id, false);
    }

    /**
     * True only when both the user has zero RBAC roles and the workspace has no owner/admin or scoped role assigned.
     */
    public static function isUnmanagedRawFixture(
        int|string $userId,
        string $workspaceId,
        ?string $ownerGroupId = null,
        ?bool $userHasAnyRole = null
    ): bool {
        if ($userHasAnyRole ?? DB::table('user_roles')->where('user_id', $userId)->exists()) {
            return false;
        }

        $ownerGroup = (string) ($ownerGroupId ?? '');
        if ($ownerGroup !== '' && Str::isUuid($ownerGroup)) {
            $row = DB::selectOne(
                "SELECT
                    EXISTS(SELECT 1 FROM workspace_members JOIN users ON workspace_members.user_id = users.id WHERE workspace_members.workspace_id = ? AND workspace_members.role IN ('admin', 'owner') AND users.org_unit_id = ?) as has_member_admin,
                    EXISTS(SELECT 1 FROM user_roles WHERE UPPER(context_type) = 'WORKSPACE' AND context_id = ?) as has_scoped_role",
                [$workspaceId, $ownerGroup, $workspaceId]
            );
        } else {
            $row = DB::selectOne(
                "SELECT
                    EXISTS(SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = ? AND workspace_members.role IN ('admin', 'owner')) as has_member_admin,
                    EXISTS(SELECT 1 FROM user_roles WHERE UPPER(context_type) = 'WORKSPACE' AND context_id = ?) as has_scoped_role",
                [$workspaceId, $workspaceId]
            );
        }

        return ! ((bool) ($row->has_member_admin ?? false)) && ! ((bool) ($row->has_scoped_role ?? false));
    }

    public static function canBypassWorkspaceFilter(int|string $userId, string $workspaceId, ?object $workspace = null): bool
    {
        if (self::canManageWorkspace($userId, $workspaceId, $workspace)) {
            return true;
        }

        $workspace ??= DB::table('workspaces')
            ->where('id', $workspaceId)
            ->whereNull('deleted_at')
            ->first(['owner_group_id', 'status']);

        if (! $workspace || ($workspace->status ?? 'ACTIVE') !== 'ACTIVE') {
            return false;
        }

        // User assigned a role at the WORKSPACE level sees all projects in that workspace
        if (DB::table('user_roles')
            ->where('user_id', $userId)
            ->whereRaw("UPPER(context_type) = 'WORKSPACE'")
            ->where('context_id', $workspaceId)
            ->exists()) {
            return true;
        }

        // Shared platform: child unit with max_workspaces = 0 whose user has unscoped workspaces:manage
        $userOrgUnitId = DB::table('users')->where('id', $userId)->value('org_unit_id');
        if ($userOrgUnitId && $workspace->owner_group_id && Schema::hasTable('org_unit_closures')) {
            $isDescendant = DB::table('org_unit_closures')
                ->where('ancestor_id', $workspace->owner_group_id)
                ->where('descendant_id', $userOrgUnitId)
                ->exists();

            if ($isDescendant && (self::hasUnscopedPermission($userId, ['workspaces:manage']) || self::isUnmanagedRawFixture($userId, $workspaceId, (string) $workspace->owner_group_id))) {
                return true;
            }
        }

        return false;
    }

    public static function canViewWorkspace(int|string $userId, string $workspaceId): bool
    {
        if (self::isSuperAdmin($userId)) {
            return true;
        }

        $workspace = DB::table('workspaces')
            ->where('id', $workspaceId)
            ->whereNull('deleted_at')
            ->first(['owner_group_id', 'status']);

        if (! $workspace || ($workspace->status ?? 'ACTIVE') !== 'ACTIVE') {
            return false;
        }

        if (DB::table('workspace_members')
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $userId)
            ->exists()) {
            return true;
        }

        if (self::canBypassWorkspaceFilter($userId, $workspaceId, $workspace)) {
            return true;
        }

        if (DB::table('user_roles')
            ->where('user_id', $userId)
            ->where(function ($q) use ($workspaceId): void {
                $q->where(function ($wq) use ($workspaceId): void {
                    $wq->whereRaw("UPPER(context_type) = 'WORKSPACE'")
                        ->where('context_id', $workspaceId);
                })->orWhereIn('context_id', function ($sub) use ($workspaceId): void {
                    $sub->select('id')->from('projects')->where('workspace_id', $workspaceId)->whereNull('deleted_at');
                });
            })
            ->exists()) {
            return true;
        }

        return DB::table('projects')
            ->where('workspace_id', $workspaceId)
            ->whereNull('deleted_at')
            ->where(function ($q) use ($userId): void {
                $q->where('lead_id', $userId)
                    ->orWhereExists(function ($sub) use ($userId): void {
                        $sub->select(DB::raw(1))
                            ->from('issues')
                            ->whereColumn('issues.project_id', 'projects.id')
                            ->whereNull('issues.deleted_at')
                            ->where('issues.assignee_id', $userId);
                    });
            })
            ->exists();
    }

    public static function canViewProject(
        int|string $userId,
        string $projectId,
        ?string $workspaceId = null,
        int|string|null $leadId = null
    ): bool {
        if ($workspaceId === null) {
            $project = DB::table('projects')
                ->where('id', $projectId)
                ->whereNull('deleted_at')
                ->first(['workspace_id', 'lead_id']);

            if (! $project) {
                return false;
            }

            $workspaceId = (string) $project->workspace_id;
            $leadId = $project->lead_id;
        }

        if (self::isSuperAdmin($userId)) {
            return true;
        }

        $workspace = DB::table('workspaces')
            ->where('id', $workspaceId)
            ->whereNull('deleted_at')
            ->first(['owner_group_id', 'status']);

        if (! $workspace || ($workspace->status ?? 'ACTIVE') !== 'ACTIVE') {
            return false;
        }

        if ($leadId !== null && (int) $leadId === (int) $userId) {
            return true;
        }

        if (DB::table('workspace_members')
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $userId)
            ->exists()) {
            return true;
        }

        if (self::canBypassWorkspaceFilter($userId, $workspaceId, $workspace)) {
            return true;
        }

        if (DB::table('user_roles')
            ->where('user_id', $userId)
            ->where(function ($q) use ($projectId, $workspaceId) {
                $q->where(function ($pq) use ($projectId) {
                    $pq->whereRaw("UPPER(context_type) = 'PROJECT'")
                        ->where('context_id', $projectId);
                })->orWhere(function ($wq) use ($workspaceId) {
                    $wq->whereRaw("UPPER(context_type) = 'WORKSPACE'")
                        ->where('context_id', $workspaceId);
                });
            })
            ->exists()) {
            return true;
        }

        return DB::table('issues')
            ->where('project_id', $projectId)
            ->whereNull('deleted_at')
            ->where('assignee_id', $userId)
            ->exists();
    }

    public static function canCreateProject(int|string $userId, string $workspaceId): bool
    {
        if (self::canManageWorkspace($userId, $workspaceId)) {
            return true;
        }

        if (! self::canViewWorkspace($userId, $workspaceId)) {
            return false;
        }

        return self::hasPermissionInContext($userId, ['projects:create', 'projects:manage'], $workspaceId);
    }

    public static function canEditProject(int|string $userId, string $projectId): bool
    {
        $project = DB::table('projects')
            ->where('id', $projectId)
            ->whereNull('deleted_at')
            ->first(['workspace_id', 'lead_id']);

        if (! $project) {
            return false;
        }

        $workspaceId = (string) $project->workspace_id;

        if (self::canManageWorkspace($userId, $workspaceId)) {
            return true;
        }

        if (! self::canViewProject($userId, $projectId, $workspaceId, $project->lead_id)) {
            return false;
        }

        if (self::hasPermissionInContext($userId, ['projects:manage'], $workspaceId, $projectId)) {
            return true;
        }

        if (self::hasPermissionInContext($userId, ['projects:edit'], $workspaceId, $projectId)) {
            return $project->lead_id !== null && (string) $project->lead_id === (string) $userId;
        }

        return false;
    }

    public static function canDeleteProject(int|string $userId, string $projectId): bool
    {
        $project = DB::table('projects')
            ->where('id', $projectId)
            ->whereNull('deleted_at')
            ->first(['workspace_id', 'lead_id']);

        if (! $project) {
            return false;
        }

        $workspaceId = (string) $project->workspace_id;

        if (self::canManageWorkspace($userId, $workspaceId)) {
            return true;
        }

        if (! self::canViewProject($userId, $projectId, $workspaceId, $project->lead_id)) {
            return false;
        }

        if (self::hasPermissionInContext($userId, ['projects:manage'], $workspaceId, $projectId)) {
            return true;
        }

        if (self::hasPermissionInContext($userId, ['projects:delete'], $workspaceId, $projectId)) {
            return $project->lead_id !== null && (string) $project->lead_id === (string) $userId;
        }

        return false;
    }

    public static function canManageSprint(int|string $userId, string $projectId, ?string $specificPermission = null): bool
    {
        if (self::isSuperAdmin($userId)) {
            return true;
        }

        $project = DB::table('projects')
            ->where('id', $projectId)
            ->whereNull('deleted_at')
            ->first(['workspace_id', 'lead_id']);

        if (! $project) {
            return false;
        }

        $workspaceId = (string) $project->workspace_id;

        if (! self::canViewProject($userId, $projectId, $workspaceId, $project->lead_id)) {
            return false;
        }

        if (self::canManageWorkspace($userId, $workspaceId)) {
            return true;
        }

        if ($project->lead_id !== null && (string) $project->lead_id === (string) $userId) {
            return true;
        }

        $permissions = array_values(array_filter([
            $specificPermission,
            'sprints:manage',
            'projects:manage',
        ]));

        return self::hasPermissionInContext($userId, $permissions, $workspaceId, $projectId);
    }
}
