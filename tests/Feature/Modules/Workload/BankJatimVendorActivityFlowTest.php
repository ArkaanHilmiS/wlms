<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Workload;

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\RoleModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserRoleModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\WorkflowModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Dynamic schema compatibility for in-memory SQLite testing
    if (DB::getDriverName() === 'sqlite') {
        if (! Schema::hasTable('org_levels')) {
            Schema::create('org_levels', function ($table) {
                $table->uuid('id')->primary();
                $table->string('slug')->nullable();
                $table->string('name');
                $table->integer('depth')->default(1);
                $table->boolean('can_own_workspace')->default(true);
                $table->timestamps();
            });
        }
        if (! Schema::hasTable('org_units')) {
            Schema::create('org_units', function ($table) {
                $table->uuid('id')->primary();
                $table->string('name');
                $table->string('code')->nullable();
                $table->uuid('org_level_id')->nullable();
                $table->uuid('parent_id')->nullable();
                $table->integer('max_workspaces')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }
    }
});

/**
 * ============================================================================
 * DOKUMENTASI ALUR AKTIVITAS: BANK JATIM & VENDOR MII (MACHINE LEARNING USE CASE)
 * ============================================================================
 * Flow ini merepresentasikan skenario nyata:
 * 1. Struktur Organisasi Bank Jatim:
 *    - Divisi TI (DTI) -> Subdiv TMDP (kuota: 1) -> Subdivisi DWH, BI, DADS (kuota: 0).
 *    - Vendor: PT Mitra Integrasi Informatika (MII, kuota: 1).
 * 2. Akun Vendor (Quinton Jaury):
 *    - Diberi role Workspace Owner.
 *    - Sebelum membuat workspace, list /api/workspaces kosong.
 *    - Membuat workspace "MII Machine Learning" -> otomatis menjadi Admin di members.
 *    - Kuota MII maksimal 1 workspace. Pembuatan kedua ditolak (422).
 *    - Mengakses GET /api/workspaces/{id}/projects berhasil (200 OK, bukan 403).
 *    - Membuat proyek ML Use Case 1 di workspace miliknya berhasil (201).
 * 3. Proteksi Hierarki & Zero Data Breach:
 *    - MII tidak bisa melihat atau mengakses workspace TMDP Bank Jatim (403).
 *    - Subdivisi DWH bisa melihat workspace TMDP (shared platform), tapi tidak bisa mengarsipkannya (403).
 */
