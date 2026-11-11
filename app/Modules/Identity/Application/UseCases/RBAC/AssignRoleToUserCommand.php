<?php

namespace App\Modules\Identity\Application\UseCases\RBAC;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AssignRoleToUserCommand
{
    public function execute(string $userId, string $roleId, ?string $contextType = null, ?string $contextId = null): void
    {
        $contextType = $contextType !== null && trim($contextType) !== '' ? strtoupper(trim($contextType)) : null;
        $contextId = $contextId !== null && trim($contextId) !== '' && strtoupper(trim($contextId)) !== 'GLOBAL'
            ? trim($contextId)
            : null;

        DB::transaction(function () use ($userId, $roleId, $contextType, $contextId) {
            $query = DB::table('user_roles')
                ->where('user_id', $userId)
                ->where('role_id', $roleId);

            if ($contextId === null) {
                $exists = (clone $query)->exists();
            } else {
                $exists = (clone $query)->where('context_id', $contextId)->exists();
            }

            if ($exists) {
                throw ValidationException::withMessages([
                    'role_id' => ['Role sudah ditetapkan untuk user ini pada scope yang sama.'],
                ]);
            }

            if ($contextId !== null) {
                $unscopedId = (clone $query)->whereNull('context_id')->value('id');
                if ($unscopedId) {
                    DB::table('user_roles')
                        ->where('id', $unscopedId)
                        ->update([
                            'context_type' => $contextType,
                            'context_id' => $contextId,
                            'updated_at' => now(),
                        ]);

                    return;
                }
            }

            DB::table('user_roles')->insert([
                'id' => Str::uuid()->toString(),
                'user_id' => $userId,
                'role_id' => $roleId,
                'context_type' => $contextType,
                'context_id' => $contextId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }
}
