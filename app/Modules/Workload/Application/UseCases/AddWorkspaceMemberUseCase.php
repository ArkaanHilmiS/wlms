<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\UseCases;

use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

final class AddWorkspaceMemberUseCase
{
    public function execute(string $workspaceId, int $userId, string $role = 'member'): void
    {
        // Validasi role
        if (! in_array($role, ['viewer', 'member', 'admin'])) {
            throw new InvalidArgumentException('Invalid role provided.');
        }

        DB::table('workspace_members')->updateOrInsert(
            ['workspace_id' => $workspaceId, 'user_id' => $userId],
            ['role' => $role, 'updated_at' => now(), 'created_at' => now()]
        );
    }
}