test('skenario lengkap alur aktivitas vendor MII dan Bank Jatim sesuai hirarki dan ReBAC', function () {
    // ------------------------------------------------------------------------
    // TAHAP 1: SETUP STRUKTUR ORGANISASI & CLOSURE TABLE
    // ------------------------------------------------------------------------
    $divisiLevelId = (string) Str::uuid();
    $subdivLevelId = (string) Str::uuid();
    $vendorLevelId = (string) Str::uuid();

    DB::table('org_levels')->insert([
        ['id' => $divisiLevelId, 'slug' => 'divisi', 'name' => 'Divisi', 'depth' => 1, 'can_own_workspace' => true],
        ['id' => $subdivLevelId, 'slug' => 'subdiv', 'name' => 'Sub Divisi', 'depth' => 2, 'can_own_workspace' => true],
        ['id' => $vendorLevelId, 'slug' => 'vendor', 'name' => 'Vendor Eksternal', 'depth' => 1, 'can_own_workspace' => true],
    ]);

    // Unit Bank Jatim: DTI -> TMDP -> (DWH, BI, DADS)
    $dtiId = (string) Str::uuid();
    $tmdpId = (string) Str::uuid();
    $dwhId = (string) Str::uuid();
    $biId = (string) Str::uuid();
    $dadsId = (string) Str::uuid();

    // Unit Vendor MII (Mitra Integrasi Informatika)
    $miiId = (string) Str::uuid();

    DB::table('org_units')->insert([
        ['id' => $dtiId, 'parent_id' => null, 'org_level_id' => $divisiLevelId, 'name' => 'Divisi Teknologi Informasi', 'code' => 'DTI', 'max_workspaces' => 5],
        ['id' => $tmdpId, 'parent_id' => $dtiId, 'org_level_id' => $subdivLevelId, 'name' => 'Manajemen Data Perusahaan', 'code' => 'TMDP', 'max_workspaces' => 1],
        ['id' => $dwhId, 'parent_id' => $tmdpId, 'org_level_id' => $subdivLevelId, 'name' => 'Big Data & Datawarehouse', 'code' => 'DWH', 'max_workspaces' => 0],
        ['id' => $biId, 'parent_id' => $tmdpId, 'org_level_id' => $subdivLevelId, 'name' => 'Business Intelligence', 'code' => 'BI', 'max_workspaces' => 0],
        ['id' => $dadsId, 'parent_id' => $tmdpId, 'org_level_id' => $subdivLevelId, 'name' => 'Data Analyst & Data Science', 'code' => 'DADS', 'max_workspaces' => 0],
        ['id' => $miiId, 'parent_id' => null, 'org_level_id' => $vendorLevelId, 'name' => 'Mitra Integrasi Informatika', 'code' => 'MII', 'max_workspaces' => 1],
    ]);

    // Closure table untuk struktur hirarki
    DB::table('org_unit_closures')->insert([
        // Self-references
        ['ancestor_id' => $dtiId, 'descendant_id' => $dtiId, 'depth' => 0],
        ['ancestor_id' => $tmdpId, 'descendant_id' => $tmdpId, 'depth' => 0],
        ['ancestor_id' => $dwhId, 'descendant_id' => $dwhId, 'depth' => 0],
        ['ancestor_id' => $biId, 'descendant_id' => $biId, 'depth' => 0],
        ['ancestor_id' => $dadsId, 'descendant_id' => $dadsId, 'depth' => 0],
        ['ancestor_id' => $miiId, 'descendant_id' => $miiId, 'depth' => 0],

        // DTI -> TMDP, DWH, BI, DADS
        ['ancestor_id' => $dtiId, 'descendant_id' => $tmdpId, 'depth' => 1],
        ['ancestor_id' => $dtiId, 'descendant_id' => $dwhId, 'depth' => 2],
        ['ancestor_id' => $dtiId, 'descendant_id' => $biId, 'depth' => 2],
        ['ancestor_id' => $dtiId, 'descendant_id' => $dadsId, 'depth' => 2],

        // TMDP -> DWH, BI, DADS
        ['ancestor_id' => $tmdpId, 'descendant_id' => $dwhId, 'depth' => 1],
        ['ancestor_id' => $tmdpId, 'descendant_id' => $biId, 'depth' => 1],
        ['ancestor_id' => $tmdpId, 'descendant_id' => $dadsId, 'depth' => 1],
    ]);

    // ------------------------------------------------------------------------
    // TAHAP 2: SETUP ROLE WORKSPACE OWNER & PERMISSIONS
    // ------------------------------------------------------------------------
    $workspaceOwnerRoleId = (string) Str::uuid();
    $workspaceOwnerRole = RoleModel::create([
        'id' => $workspaceOwnerRoleId,
        'name' => 'Workspace Owner',
        'scope' => 'workspace',
    ]);

    $requiredPermissions = [
        'workspaces:manage',
        'workspaces:view',
        'projects:view',
        'projects:manage',
        'issues:view',
        'issues:manage',
    ];

    foreach ($requiredPermissions as $permName) {
        $pId = (string) Str::uuid();
        DB::table('permissions')->insertOrIgnore([
            'id' => $pId,
            'name' => $permName,
            'description' => "Permission {$permName}",
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $permRecord = DB::table('permissions')->where('name', $permName)->first();
        DB::table('role_permissions')->insertOrIgnore([
            'role_id' => $workspaceOwnerRole->id,
            'permission_id' => $permRecord->id,
        ]);
    }

    // ------------------------------------------------------------------------
    // TAHAP 3: AKUN VENDOR QUINTON JAURY DIDAFTARKAN KE MII
    // ------------------------------------------------------------------------
    $quinton = UserModel::factory()->create([
        'name' => 'Quinton Jaury',
        'email' => 'quinton.jaury@mii.co.id',
        'org_unit_id' => $miiId,
    ]);

    // Quinton memegang role Workspace Owner
    UserRoleModel::create([
        'id' => (string) Str::uuid(),
        'user_id' => $quinton->id,
        'role_id' => $workspaceOwnerRole->id,
        'context_type' => 'WORKSPACE',
        'context_id' => null,
    ]);

    // ------------------------------------------------------------------------
    // TAHAP 4: KONDISI AWAL - LIST WORKSPACE QUINTON KOSONG
    // ------------------------------------------------------------------------
    $initialWorkspaces = $this->actingAs($quinton)->getJson('/api/workspaces')
        ->assertStatus(200)
        ->json();

    expect($initialWorkspaces)->toBeArray()->toBeEmpty();

    // ------------------------------------------------------------------------
    // TAHAP 5: QUINTON MEMBUAT WORKSPACE PERTAMA (MII MACHINE LEARNING)
    // ------------------------------------------------------------------------
    $createWorkspaceResponse = $this->actingAs($quinton)->postJson('/api/workspaces', [
        'name' => 'MII Workspace Machine Learning',
    ])->assertStatus(201);

    $workspaceId = $createWorkspaceResponse->json('id');
    expect($createWorkspaceResponse->json('name'))->toBe('MII Workspace Machine Learning')
        ->and($createWorkspaceResponse->json('owner_group_id'))->toBe($miiId);

    // Verifikasi otomatisasi: Quinton langsung terdaftar sebagai Admin di workspace_members
    $this->assertDatabaseHas('workspace_members', [
        'workspace_id' => $workspaceId,
        'user_id' => $quinton->id,
        'role' => 'admin',
        'daily_capacity_hours' => 8,
    ]);

    // Verifikasi otomatisasi: Quinton tercatat sebagai Workspace Owner di context workspace
    $this->assertDatabaseHas('user_roles', [
        'user_id' => $quinton->id,
        'role_id' => $workspaceOwnerRole->id,
        'context_type' => 'WORKSPACE',
        'context_id' => $workspaceId,
    ]);

    // ------------------------------------------------------------------------
    // TAHAP 6: PENEGAKAN KUOTA VENDOR (MII MAX 1 WORKSPACE)
    // ------------------------------------------------------------------------
    $duplicateResponse = $this->actingAs($quinton)->postJson('/api/workspaces', [
        'name' => 'MII Workspace Duplicate',
    ])->assertStatus(422);

    expect($duplicateResponse->json('message'))->toContain('Batas maksimum pembuatan workspace telah tercapai');

    // ------------------------------------------------------------------------
    // TAHAP 7: QUINTON MELIHAT DAFTAR WORKSPACE & ANGGOTA (ADMIN)
    // ------------------------------------------------------------------------
    $workspacesList = $this->actingAs($quinton)->getJson('/api/workspaces')
        ->assertStatus(200)
        ->json();

    expect($workspacesList)->toHaveCount(1)
        ->and($workspacesList[0]['id'])->toBe($workspaceId);

    $membersList = $this->actingAs($quinton)->getJson("/api/workspaces/{$workspaceId}/members")
        ->assertStatus(200)
        ->json('data');

    expect($membersList)->toHaveCount(1)
        ->and($membersList[0]['email'])->toBe('quinton.jaury@mii.co.id')
        ->and($membersList[0]['role'])->toBe('admin');

    // ------------------------------------------------------------------------
    // TAHAP 8: QUINTON MENGAKSES PROYEK WORKSPACE (SUKSES 200, BUKAN 403)
    // ------------------------------------------------------------------------
    $projectsList = $this->actingAs($quinton)->getJson("/api/workspaces/{$workspaceId}/projects")
        ->assertStatus(200)
        ->json();

    expect($projectsList)->toBeArray()->toBeEmpty();

    // ------------------------------------------------------------------------
    // TAHAP 9: QUINTON MEMBUAT PROYEK USE CASE MACHINE LEARNING
    // ------------------------------------------------------------------------
    $defaultWorkflow = WorkflowModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Standard ML Workflow',
        'is_default' => true,
    ]);

    $createProjectResponse = $this->actingAs($quinton)->postJson('/api/projects', [
        'workspace_id' => $workspaceId,
        'key' => 'MLUC1',
        'name' => 'Machine Learning Use Case 1 - Fraud Detection',
        'description' => 'Implementasi model fraud detection pada transaksi Bank Jatim',
    ])->assertStatus(201);

    $projectId = $createProjectResponse->json('data.id');
    expect($createProjectResponse->json('data.key'))->toBe('MLUC1');

    // Proyek sekarang muncul di list projects workspace
    $updatedProjectsList = $this->actingAs($quinton)->getJson("/api/workspaces/{$workspaceId}/projects")
        ->assertStatus(200)
        ->json();

    expect($updatedProjectsList)->toHaveCount(1)
        ->and($updatedProjectsList[0]['id'])->toBe($projectId);

    // Quinton dapat mengakses issues dan sprints proyek tanpa 403 Forbidden
    $this->actingAs($quinton)
        ->getJson("/api/projects/{$projectId}/issues?per_page=500")
        ->assertStatus(200);

    $this->actingAs($quinton)
        ->getJson("/api/projects/{$projectId}/sprints")
        ->assertStatus(200);

    // ------------------------------------------------------------------------
    // TAHAP 10: USER BANK JATIM (TMDP & SUBDIVISI DWH)
    // ------------------------------------------------------------------------
    $userTmdp = UserModel::factory()->create([
        'name' => 'Staf TMDP Bank Jatim',
        'email' => 'staf.tmdp@bankjatim.co.id',
        'org_unit_id' => $tmdpId,
    ]);
    UserRoleModel::create([
        'id' => (string) Str::uuid(),
        'user_id' => $userTmdp->id,
        'role_id' => $workspaceOwnerRole->id,
        'context_type' => 'WORKSPACE',
    ]);

    // TMDP membuat workspace miliknya (kuota 1)
    $tmdpWsResponse = $this->actingAs($userTmdp)->postJson('/api/workspaces', [
        'name' => 'Bank Jatim Enterprise Data Platform',
    ])->assertStatus(201);
    $tmdpWsId = $tmdpWsResponse->json('id');

    // User DWH (bawahan TMDP)
    $userDwh = UserModel::factory()->create([
        'name' => 'Engineer DWH Bank Jatim',
        'email' => 'engineer.dwh@bankjatim.co.id',
        'org_unit_id' => $dwhId,
    ]);
    UserRoleModel::create([
        'id' => (string) Str::uuid(),
        'user_id' => $userDwh->id,
        'role_id' => $workspaceOwnerRole->id,
        'context_type' => 'WORKSPACE',
    ]);

    // DWH tidak bisa membuat workspace mandiri (kuota 0)
    $this->actingAs($userDwh)->postJson('/api/workspaces', [
        'name' => 'DWH Workspace Mandiri',
    ])->assertStatus(422);

    // DWH bisa melihat workspace atasan (TMDP Data Platform) via hirarki closure table
    $dwhWorkspaces = $this->actingAs($userDwh)->getJson('/api/workspaces')
        ->assertStatus(200)
        ->json();

    $wsIds = array_column($dwhWorkspaces, 'id');
    expect($wsIds)->toContain($tmdpWsId);

    // DWH TIDAK bisa mengedit atau mengarsipkan workspace milik atasan (TMDP)
    $this->actingAs($userDwh)->putJson("/api/workspaces/{$tmdpWsId}", [
        'name' => 'DWH Hijacked TMDP',
    ])->assertStatus(403);

    $this->actingAs($userDwh)->deleteJson("/api/workspaces/{$tmdpWsId}")
        ->assertStatus(403);

    // ------------------------------------------------------------------------
    // TAHAP 11: ISOLASI VENDOR (MII TIDAK BISA AKSES DATA TMDP)
    // ------------------------------------------------------------------------
    // Quinton (MII) tidak boleh melihat workspace TMDP Bank Jatim
    $quintonWorkspaces = $this->actingAs($quinton)->getJson('/api/workspaces')
        ->assertStatus(200)
        ->json();

    $quintonWsIds = array_column($quintonWorkspaces, 'id');
    expect($quintonWsIds)->toContain($workspaceId)
        ->and($quintonWsIds)->not->toContain($tmdpWsId);

    // Quinton mencoba melihat proyek TMDP secara langsung via IDOR -> 403 Forbidden
    $this->actingAs($quinton)->getJson("/api/workspaces/{$tmdpWsId}/projects")
        ->assertStatus(403);
});

