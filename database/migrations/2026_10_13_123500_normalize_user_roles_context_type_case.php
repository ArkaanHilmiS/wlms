<?php

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
                ->whereNotNull('context_type')
                ->get(['id', 'user_id', 'role_id', 'context_type', 'context_id']);

            foreach ($rows as $row) {
                $raw = (string) $row->context_type;
                $upper = strtoupper(trim($raw));
                $normalized = $upper !== '' ? $upper : null;

                if ($raw === $normalized) {
                    continue;
                }

                $duplicateExists = DB::table('user_roles')
                    ->where('id', '!=', $row->id)
                    ->where('user_id', $row->user_id)
                    ->where('role_id', $row->role_id)
                    ->where('context_type', $normalized)
                    ->where('context_id', $row->context_id)
                    ->exists();

                if ($duplicateExists) {
                    DB::table('user_roles')->where('id', $row->id)->delete();
                } else {
                    DB::table('user_roles')
                        ->where('id', $row->id)
                        ->update([
                            'context_type' => $normalized,
                            'updated_at' => now(),
                        ]);
                }
            }
        });
    }

    public function down(): void
    {
        // One-way data normalization to canonical uppercase context_type ('WORKSPACE', 'PROJECT', 'GLOBAL').
    }
};

