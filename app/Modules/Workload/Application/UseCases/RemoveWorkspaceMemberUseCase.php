<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\UseCases;

use Illuminate\Support\Facades\DB;

final class RemoveWorkspaceMemberUseCase
{
    public function execute(string $workspaceId, int $userId): void
    {
        DB::table('workspace_members')
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $userId)
            ->delete();
    }
}
