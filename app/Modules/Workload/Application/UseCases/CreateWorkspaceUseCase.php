<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\UseCases;

use App\Modules\Workload\Application\DTOs\CreateWorkspaceInput;
use App\Modules\Workload\Application\DTOs\WorkspaceOutput;
use App\Modules\Workload\Domain\Config\WorkspaceSettingsInterface;
use App\Modules\Workload\Domain\Entities\Workspace;
use App\Modules\Workload\Domain\Exceptions\WorkspaceCreationException;
use App\Modules\Workload\Domain\Repositories\WorkspaceRepositoryInterface;
use App\Modules\Workload\Domain\ValueObjects\WorkspaceId;

final class CreateWorkspaceUseCase
{
    public function __construct(
        private readonly WorkspaceRepositoryInterface $repository,
        private readonly WorkspaceSettingsInterface $settings
    ) {}

    public function execute(CreateWorkspaceInput $input): WorkspaceOutput
    {
        // 1. Anti-IDOR & Authorization Check (ReBAC)
        $this->ensureUserCanCreateWorkspaceInGroup($input->actorUserId, $input->ownerGroupId);

        // 2. Dynamic Config Check: Max Workspaces per Group
        $limit = $this->settings->getMaxWorkspacesPerGroup($input->ownerGroupId);
        $currentCount = $this->repository->countByGroupId($input->ownerGroupId);

        if ($currentCount >= $limit) {
            throw WorkspaceCreationException::limitReached($input->ownerGroupId, $limit);
        }

        // 3. Domain Logic (Creation)
        $workspace = Workspace::create(
            new WorkspaceId($input->workspaceId),
            $input->ownerGroupId,
            $input->name,
            $input->actorUserId
        );

        // 4. Persist (Save) - DB::transaction dan flushEvents ditangani di level Infrastructure
        $this->repository->save($workspace);

        // 5. Zero Data Breach: Kembalikan DTO murni, bukan Entity atau Model
        return WorkspaceOutput::fromDomain($workspace);
    }

    private function ensureUserCanCreateWorkspaceInGroup(string $userId, string $groupId): void
    {
        // Implementasi pengecekan RBAC / Closure Table
        // Jika gagal: throw new AuthorizationException('Unauthorized');
    }
}
