<?php

declare(strict_types=1);

namespace App\Modules\Workload\Infrastructure\Auth\Policies;

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\WorkspaceModel;
use Illuminate\Auth\Access\HandlesAuthorization;

final class WorkspacePolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any workspaces.
     */
    public function viewAny(UserModel $user): bool
    {
        // Semua user yang login boleh melihat daftar Workspace
        return true;
    }

    /**
     * Determine whether the user can create workspaces.
     */
    /**
     * Determine whether the user can view the workspace.
     */
    public function view(UserModel $user, WorkspaceModel $workspace): bool
    {
        return WorkloadAccessChecker::canViewWorkspace($user->id, $workspace->id);
    }

    public function create(UserModel $user): bool
    {
        // Pengecekan dinamis ke tabel RBAC (tanpa ENUM).
        // Misalnya: pastikan user memiliki org_unit_id atau role pembuat.
        return $user->org_unit_id !== null;
    }

    /**
     * Determine whether the user can update the workspace.
     */
    public function update(UserModel $user, WorkspaceModel $workspace): bool
    {
        return WorkloadAccessChecker::canManageWorkspace($user->id, $workspace->id);
    }

    /**
     * Determine whether the user can delete the workspace.
     */
    public function delete(UserModel $user, WorkspaceModel $workspace): bool
    {
        return WorkloadAccessChecker::canManageWorkspace($user->id, $workspace->id);
    }
}
