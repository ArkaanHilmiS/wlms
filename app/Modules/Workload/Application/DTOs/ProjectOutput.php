<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\DTOs;

use App\Modules\Workload\Domain\Entities\Project;

final class ProjectOutput
{
    public function __construct(
        public readonly string $id,
        public readonly string $workspaceId,
        public readonly string $key,
        public readonly string $name,
        public readonly string $status,
        public readonly ?string $priorityId = null,
        public readonly int $totalIssuesCount = 0,
        public readonly int $completedIssuesCount = 0,
        public readonly ?string $description = null,
        public readonly ?string $startDate = null,
        public readonly ?string $endDate = null,
        public readonly ?string $leadId = null,
    ) {}

    public static function fromDomain(Project $project): self
    {
        return new self(
            $project->getId()->value,
            $project->getWorkspaceId()->value,
            $project->getKey()->value,
            $project->getName(),
            $project->getStatus(),
            $project->getPriorityId()?->value,
            0,
            0,
            $project->getDescription(),
            null,
            null,
            $project->getLeadId(),
        );
    }
}