test('skenario manajemen anggota workspace: invite user, update capacity hours, update role ke admin, dan remove member', function () {
    $levelId = (string) Str::uuid();
    DB::table('org_levels')->insert(['id' => $levelId, 'name' => 'Vendor Level', 'slug' => 'vendor-level', 'depth' => 1, 'can_own_workspace' => true]);

    $vendorUnitId = (string) Str::uuid();
    DB::table('org_units')->insert(['id' => $vendorUnitId, 'name' => 'PT MII', 'code' => 'MII', 'org_level_id' => $levelId, 'max_workspaces' => 2]);

    $role = RoleModel::create(['id' => (string) Str::uuid(), 'name' => 'Workspace Owner', 'scope' => 'workspace']);
    $permId = (string) Str::uuid();
    DB::table('permissions')->insertOrIgnore(['id' => $permId, 'name' => 'workspaces:manage']);
    $perm = DB::table('permissions')->where('name', 'workspaces:manage')->first();
    DB::table('role_permissions')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);

    $adminUser = UserModel::factory()->create(['org_unit_id' => $vendorUnitId]);
    UserRoleModel::create(['id' => (string) Str::uuid(), 'user_id' => $adminUser->id, 'role_id' => $role->id, 'context_type' => 'WORKSPACE']);

    $memberUser = UserModel::factory()->create(['org_unit_id' => $vendorUnitId]);
    $outsider = UserModel::factory()->create(['org_unit_id' => (string) Str::uuid()]);

    // Admin creates workspace
    $wsResponse = $this->actingAs($adminUser)->postJson('/api/workspaces', ['name' => 'MII Member Test Workspace'])->assertStatus(201);
    $wsId = $wsResponse->json('id');

    // 1. Admin invites memberUser -> 201 Created
    $this->actingAs($adminUser)->postJson("/api/workspaces/{$wsId}/members", [
        'user_id' => $memberUser->id,
        'role' => 'member',
    ])->assertStatus(201);

    $this->assertDatabaseHas('workspace_members', [
        'workspace_id' => $wsId,
        'user_id' => $memberUser->id,
        'role' => 'member',
    ]);

    // 2. Admin updates capacity hours to 6
    $this->actingAs($adminUser)->putJson("/api/workspaces/{$wsId}/members/{$memberUser->id}", [
        'daily_capacity_hours' => 6,
    ])->assertStatus(200);

    $this->assertDatabaseHas('workspace_members', [
        'workspace_id' => $wsId,
        'user_id' => $memberUser->id,
        'daily_capacity_hours' => 6,
    ]);

    // 3. Admin updates member role to 'admin'
    $this->actingAs($adminUser)->putJson("/api/workspaces/{$wsId}/members/{$memberUser->id}", [
        'role' => 'admin',
    ])->assertStatus(200);

    $this->assertDatabaseHas('workspace_members', [
        'workspace_id' => $wsId,
        'user_id' => $memberUser->id,
        'role' => 'admin',
    ]);

    // 4. Outsider tries to invite member -> 403 Forbidden
    $this->actingAs($outsider)->postJson("/api/workspaces/{$wsId}/members", [
        'user_id' => $outsider->id,
        'role' => 'member',
    ])->assertStatus(403);

    // 5. Admin removes member -> 200 OK
    $this->actingAs($adminUser)->deleteJson("/api/workspaces/{$wsId}/members/{$memberUser->id}")
        ->assertStatus(200);

    $this->assertDatabaseMissing('workspace_members', [
        'workspace_id' => $wsId,
        'user_id' => $memberUser->id,
    ]);
});

