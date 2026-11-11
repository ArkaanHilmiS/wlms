<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("SELECT setval(pg_get_serial_sequence('migrations', 'id'), COALESCE((SELECT MAX(id) FROM migrations), 1));");
        }

        if (! Schema::hasTable('user_roles')) {
            return;
        }

        DB::transaction(function (): void {
            $rows = DB::table('user_roles')
                ->orderBy('created_at', 'asc')
                ->orderBy('id', 'asc')
                ->get(['id', 'user_id', 'role_id', 'context_type', 'context_id']);

            // 1. Remove unscoped (context_id IS NULL) duplicate if user already has a scoped row for the same (user_id, role_id)
            $scopedKeys = [];
            foreach ($rows as $row) {
                $ctxId = $row->context_id !== null && trim((string) $row->context_id) !== '' && strtoupper((string) $row->context_id) !== 'GLOBAL'
                    ? (string) $row->context_id
                    : null;
                if ($ctxId !== null) {
                    $scopedKeys[$row->user_id.'|'.$row->role_id] = true;
                }
            }

            $seenExact = [];
            foreach ($rows as $row) {
                $ctxType = $row->context_type !== null && trim((string) $row->context_type) !== ''
                    ? strtoupper(trim((string) $row->context_type))
                    : 'GLOBAL';
                $ctxId = $row->context_id !== null && trim((string) $row->context_id) !== '' && strtoupper((string) $row->context_id) !== 'GLOBAL'
                    ? (string) $row->context_id
                    : null;

                $userRoleKey = $row->user_id.'|'.$row->role_id;
                if ($ctxId === null && isset($scopedKeys[$userRoleKey])) {
                    DB::table('user_roles')->where('id', $row->id)->delete();

                    continue;
                }

                $exactKey = $row->user_id.'|'.$row->role_id.'|'.($ctxId ?? 'NULL');
                if (isset($seenExact[$exactKey])) {
                    DB::table('user_roles')->where('id', $row->id)->delete();

                    continue;
                }

                $seenExact[$exactKey] = true;
            }
        });

        $driver = DB::connection()->getDriverName();
        if (in_array($driver, ['pgsql', 'sqlite'], true)) {
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS user_roles_null_context_unique ON user_roles (user_id, role_id) WHERE context_id IS NULL');
        }
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();
        if (in_array($driver, ['pgsql', 'sqlite'], true)) {
            DB::statement('DROP INDEX IF EXISTS user_roles_null_context_unique');
        }
    }
};
