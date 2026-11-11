<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\DTOs;

final class CreateIssueInput
{
    public function __construct(
        public readonly string $issueId,
        public readonly string $projectId,
        public readonly string $title,
        public readonly ?string $description,
        public readonly string $issueTypeId,
        public readonly string $priorityId,
        public readonly ?string $sprintId,
        public readonly string $reporterUserId,
        public readonly ?int $originalEstimateSeconds = null,
        public readonly ?string $assigneeId = null,
        public readonly ?string $startDate = null,
        public readonly ?string $dueDate = null,
        public readonly ?string $parentId = null,
    ) {}
}