test('skenario siklus hidup kuota workspace: pembebasan kuota saat workspace diarsipkan dan blokir user tanpa unit', function () {
    $levelId = (string) Str::uuid();
    DB::table('org_levels')->insert(['id' => $levelId, 'name' => 'Vendor Level', 'slug' => 'vendor-level', 'depth' => 1, 'can_own_workspace' => true]);

    $vendorUnitId = (string) Str::uuid();
    DB::table('org_units')->insert(['id' => $vendorUnitId, 'name' => 'PT MII', 'code' => 'MII', 'org_level_id' => $levelId, 'max_workspaces' => 1]);

    $role = RoleModel::create(['id' => (string) Str::uuid(), 'name' => 'Workspace Owner', 'scope' => 'workspace']);
    $permId = (string) Str::uuid();
    DB::table('permissions')->insertOrIgnore(['id' => $permId, 'name' => 'workspaces:manage']);
    $perm = DB::table('permissions')->where('name', 'workspaces:manage')->first();
    DB::table('role_permissions')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);

    // 1. User without org unit -> 422
    $orphanUser = UserModel::factory()->create(['org_unit_id' => null]);
    UserRoleModel::create(['id' => (string) Str::uuid(), 'user_id' => $orphanUser->id, 'role_id' => $role->id, 'context_type' => 'WORKSPACE']);

    $this->actingAs($orphanUser)->postJson('/api/workspaces', ['name' => 'Orphan Workspace'])
        ->assertStatus(422)
        ->assertJsonFragment(['message' => 'User belum terdaftar pada unit organisasi. Hubungi Administrator.']);

    // 2. Normal user creates first workspace (quota = 1) -> 201 Created
    $user = UserModel::factory()->create(['org_unit_id' => $vendorUnitId]);
    UserRoleModel::create(['id' => (string) Str::uuid(), 'user_id' => $user->id, 'role_id' => $role->id, 'context_type' => 'WORKSPACE']);

    $resp1 = $this->actingAs($user)->postJson('/api/workspaces', ['name' => 'Active Workspace 1'])->assertStatus(201);
    $wsId = $resp1->json('id');

    // Second workspace attempt -> 422 Quota reached
    $this->actingAs($user)->postJson('/api/workspaces', ['name' => 'Active Workspace 2'])->assertStatus(422);

    // 3. Archive first workspace -> 200 OK
    $this->actingAs($user)->deleteJson("/api/workspaces/{$wsId}")->assertStatus(200);

    // 4. Create new workspace now succeeds because previous one is archived -> 201 Created
    $resp2 = $this->actingAs($user)->postJson('/api/workspaces', ['name' => 'New Workspace After Archival'])->assertStatus(201);
    expect($resp2->json('name'))->toBe('New Workspace After Archival');
});

