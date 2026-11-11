<?php

declare(strict_types=1);

namespace App\Modules\Workload\Domain\Exceptions;

use Exception;

final class WorkspaceCreationException extends Exception
{
    public static function limitReached(string $groupId, int $limit): self
    {
        if ($limit <= 0) {
            return new self("Workspace limit of {$limit} reached. Unit organisasi Anda tidak memiliki kuota untuk membuat workspace baru. Silakan hubungi Administrator.");
        }

        return new self("Workspace limit of {$limit} reached for group '{$groupId}'. Batas maksimum pembuatan workspace telah tercapai.");
    }
}
