<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\DTOs;

final class AssignIssueInput
{
    public function __construct(
        public readonly string $issueId,
        public readonly ?string $assigneeId,
        public readonly string $actorUserId
    ) {}
}