test('skenario kolaborasi proyek dan tiket use case: penugasan task, lookup data, dan proteksi IDOR lintas unit', function () {
    $levelId = (string) Str::uuid();
    DB::table('org_levels')->insert(['id' => $levelId, 'name' => 'Vendor Level', 'slug' => 'vendor-level', 'depth' => 1, 'can_own_workspace' => true]);

    $vendorUnitId = (string) Str::uuid();
    DB::table('org_units')->insert(['id' => $vendorUnitId, 'name' => 'PT MII', 'code' => 'MII', 'org_level_id' => $levelId, 'max_workspaces' => 2]);

    $role = RoleModel::create(['id' => (string) Str::uuid(), 'name' => 'Workspace Owner', 'scope' => 'workspace']);
    $permId = (string) Str::uuid();
    DB::table('permissions')->insertOrIgnore(['id' => $permId, 'name' => 'workspaces:manage']);
    $perm = DB::table('permissions')->where('name', 'workspaces:manage')->first();
    DB::table('role_permissions')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);

    $user = UserModel::factory()->create(['org_unit_id' => $vendorUnitId]);
    UserRoleModel::create(['id' => (string) Str::uuid(), 'user_id' => $user->id, 'role_id' => $role->id, 'context_type' => 'WORKSPACE']);
    $outsider = UserModel::factory()->create(['org_unit_id' => (string) Str::uuid()]);

    $wsResp = $this->actingAs($user)->postJson('/api/workspaces', ['name' => 'Collab Workspace'])->assertStatus(201);
    $wsId = $wsResp->json('id');

    $workflow = WorkflowModel::create(['id' => (string) Str::uuid(), 'name' => 'Collab Workflow', 'is_default' => true]);

    // Create project
    $projResp = $this->actingAs($user)->postJson('/api/projects', [
        'workspace_id' => $wsId,
        'key' => 'COLLAB',
        'name' => 'Collaboration Project',
    ])->assertStatus(201);
    $projId = $projResp->json('data.id');

    // 1. Workspace owner can access project lookups -> 200 OK
    $this->actingAs($user)->getJson("/api/projects/{$projId}/lookups")->assertStatus(200);

    // 2. Outsider cannot access project lookups -> 403 Forbidden
    $this->actingAs($outsider)->getJson("/api/projects/{$projId}/lookups")->assertStatus(403);

    // 3. Outsider cannot update project -> 403 Forbidden
    $this->actingAs($outsider)->putJson("/api/projects/{$projId}", ['name' => 'Hacked Project'])->assertStatus(403);

    // 4. Workspace owner can update project -> 200 OK
    $this->actingAs($user)->putJson("/api/projects/{$projId}", ['name' => 'Renamed Project'])->assertStatus(200);
});

