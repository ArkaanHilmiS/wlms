<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\UseCases;

use App\Modules\Workload\Application\DTOs\CreateProjectInput;
use App\Modules\Workload\Application\DTOs\ProjectOutput;
use App\Modules\Workload\Domain\Entities\Project;
use App\Modules\Workload\Domain\Repositories\ProjectRepositoryInterface;
use App\Modules\Workload\Domain\ValueObjects\PriorityId;
use App\Modules\Workload\Domain\ValueObjects\ProjectId;
use App\Modules\Workload\Domain\ValueObjects\ProjectKey;
use App\Modules\Workload\Domain\ValueObjects\WorkspaceId;
use Exception;
use Illuminate\Support\Facades\DB;

final class CreateProjectUseCase
{
    public function __construct(
        private readonly ProjectRepositoryInterface $repository
    ) {}

    public function execute(CreateProjectInput $input): ProjectOutput
    {
        // Simulasi validasi Anti-IDOR: pastikan actorUserId bisa membuat project di workspaceId
        $this->ensureUserCanCreateProject($input->actorUserId, $input->workspaceId);

        $key = new ProjectKey($input->key);

        if ($this->repository->existsByKey($key)) {
            throw new Exception('Project key already exists.');
        }

        $project = Project::create(
            new ProjectId($input->projectId),
            new WorkspaceId($input->workspaceId),
            $key,
            $input->name,
            $input->description,
            $input->leadId,
            $input->actorUserId,
            $input->priorityId ? new PriorityId($input->priorityId) : null,
        );

        $this->repository->save($project);

        return ProjectOutput::fromDomain($project);
    }

    private function ensureUserCanCreateProject(string $userId, string $workspaceId): void
    {
        // 1. Superadmin check
        $isSuperAdmin = DB::table('user_roles')
            ->join('roles', 'user_roles.role_id', '=', 'roles.id')
            ->where('user_roles.user_id', $userId)
            ->where('roles.name', 'Superadmin')
            ->exists();

        // 2. Internal Member check
        $isInternalMember = false;
        if (! $isSuperAdmin) {
            $user = DB::table('users')->where('id', $userId)->select('org_unit_id')->first();
            $workspace = DB::table('workspaces')->where('id', $workspaceId)->select('owner_group_id')->first();
            if ($user && $workspace && $user->org_unit_id === $workspace->owner_group_id) {
                $isInternalMember = true;
            }
        }

        // 3. Workspace Member / Admin check
        $isWorkspaceAdmin = false;
        if (! $isSuperAdmin && ! $isInternalMember) {
            $isWorkspaceAdmin = DB::table('workspace_members')
                ->where('workspace_id', $workspaceId)
                ->where('user_id', $userId)
                ->where('role', '!=', 'viewer')
                ->exists();
        }

        if (! $isSuperAdmin && ! $isInternalMember && ! $isWorkspaceAdmin) {
            throw new Exception('Unauthorized: You must be a workspace admin or internal member to create projects.', 403);
        }
    }
}
