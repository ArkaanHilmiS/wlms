<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Skip saat eksekusi automated test suite agar tidak mengganggu isolasi fixture test
        if (app()->environment('testing')) {
            return;
        }

        // Hanya daftarkan permission baru yang belum tersedia di 10 data awal production
        $newPermissions = [
            // Users (Granular)
            ['name' => 'users:create', 'description' => 'Create new users'],
            ['name' => 'users:edit', 'description' => 'Edit user profiles and roles'],
            ['name' => 'users:delete', 'description' => 'Delete or deactivate users'],

            // Roles (Granular)
            ['name' => 'roles:create', 'description' => 'Create new roles'],
            ['name' => 'roles:edit', 'description' => 'Edit role details and permissions'],
            ['name' => 'roles:delete', 'description' => 'Delete custom roles'],

            // Workspaces (Granular)
            ['name' => 'workspaces:create', 'description' => 'Create new workspaces'],
            ['name' => 'workspaces:edit', 'description' => 'Edit workspace settings'],
            ['name' => 'workspaces:delete', 'description' => 'Archive or delete workspaces'],

            // Projects (Granular)
            ['name' => 'projects:create', 'description' => 'Create new projects'],
            ['name' => 'projects:edit', 'description' => 'Edit project details'],
            ['name' => 'projects:delete', 'description' => 'Archive or delete projects'],

            // Issues (Granular)
            ['name' => 'issues:create', 'description' => 'Create new issues'],
            ['name' => 'issues:edit', 'description' => 'Edit issue details'],
            ['name' => 'issues:assign', 'description' => 'Assign issues to members'],
            ['name' => 'issues:delete', 'description' => 'Delete issues'],

            // Sprints
            ['name' => 'sprints:view', 'description' => 'View sprints'],
            ['name' => 'sprints:manage', 'description' => 'Start, update, and complete sprints'],

            // Analytics
            ['name' => 'analytics:view', 'description' => 'View workload analytics and metrics'],
        ];

        $superadmin = DB::table('roles')->where('name', 'Superadmin')->first();

        foreach ($newPermissions as $perm) {
            $existing = DB::table('permissions')->where('name', $perm['name'])->first();

            // Jika belum tersedia sama sekali, baru lakukan penambahan data
            if (! $existing) {
                $permId = Str::uuid()->toString();
                DB::table('permissions')->insert([
                    'id' => $permId,
                    'name' => $perm['name'],
                    'description' => $perm['description'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Petakan otomatis ke Superadmin jika ada
                if ($superadmin) {
                    $hasMapping = DB::table('role_permissions')
                        ->where('role_id', $superadmin->id)
                        ->where('permission_id', $permId)
                        ->exists();

                    if (! $hasMapping) {
                        DB::table('role_permissions')->insert([
                            'role_id' => $superadmin->id,
                            'permission_id' => $permId,
                        ]);
                    }
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Keep permissions intact to prevent cascading deletions of active roles
    }
};