test('skenario hak akses penuh Superadmin lintas unit dan workspace', function () {
    $superadmin = UserModel::factory()->create(['email' => 'superadmin@wlms.com']);

    $levelId = (string) Str::uuid();
    DB::table('org_levels')->insert(['id' => $levelId, 'name' => 'Root Level', 'slug' => 'root-level', 'depth' => 1, 'can_own_workspace' => true]);
    $unitId = (string) Str::uuid();
    DB::table('org_units')->insert(['id' => $unitId, 'name' => 'Isolated Unit', 'code' => 'ISO', 'org_level_id' => $levelId, 'max_workspaces' => 5]);

    $regularUser = UserModel::factory()->create(['org_unit_id' => $unitId]);
    $wsId = (string) Str::uuid();
    DB::table('workspaces')->insert([
        'id' => $wsId,
        'owner_group_id' => $unitId,
        'name' => 'Superadmin Inspection Workspace',
        'status' => 'ACTIVE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // 1. Superadmin can view all workspaces
    $wsList = $this->actingAs($superadmin)->getJson('/api/workspaces')->assertStatus(200)->json();
    $wsIds = array_column($wsList, 'id');
    expect($wsIds)->toContain($wsId);

    // 2. Superadmin can view projects of any workspace
    $this->actingAs($superadmin)->getJson("/api/workspaces/{$wsId}/projects")->assertStatus(200);

    // 3. Superadmin accessing non-existent workspace returns 404, not 500
    $nonExistentId = (string) Str::uuid();
    $this->actingAs($superadmin)->putJson("/api/workspaces/{$nonExistentId}", ['name' => 'Ghost'])->assertStatus(404);
    $this->actingAs($superadmin)->deleteJson("/api/workspaces/{$nonExistentId}")->assertStatus(404);
});

test('skenario tim developer bersama-sama: 1 role Developer (workspace) otomatis membuka akses ke seluruh 5 use case ML', function () {
    $levelId = (string) Str::uuid();
    DB::table('org_levels')->insert(['id' => $levelId, 'name' => 'Vendor Level', 'slug' => 'vendor-level', 'depth' => 1, 'can_own_workspace' => true]);

    $vendorUnitId = (string) Str::uuid();
    DB::table('org_units')->insert(['id' => $vendorUnitId, 'name' => 'PT MII', 'code' => 'MII', 'org_level_id' => $levelId, 'max_workspaces' => 1]);

    // Role Developer dengan scope WORKSPACE
    $devRole = RoleModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Developer',
        'scope' => 'WORKSPACE',
    ]);
    $permId = (string) Str::uuid();
    DB::table('permissions')->insertOrIgnore(['id' => $permId, 'name' => 'projects:view']);
    $perm = DB::table('permissions')->where('name', 'projects:view')->first();
    DB::table('role_permissions')->insert(['role_id' => $devRole->id, 'permission_id' => $perm->id]);

    // Workspace MII
    $workspaceId = (string) Str::uuid();
    DB::table('workspaces')->insert([
        'id' => $workspaceId,
        'owner_group_id' => $vendorUnitId,
        'name' => 'MII Machine Learning 5 Use Cases',
        'status' => 'ACTIVE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $workflow = WorkflowModel::create(['id' => (string) Str::uuid(), 'name' => 'ML Workflow', 'is_default' => true]);

    // 5 Proyek Use Case dibuat di dalam workspace yang sama
    $projectIds = [];
    for ($i = 1; $i <= 5; $i++) {
        $pId = (string) Str::uuid();
        DB::table('projects')->insert([
            'id' => $pId,
            'workspace_id' => $workspaceId,
            'workflow_id' => $workflow->id,
            'key' => "ML0{$i}",
            'name' => "Machine Learning Use Case {$i}",
            'status' => 'ACTIVE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $projectIds[] = $pId;
    }

    // Anggota Tim: Mochammad Aditya Putra Suhendar (Developer)
    $aditya = UserModel::factory()->create([
        'name' => 'Mochammad Aditya Putra Suhendar',
        'email' => 'aditya@mii.co.id',
        'org_unit_id' => $vendorUnitId,
    ]);

    // CUKUP 1 KALI ASSIGN di level WORKSPACE (tanpa harus assign 5 kali per proyek)
    UserRoleModel::create([
        'id' => (string) Str::uuid(),
        'user_id' => $aditya->id,
        'role_id' => $devRole->id,
        'context_type' => 'WORKSPACE',
        'context_id' => $workspaceId,
    ]);

    // Aditya membuka daftar proyek di workspace MII
    $response = $this->actingAs($aditya)
        ->getJson("/api/workspaces/{$workspaceId}/projects")
        ->assertStatus(200)
        ->json();

    // Verifikasi: Aditya otomatis bisa melihat dan mengakses SELURUH 5 use case ML sekaligus!
    expect($response)->toHaveCount(5);
    $loadedKeys = array_column($response, 'key');
    expect($loadedKeys)->toEqualCanonicalizing(['ML01', 'ML02', 'ML03', 'ML04', 'ML05']);

    // Verifikasi: Aditya dapat mengakses endpoint sprints use case tanpa 403 Forbidden
    $this->actingAs($aditya)
        ->getJson("/api/projects/{$projectIds[0]}/sprints")
        ->assertStatus(200);
});

test('user tanpa permission analytics:view tidak diizinkan mengakses data analytics (403)', function () {
    $levelId = (string) Str::uuid();
    DB::table('org_levels')->insert(['id' => $levelId, 'name' => 'Vendor Level', 'slug' => 'vendor-level-analytics', 'depth' => 1, 'can_own_workspace' => true]);

    $vendorUnitId = (string) Str::uuid();
    DB::table('org_units')->insert(['id' => $vendorUnitId, 'name' => 'PT MII', 'code' => 'MII-ANALYTICS', 'org_level_id' => $levelId, 'max_workspaces' => 1]);

    $devRole = RoleModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Junior Developer',
        'scope' => 'WORKSPACE',
    ]);

    $viewProj = (string) Str::uuid();
    DB::table('permissions')->insertOrIgnore(['id' => $viewProj, 'name' => 'projects:view']);
    $pProj = DB::table('permissions')->where('name', 'projects:view')->first();
    DB::table('role_permissions')->insert(['role_id' => $devRole->id, 'permission_id' => $pProj->id]);

    $workspaceId = (string) Str::uuid();
    DB::table('workspaces')->insert([
        'id' => $workspaceId,
        'owner_group_id' => (string) Str::uuid(),
        'name' => 'Secure Workspace',
        'status' => 'ACTIVE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $junior = UserModel::factory()->create([
        'name' => 'Junior Dev',
        'email' => 'junior@mii.co.id',
        'org_unit_id' => $vendorUnitId,
    ]);

    DB::table('workspace_members')->insert([
        'workspace_id' => $workspaceId,
        'user_id' => $junior->id,
        'role' => 'member',
        'daily_capacity_hours' => 8,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    UserRoleModel::create([
        'id' => (string) Str::uuid(),
        'user_id' => $junior->id,
        'role_id' => $devRole->id,
        'context_type' => 'WORKSPACE',
        'context_id' => $workspaceId,
    ]);

    // Percobaan akses analytics workspace harus 403 Forbidden
    $this->actingAs($junior)
        ->getJson("/api/workspaces/{$workspaceId}/analytics")
        ->assertStatus(403);
});
