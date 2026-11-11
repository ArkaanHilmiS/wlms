<?php

declare(strict_types=1);

namespace App\Modules\Workload\Infrastructure\Listeners;

use App\Modules\Workload\Domain\Events\WorkspaceCreated;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class AssignWorkspaceCreatorAsOwnerListener
{
    /**
     * Otomatis jadikan creator sebagai Workspace Owner di workspace_members dan user_roles.
     */
    public function handle(WorkspaceCreated $event): void
    {
        // 1. Simpan di workspace_members sebagai admin
        DB::table('workspace_members')->updateOrInsert(
            [
                'workspace_id' => $event->workspaceId,
                'user_id' => $event->actorId,
            ],
            [
                'role' => 'admin',
                'daily_capacity_hours' => 8,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // 2. Simpan role 'Workspace Owner' di user_roles jika role terdaftar
        $ownerRole = DB::table('roles')->where('name', 'Workspace Owner')->first(['id']);
        if ($ownerRole) {
            $alreadyScoped = DB::table('user_roles')
                ->where('user_id', $event->actorId)
                ->where('role_id', $ownerRole->id)
                ->where('context_id', $event->workspaceId)
                ->exists();

            if (! $alreadyScoped) {
                $unscopedId = DB::table('user_roles')
                    ->where('user_id', $event->actorId)
                    ->where('role_id', $ownerRole->id)
                    ->whereNull('context_id')
                    ->value('id');

                if ($unscopedId) {
                    DB::table('user_roles')
                        ->where('id', $unscopedId)
                        ->update([
                            'context_type' => 'WORKSPACE',
                            'context_id' => $event->workspaceId,
                            'updated_at' => now(),
                        ]);
                } else {
                    DB::table('user_roles')->insertOrIgnore([
                        'id' => Str::uuid()->toString(),
                        'user_id' => $event->actorId,
                        'role_id' => $ownerRole->id,
                        'context_type' => 'WORKSPACE',
                        'context_id' => $event->workspaceId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }
}
