<?php

declare(strict_types=1);

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\PermissionModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\RoleModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    // 1. Setup Bank Jatim Org Hierarchy: Divisi TI -> Sub-Divisi Data Science & Sub-Divisi Core Banking
    $this->divLevelId = (string) Str::uuid();
    $this->subDivLevelId = (string) Str::uuid();
    $this->nonOwnerLevelId = (string) Str::uuid();

    DB::table('org_levels')->insert([
        [
            'id' => $this->divLevelId,
            'name' => 'Divisi',
            'slug' => 'divisi',
            'depth' => 1,
            'can_own_workspace' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => $this->subDivLevelId,
            'name' => 'Sub-Divisi',
            'slug' => 'sub-divisi',
            'depth' => 2,
            'can_own_workspace' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => $this->nonOwnerLevelId,
            'name' => 'Unit Administrasi',
            'slug' => 'unit-administrasi',
            'depth' => 3,
            'can_own_workspace' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    $this->divTiId = (string) Str::uuid();
    $this->subDivDataId = (string) Str::uuid();
    $this->subDivCoreId = (string) Str::uuid();
    $this->nonOwnerUnitId = (string) Str::uuid();

    DB::table('org_units')->insert([
        [
            'id' => $this->divTiId,
            'org_level_id' => $this->divLevelId,
            'parent_id' => null,
            'code' => 'DIV-TI',
            'name' => 'Divisi Teknologi Informasi',
            'max_workspaces' => 5,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => $this->subDivDataId,
            'org_level_id' => $this->subDivLevelId,
            'parent_id' => $this->divTiId,
            'code' => 'SUB-DADS',
            'name' => 'Data Analyst & Data Science',
            'max_workspaces' => 3,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => $this->subDivCoreId,
            'org_level_id' => $this->subDivLevelId,
            'parent_id' => $this->divTiId,
            'code' => 'SUB-CORE',
            'name' => 'Core Banking System',
            'max_workspaces' => 3,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => $this->nonOwnerUnitId,
            'org_level_id' => $this->nonOwnerLevelId,
            'parent_id' => $this->subDivDataId,
            'code' => 'ADM-01',
            'name' => 'Unit Administrasi Data',
            'max_workspaces' => 5,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    // Closure table
    DB::table('org_unit_closures')->insert([
        ['ancestor_id' => $this->divTiId, 'descendant_id' => $this->divTiId, 'depth' => 0],
        ['ancestor_id' => $this->subDivDataId, 'descendant_id' => $this->subDivDataId, 'depth' => 0],
        ['ancestor_id' => $this->subDivCoreId, 'descendant_id' => $this->subDivCoreId, 'depth' => 0],
        ['ancestor_id' => $this->nonOwnerUnitId, 'descendant_id' => $this->nonOwnerUnitId, 'depth' => 0],
        ['ancestor_id' => $this->divTiId, 'descendant_id' => $this->subDivDataId, 'depth' => 1],
        ['ancestor_id' => $this->divTiId, 'descendant_id' => $this->subDivCoreId, 'depth' => 1],
        ['ancestor_id' => $this->divTiId, 'descendant_id' => $this->nonOwnerUnitId, 'depth' => 2],
        ['ancestor_id' => $this->subDivDataId, 'descendant_id' => $this->nonOwnerUnitId, 'depth' => 1],
    ]);

    // Workflow & Lookups
    $this->workflowId = (string) Str::uuid();
    DB::table('workflows')->insert([
        'id' => $this->workflowId,
        'name' => 'Default Workflow',
        'is_default' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->todoStatusId = (string) Str::uuid();
    $this->inProgressStatusId = (string) Str::uuid();
    DB::table('statuses')->insert([
        ['id' => $this->todoStatusId, 'name' => 'To Do', 'slug' => 'to-do', 'category' => 'TODO', 'created_at' => now(), 'updated_at' => now()],
        ['id' => $this->inProgressStatusId, 'name' => 'In Progress', 'slug' => 'in-progress', 'category' => 'IN_PROGRESS', 'created_at' => now(), 'updated_at' => now()],
    ]);

    DB::table('workflow_transitions')->insert([
        [
            'id' => (string) Str::uuid(),
            'workflow_id' => $this->workflowId,
            'from_status_id' => null,
            'to_status_id' => $this->todoStatusId,
            'name' => 'Create',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => (string) Str::uuid(),
            'workflow_id' => $this->workflowId,
            'from_status_id' => $this->todoStatusId,
            'to_status_id' => $this->inProgressStatusId,
            'name' => 'Start Work',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    $this->issueTypeId = (string) Str::uuid();
    DB::table('issue_types')->insert([
        'id' => $this->issueTypeId,
        'name' => 'Task',
        'slug' => 'task',
        'icon' => 'check',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->priorityId = (string) Str::uuid();
    DB::table('priorities')->insert([
        'id' => $this->priorityId,
        'name' => 'High',
        'slug' => 'high',
        'level' => 3,
        'color' => '#ef4444',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
});

test('R-01 & R-02: same-unit staff without manage role cannot manage workspace, unassigned or ARCHIVED workspaces are hidden and blocked', function () {
    $owner = UserModel::factory()->create(['org_unit_id' => $this->subDivDataId]);
    $unassignedStaff = UserModel::factory()->create(['org_unit_id' => $this->subDivDataId]);

    $viewerRole = RoleModel::create(['id' => (string) Str::uuid(), 'name' => 'Data Scientist Viewer', 'scope' => 'GLOBAL']);
    foreach (['workspaces:view', 'projects:view', 'issues:view'] as $pName) {
        $perm = PermissionModel::firstOrCreate(['name' => $pName], ['module' => explode(':', $pName)[0]]);
        DB::table('role_permissions')->insert(['role_id' => $viewerRole->id, 'permission_id' => $perm->id]);
    }
    DB::table('user_roles')->insert([
        'id' => (string) Str::uuid(),
        'user_id' => $unassignedStaff->id,
        'role_id' => $viewerRole->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $activeWsId = (string) Str::uuid();
    $archivedWsId = (string) Str::uuid();

    foreach ([
        [$activeWsId, 'Workspace Active DADS', 'ACTIVE'],
        [$archivedWsId, 'Workspace Archived DADS', 'ARCHIVED'],
    ] as [$wsId, $wsName, $status]) {
        DB::table('workspaces')->insert([
            'id' => $wsId,
            'name' => $wsName,
            'owner_group_id' => $this->subDivDataId,
            'status' => $status,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('workspace_members')->insert([
            'workspace_id' => $wsId,
            'user_id' => $owner->id,
            'role' => 'owner',
            'daily_capacity_hours' => 8,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    // 1. Unassigned staff in same sub-division does NOT see activeWsId or archivedWsId
    $listBefore = $this->actingAs($unassignedStaff)->getJson('/api/workspaces');
    $listBefore->assertStatus(200);
    expect($listBefore->json())->toHaveCount(0);

    // 2. Unassigned staff cannot update or archive activeWsId (R-01)
    $this->actingAs($unassignedStaff)->putJson("/api/workspaces/{$activeWsId}", ['name' => 'Hacked'])->assertStatus(403);
    $this->actingAs($unassignedStaff)->deleteJson("/api/workspaces/{$activeWsId}")->assertStatus(403);

    // 3. Even after adding staff as member to both workspaces, ARCHIVED workspace never appears and returns 403
    foreach ([$activeWsId, $archivedWsId] as $wsId) {
        DB::table('workspace_members')->insert([
            'workspace_id' => $wsId,
            'user_id' => $unassignedStaff->id,
            'role' => 'member',
            'daily_capacity_hours' => 8,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    $listAfter = $this->actingAs($unassignedStaff)->getJson('/api/workspaces');
    $listAfter->assertStatus(200);
    expect(collect($listAfter->json())->pluck('id')->all())->toBe([$activeWsId]);

    $this->actingAs($unassignedStaff)->getJson("/api/workspaces/{$archivedWsId}/projects")->assertStatus(403);
    $this->actingAs($unassignedStaff)->getJson("/api/workspaces/{$archivedWsId}/issues")->assertStatus(403);
    $this->actingAs($unassignedStaff)->get("/projects?workspace_id={$archivedWsId}")->assertStatus(403);
    $this->actingAs($unassignedStaff)->get("/workspaces/{$archivedWsId}/issues")->assertStatus(403);
});

test('R-03: Division Head can create workspace for descendant Sub-Division, sibling unit is rejected 403, and can_own_workspace=false is rejected 422', function () {
    $divHead = UserModel::factory()->create(['org_unit_id' => $this->divTiId]);
    $subDivHead = UserModel::factory()->create(['org_unit_id' => $this->subDivDataId]);
    $nonOwnerUser = UserModel::factory()->create(['org_unit_id' => $this->nonOwnerUnitId]);

    $wsCreatorRole = RoleModel::create(['id' => (string) Str::uuid(), 'name' => 'Workspace Creator', 'scope' => 'GLOBAL']);
    foreach (['workspaces:create', 'workspaces:view'] as $pName) {
        $perm = PermissionModel::firstOrCreate(['name' => $pName], ['module' => 'workspaces']);
        DB::table('role_permissions')->insert(['role_id' => $wsCreatorRole->id, 'permission_id' => $perm->id]);
    }

    foreach ([$divHead, $subDivHead, $nonOwnerUser] as $u) {
        DB::table('user_roles')->insert([
            'id' => (string) Str::uuid(),
            'user_id' => $u->id,
            'role_id' => $wsCreatorRole->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    // 1. Division Head creates workspace for Sub-Divisi Data Science (descendant) -> 201
    $res = $this->actingAs($divHead)->postJson('/api/workspaces', [
        'name' => 'Workspace Analitik Bank Jatim',
        'owner_group_id' => $this->subDivDataId,
    ]);
    $res->assertStatus(201);

    $wsList = $this->actingAs($divHead)->getJson('/api/workspaces');
    $wsList->assertStatus(200);
    expect($wsList->json('0.owner_group_id'))->toBe($this->subDivDataId)
        ->and($wsList->json('0.owner_group_name'))->toBe('Data Analyst & Data Science')
        ->and($wsList->json('0.owner_group_code'))->toBe('SUB-DADS');

    // 2. Sub-Divisi Data Science user cannot create workspace for sibling Sub-Divisi Core Banking -> 403
    $this->actingAs($subDivHead)->postJson('/api/workspaces', [
        'name' => 'Illegal Sibling Workspace',
        'owner_group_id' => $this->subDivCoreId,
    ])->assertStatus(403);

    // 3. Unit with can_own_workspace = false fails with 422
    $this->actingAs($nonOwnerUser)->postJson('/api/workspaces', [
        'name' => 'Non Owner Workspace',
    ])->assertStatus(422);
});

test('R-04 & R-05: User A with projects:create + projects:edit + projects:view can create project, edit ONLY own project, and cannot delete any project', function () {
    $wsOwner = UserModel::factory()->create(['org_unit_id' => $this->subDivDataId]);
    $userA = UserModel::factory()->create(['org_unit_id' => $this->subDivDataId]);
    $userB = UserModel::factory()->create(['org_unit_id' => $this->subDivDataId]);

    $wsId = (string) Str::uuid();
    DB::table('workspaces')->insert([
        'id' => $wsId,
        'name' => 'Workspace DADS Bank Jatim',
        'owner_group_id' => $this->subDivDataId,
        'status' => 'ACTIVE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    DB::table('workspace_members')->insert([
        ['workspace_id' => $wsId, 'user_id' => $wsOwner->id, 'role' => 'owner', 'daily_capacity_hours' => 8, 'created_at' => now(), 'updated_at' => now()],
        ['workspace_id' => $wsId, 'user_id' => $userA->id, 'role' => 'member', 'daily_capacity_hours' => 8, 'created_at' => now(), 'updated_at' => now()],
        ['workspace_id' => $wsId, 'user_id' => $userB->id, 'role' => 'member', 'daily_capacity_hours' => 8, 'created_at' => now(), 'updated_at' => now()],
    ]);

    // Give User A and User B ONLY projects:create, projects:edit, projects:view (NO projects:manage, NO projects:delete)
    $customProjectRole = RoleModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Data Scientist Project Creator',
        'scope' => 'WORKSPACE',
    ]);
    foreach (['projects:create', 'projects:edit', 'projects:view'] as $permName) {
        $perm = PermissionModel::firstOrCreate(['name' => $permName], ['module' => 'projects']);
        DB::table('role_permissions')->insert([
            'role_id' => $customProjectRole->id,
            'permission_id' => $perm->id,
        ]);
    }

    foreach ([$userA, $userB] as $u) {
        DB::table('user_roles')->insert([
            'id' => (string) Str::uuid(),
            'user_id' => $u->id,
            'role_id' => $customProjectRole->id,
            'context_type' => 'WORKSPACE',
            'context_id' => $wsId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    // 1. User A creates Project A (without passing lead_id -> defaults to User A)
    $createA = $this->actingAs($userA)->postJson('/api/projects', [
        'workspace_id' => $wsId,
        'key' => 'PRJA',
        'name' => 'Project Milik User A',
    ]);
    $createA->assertStatus(201);
    $projectAId = $createA->json('data.id');

    expect(DB::table('projects')->where('id', $projectAId)->value('lead_id'))->toBe($userA->id);

    // 2. User B creates Project B
    $createB = $this->actingAs($userB)->postJson('/api/projects', [
        'workspace_id' => $wsId,
        'key' => 'PRJB',
        'name' => 'Project Milik User B',
    ]);
    $createB->assertStatus(201);
    $projectBId = $createB->json('data.id');

    // 3. GET /api/workspaces/{wsId}/projects returns lead_id for frontend ownership check
    $projectsRes = $this->actingAs($userA)->getJson("/api/workspaces/{$wsId}/projects");
    $projectsRes->assertStatus(200);
    $projectAJson = collect($projectsRes->json())->firstWhere('id', $projectAId);
    expect((string) $projectAJson['lead_id'])->toBe((string) $userA->id);

    // 4. User A can edit Project A (own project) -> 200 OK
    $this->actingAs($userA)->putJson("/api/projects/{$projectAId}", [
        'name' => 'Project Milik User A (Updated)',
        'description' => 'Updated by owner User A',
    ])->assertStatus(200);

    // 5. User A CANNOT edit Project B (created by User B) -> 403 Forbidden
    $this->actingAs($userA)->putJson("/api/projects/{$projectBId}", [
        'name' => 'Cuba Edit Project User B',
    ])->assertStatus(403);

    // 6. User A CANNOT delete/archive Project A or Project B (no projects:delete) -> 403 Forbidden
    $this->actingAs($userA)->deleteJson("/api/projects/{$projectAId}")->assertStatus(403);
    $this->actingAs($userA)->deleteJson("/api/projects/{$projectBId}")->assertStatus(403);
});

test('R-06, R-07, R-08, R-09, R-11: Anti-IDOR across workspaces for Issue CRUD, Transition, Assign, Bulk-Update, Sprints, Comments, and Attachments', function () {
    $ownerA = UserModel::factory()->create(['org_unit_id' => $this->subDivDataId]);
    $miiVendorB = UserModel::factory()->create(['org_unit_id' => $this->subDivCoreId]);

    $wsA = (string) Str::uuid();
    $wsB = (string) Str::uuid();

    DB::table('workspaces')->insert([
        ['id' => $wsA, 'name' => 'WS Data Science', 'owner_group_id' => $this->subDivDataId, 'status' => 'ACTIVE', 'created_at' => now(), 'updated_at' => now()],
        ['id' => $wsB, 'name' => 'WS Core Banking', 'owner_group_id' => $this->subDivCoreId, 'status' => 'ACTIVE', 'created_at' => now(), 'updated_at' => now()],
    ]);

    DB::table('workspace_members')->insert([
        ['workspace_id' => $wsA, 'user_id' => $ownerA->id, 'role' => 'owner', 'daily_capacity_hours' => 8, 'created_at' => now(), 'updated_at' => now()],
        ['workspace_id' => $wsB, 'user_id' => $miiVendorB->id, 'role' => 'member', 'daily_capacity_hours' => 8, 'created_at' => now(), 'updated_at' => now()],
    ]);

    // Give miiVendorB global permissions for issues and sprints, but only member of wsB (NOT wsA)
    $vendorRole = RoleModel::create(['id' => (string) Str::uuid(), 'name' => 'MII Full Contributor', 'scope' => 'GLOBAL']);
    foreach (['issues:create', 'issues:edit', 'issues:delete', 'issues:assign', 'issues:transition', 'sprints:manage'] as $pName) {
        $perm = PermissionModel::firstOrCreate(['name' => $pName], ['module' => explode(':', $pName)[0]]);
        DB::table('role_permissions')->insert(['role_id' => $vendorRole->id, 'permission_id' => $perm->id]);
    }
    DB::table('user_roles')->insert([
        'id' => (string) Str::uuid(),
        'user_id' => $miiVendorB->id,
        'role_id' => $vendorRole->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $projA = (string) Str::uuid();
    DB::table('projects')->insert([
        'id' => $projA,
        'workspace_id' => $wsA,
        'workflow_id' => $this->workflowId,
        'key' => 'DADS',
        'name' => 'Data Warehouse Bank Jatim',
        'lead_id' => $ownerA->id,
        'status' => 'ACTIVE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $issueA = (string) Str::uuid();
    DB::table('issues')->insert([
        'id' => $issueA,
        'project_id' => $projA,
        'issue_type_id' => $this->issueTypeId,
        'status_id' => $this->todoStatusId,
        'priority_id' => $this->priorityId,
        'number' => 1,
        'title' => 'Rahasia Divisi Data',
        'reporter_id' => $ownerA->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // R-08: miiVendorB cannot create, update, or delete issue in projA (403)
    $this->actingAs($miiVendorB)->postJson('/api/issues', [
        'project_id' => $projA,
        'title' => 'Injected Issue',
        'issue_type_id' => $this->issueTypeId,
        'priority_id' => $this->priorityId,
    ])->assertStatus(403);

    $this->actingAs($miiVendorB)->putJson("/api/issues/{$issueA}", [
        'title' => 'Hacked Title',
        'issue_type_id' => $this->issueTypeId,
        'status_id' => $this->todoStatusId,
        'priority_id' => $this->priorityId,
    ])->assertStatus(403);

    $this->actingAs($miiVendorB)->deleteJson("/api/issues/{$issueA}")->assertStatus(403);

    // R-06: miiVendorB cannot transition issueA (403)
    $this->actingAs($miiVendorB)->postJson("/api/issues/{$issueA}/transition", [
        'status_id' => $this->inProgressStatusId,
    ])->assertStatus(403);

    // R-07: miiVendorB cannot assign or bulk-update issueA (403)
    $this->actingAs($miiVendorB)->postJson("/api/issues/{$issueA}/assign", [
        'assignee_id' => $miiVendorB->id,
    ])->assertStatus(403);

    $this->actingAs($miiVendorB)->postJson('/api/issues/bulk-update', [
        'issue_ids' => [$issueA],
        'status_id' => $this->inProgressStatusId,
    ])->assertStatus(403);

    // R-09: miiVendorB cannot create, update, start, or complete sprint in projA (403)
    $sprintA = (string) Str::uuid();
    DB::table('sprints')->insert([
        'id' => $sprintA,
        'project_id' => $projA,
        'name' => 'Sprint 1 DADS',
        'state' => 'FUTURE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->actingAs($miiVendorB)->postJson('/api/sprints', [
        'project_id' => $projA,
        'name' => 'Sprint Illegal',
    ])->assertStatus(403);

    $this->actingAs($miiVendorB)->putJson("/api/sprints/{$sprintA}", [
        'name' => 'Sprint Renamed',
    ])->assertStatus(403);

    $this->actingAs($miiVendorB)->putJson("/api/sprints/{$sprintA}/start", [
        'start_date' => now()->toDateString(),
        'end_date' => now()->addDays(14)->toDateString(),
    ])->assertStatus(403);

    $this->actingAs($miiVendorB)->putJson("/api/sprints/{$sprintA}/complete")->assertStatus(403);

    // R-11: miiVendorB cannot edit comment or delete attachment on issueA (403)
    $commentId = (string) Str::uuid();
    DB::table('issue_comments')->insert([
        'id' => $commentId,
        'issue_id' => $issueA,
        'author_id' => $miiVendorB->id,
        'body' => 'Old comment before removal from project',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->actingAs($miiVendorB)->putJson("/api/issues/{$issueA}/comments/{$commentId}", [
        'body' => 'Edited after removal',
    ])->assertStatus(403);

    $attachmentId = (string) Str::uuid();
    DB::table('issue_attachments')->insert([
        'id' => $attachmentId,
        'issue_id' => $issueA,
        'uploader_id' => $miiVendorB->id,
        'filename' => 'doc.pdf',
        'file_path' => 'attachments/doc.pdf',
        'mime_type' => 'application/pdf',
        'file_size' => 1024,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->actingAs($miiVendorB)->deleteJson("/api/attachments/{$attachmentId}")->assertStatus(403);
});

test('R-12: Duplicate role assignment in same context returns 422 ValidationException and workspace creation upgrades unscoped Workspace Owner row without duplicating', function () {
    $superAdmin = UserModel::factory()->create([
        'email' => 'superadmin@wlms.com',
        'org_unit_id' => $this->divTiId,
    ]);
    $superRole = RoleModel::create(['id' => (string) Str::uuid(), 'name' => 'Superadmin', 'scope' => 'GLOBAL']);
    DB::table('user_roles')->insert([
        'id' => (string) Str::uuid(),
        'user_id' => $superAdmin->id,
        'role_id' => $superRole->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $targetUser = UserModel::factory()->create([
        'name' => 'Robi Wahyu Leksono',
        'email' => 'robileksono@bankjatim.co.id',
        'org_unit_id' => $this->subDivDataId,
    ]);

    $wsOwnerRole = RoleModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Workspace Owner',
        'display_name' => 'Workspace Owner',
        'scope' => 'WORKSPACE',
    ]);
    $wsManagePerm = PermissionModel::firstOrCreate(['name' => 'workspaces:manage'], ['module' => 'workspaces']);
    DB::table('role_permissions')->insert([
        'role_id' => $wsOwnerRole->id,
        'permission_id' => $wsManagePerm->id,
    ]);

    // 1. First assignment (unscoped WORKSPACE) succeeds -> 200 OK
    $this->actingAs($superAdmin)->postJson('/api/rbac/user-roles/assign', [
        'user_id' => $targetUser->id,
        'role_id' => $wsOwnerRole->id,
        'context_type' => 'WORKSPACE',
        'context_id' => null,
    ])->assertStatus(200);

    expect(DB::table('user_roles')->where('user_id', $targetUser->id)->where('role_id', $wsOwnerRole->id)->count())->toBe(1);

    // 2. Second identical assignment is rejected with validation error on role_id (422) and count stays 1!
    $this->actingAs($superAdmin)->postJson('/api/rbac/user-roles/assign', [
        'user_id' => $targetUser->id,
        'role_id' => $wsOwnerRole->id,
        'context_type' => 'WORKSPACE',
        'context_id' => null,
    ])->assertStatus(422)->assertJsonValidationErrors(['role_id']);

    expect(DB::table('user_roles')->where('user_id', $targetUser->id)->where('role_id', $wsOwnerRole->id)->count())->toBe(1);

    // 3. When targetUser creates a workspace, AssignWorkspaceCreatorAsOwnerListener upgrades the unscoped row instead of inserting a 2nd Workspace Owner badge
    $createWs = $this->actingAs($targetUser)->postJson('/api/workspaces', [
        'name' => 'Workspace Data Science Robi',
    ]);
    $createWs->assertStatus(201);
    $newWsId = $createWs->json('id');

    $rolesAfterCreate = DB::table('user_roles')
        ->where('user_id', $targetUser->id)
        ->where('role_id', $wsOwnerRole->id)
        ->get();

    expect($rolesAfterCreate)->toHaveCount(1)
        ->and($rolesAfterCreate->first()->context_id)->toBe($newWsId);
});
