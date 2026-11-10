<?php

declare(strict_types=1);

use App\Modules\Identity\Application\UseCases\RBAC\AssignRoleToUserCommand;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\PermissionModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\RoleModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Workload\Application\DTOs\CreateProjectInput;
use App\Modules\Workload\Application\DTOs\ProjectOutput;
use App\Modules\Workload\Application\Queries\GetWorkspacesByGroupQuery;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Application\UseCases\CreateProjectUseCase;
use App\Modules\Workload\Domain\Entities\Project;
use App\Modules\Workload\Domain\Repositories\ProjectRepositoryInterface;
use App\Modules\Workload\Infrastructure\Config\WorkspaceSettings;
use App\Modules\Workload\Presentation\Http\Requests\CreateIssueHttpRequest;
use App\Modules\Workload\Presentation\Http\Requests\TransitionIssueHttpRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('R-01 Unit: canManageWorkspace returns false for same-unit staff without workspaces:manage and true for manager', function () {
    $unitId = (string) Str::uuid();
    $wsId = (string) Str::uuid();

    $owner = UserModel::factory()->create(['org_unit_id' => $unitId]);
    $staff = UserModel::factory()->create(['org_unit_id' => $unitId]);

    DB::table('workspaces')->insert([
        'id' => $wsId,
        'name' => 'Workspace Divisi TI Bank Jatim',
        'owner_group_id' => $unitId,
        'status' => 'ACTIVE',
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

    $devRole = RoleModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Developer Unit',
        'scope' => 'GLOBAL',
    ]);
    DB::table('user_roles')->insert([
        'id' => (string) Str::uuid(),
        'user_id' => $staff->id,
        'role_id' => $devRole->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    expect(WorkloadAccessChecker::canManageWorkspace($staff->id, $wsId))->toBeFalse()
        ->and(WorkloadAccessChecker::canManageWorkspace($owner->id, $wsId))->toBeTrue();
});

test('R-02 Unit: GetWorkspacesByGroupQuery and WorkloadAccessChecker reject ARCHIVED workspaces and hide unassigned workspaces', function () {
    $unitId = (string) Str::uuid();
    $activeAssignedWsId = (string) Str::uuid();
    $activeUnassignedWsId = (string) Str::uuid();
    $archivedWsId = (string) Str::uuid();

    $owner = UserModel::factory()->create(['org_unit_id' => $unitId]);
    $staff = UserModel::factory()->create(['org_unit_id' => $unitId]);

    $devRole = RoleModel::create(['id' => (string) Str::uuid(), 'name' => 'Staff Viewer', 'scope' => 'GLOBAL']);
    $viewPerm = PermissionModel::firstOrCreate(['name' => 'workspaces:view'], ['module' => 'workspaces']);
    DB::table('role_permissions')->insert(['role_id' => $devRole->id, 'permission_id' => $viewPerm->id]);
    DB::table('user_roles')->insert([
        'id' => (string) Str::uuid(),
        'user_id' => $staff->id,
        'role_id' => $devRole->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    foreach ([
        [$activeAssignedWsId, 'Active Assigned WS', 'ACTIVE'],
        [$activeUnassignedWsId, 'Active Unassigned WS', 'ACTIVE'],
        [$archivedWsId, 'Archived WS', 'ARCHIVED'],
    ] as [$id, $name, $status]) {
        DB::table('workspaces')->insert([
            'id' => $id,
            'name' => $name,
            'owner_group_id' => $unitId,
            'status' => $status,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('workspace_members')->insert([
            'workspace_id' => $id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'daily_capacity_hours' => 8,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    DB::table('workspace_members')->insert([
        'workspace_id' => $activeAssignedWsId,
        'user_id' => $staff->id,
        'role' => 'member',
        'daily_capacity_hours' => 8,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('workspace_members')->insert([
        'workspace_id' => $archivedWsId,
        'user_id' => $staff->id,
        'role' => 'member',
        'daily_capacity_hours' => 8,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $query = new GetWorkspacesByGroupQuery;
    $results = $query->execute($unitId, $staff->id, 50, null, false);
    $returnedIds = array_map(fn ($w) => $w->id, $results);

    expect($returnedIds)->toBe([$activeAssignedWsId])
        ->and(WorkloadAccessChecker::canViewWorkspace($staff->id, $archivedWsId))->toBeFalse()
        ->and(WorkloadAccessChecker::canViewWorkspace($staff->id, $activeUnassignedWsId))->toBeFalse()
        ->and(WorkloadAccessChecker::canViewWorkspace($staff->id, $activeAssignedWsId))->toBeTrue();
});

test('R-03 Unit: WorkspaceSettings returns 0 quota when org_levels.can_own_workspace is false', function () {
    $disabledLevelId = (string) Str::uuid();
    $enabledLevelId = (string) Str::uuid();
    $disabledUnitId = (string) Str::uuid();
    $enabledUnitId = (string) Str::uuid();

    DB::table('org_levels')->insert([
        [
            'id' => $disabledLevelId,
            'name' => 'Seksi Non-Owner',
            'slug' => 'seksi-non-owner',
            'depth' => 3,
            'can_own_workspace' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => $enabledLevelId,
            'name' => 'Sub-Divisi Owner',
            'slug' => 'sub-divisi-owner',
            'depth' => 2,
            'can_own_workspace' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    DB::table('org_units')->insert([
        [
            'id' => $disabledUnitId,
            'org_level_id' => $disabledLevelId,
            'name' => 'Seksi Operasional',
            'max_workspaces' => 5,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => $enabledUnitId,
            'org_level_id' => $enabledLevelId,
            'name' => 'Sub-Divisi Data Science',
            'max_workspaces' => 3,
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    $settings = new WorkspaceSettings;

    expect($settings->getMaxWorkspacesPerGroup($disabledUnitId))->toBe(0)
        ->and($settings->getMaxWorkspacesPerGroup($enabledUnitId))->toBe(3);
});

test('R-04 & R-05 Unit: CreateProjectUseCase persists leadId and WorkloadAccessChecker enforces granular project ownership permissions', function () {
    $unitId = (string) Str::uuid();
    $wsId = (string) Str::uuid();

    $userA = UserModel::factory()->create(['org_unit_id' => $unitId]);
    $userB = UserModel::factory()->create(['org_unit_id' => $unitId]);

    DB::table('workspaces')->insert([
        'id' => $wsId,
        'name' => 'Workspace Sub-Divisi Data Science',
        'owner_group_id' => $unitId,
        'status' => 'ACTIVE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    foreach ([$userA, $userB] as $u) {
        DB::table('workspace_members')->insert([
            'workspace_id' => $wsId,
            'user_id' => $u->id,
            'role' => 'member',
            'daily_capacity_hours' => 8,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    $roleCreatorEditor = RoleModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Project Creator & Own Editor',
        'scope' => 'WORKSPACE',
    ]);

    foreach (['projects:create', 'projects:edit', 'projects:view'] as $permName) {
        $perm = PermissionModel::firstOrCreate(['name' => $permName], ['module' => 'projects']);
        DB::table('role_permissions')->insert([
            'role_id' => $roleCreatorEditor->id,
            'permission_id' => $perm->id,
        ]);
    }

    DB::table('user_roles')->insert([
        'id' => (string) Str::uuid(),
        'user_id' => $userA->id,
        'role_id' => $roleCreatorEditor->id,
        'context_type' => 'WORKSPACE',
        'context_id' => $wsId,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $repo = Mockery::mock(ProjectRepositoryInterface::class);
    $repo->shouldReceive('existsByKey')->once()->andReturnFalse();
    $repo->shouldReceive('save')->once()->with(Mockery::on(function (Project $p) use ($userA) {
        return $p->getLeadId() === (string) $userA->id;
    }));

    $useCase = new CreateProjectUseCase($repo);
    $projectIdA = (string) Str::uuid();
    $useCase->execute(new CreateProjectInput(
        projectId: $projectIdA,
        workspaceId: $wsId,
        key: 'DSA',
        name: 'Data Pipeline A',
        description: null,
        leadId: (string) $userA->id,
        actorUserId: (string) $userA->id,
    ));

    $projectIdB = (string) Str::uuid();
    DB::table('projects')->insert([
        [
            'id' => $projectIdA,
            'workspace_id' => $wsId,
            'key' => 'DSA',
            'name' => 'Data Pipeline A',
            'lead_id' => $userA->id,
            'status' => 'ACTIVE',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => $projectIdB,
            'workspace_id' => $wsId,
            'key' => 'DSB',
            'name' => 'Data Pipeline B',
            'lead_id' => $userB->id,
            'status' => 'ACTIVE',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    $output = new ProjectOutput(
        id: $projectIdA,
        workspaceId: $wsId,
        key: 'DSA',
        name: 'Data Pipeline A',
        description: null,
        status: 'ACTIVE',
        leadId: (string) $userA->id
    );

    expect($output->leadId)->toBe((string) $userA->id)
        ->and(WorkloadAccessChecker::canCreateProject($userA->id, $wsId))->toBeTrue()
        ->and(WorkloadAccessChecker::canEditProject($userA->id, $projectIdA))->toBeTrue()
        ->and(WorkloadAccessChecker::canEditProject($userA->id, $projectIdB))->toBeFalse()
        ->and(WorkloadAccessChecker::canDeleteProject($userA->id, $projectIdA))->toBeFalse()
        ->and(WorkloadAccessChecker::canDeleteProject($userA->id, $projectIdB))->toBeFalse();
});

test('R-06, R-08, R-09, R-10 Unit: TransitionIssueHttpRequest, CreateIssueHttpRequest, and canManageSprint enforce project scope + permission', function () {
    $unitA = (string) Str::uuid();
    $unitB = (string) Str::uuid();
    $wsA = (string) Str::uuid();
    $projA = (string) Str::uuid();
    $issueA = (string) Str::uuid();

    $ownerA = UserModel::factory()->create(['org_unit_id' => $unitA]);
    $outsiderWithGlobalPerm = UserModel::factory()->create(['org_unit_id' => $unitB]);

    DB::table('workspaces')->insert([
        'id' => $wsA,
        'name' => 'Workspace Core Banking',
        'owner_group_id' => $unitA,
        'status' => 'ACTIVE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('workspace_members')->insert([
        'workspace_id' => $wsA,
        'user_id' => $ownerA->id,
        'role' => 'owner',
        'daily_capacity_hours' => 8,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('projects')->insert([
        'id' => $projA,
        'workspace_id' => $wsA,
        'key' => 'CBA',
        'name' => 'Core Banking API',
        'lead_id' => $ownerA->id,
        'status' => 'ACTIVE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $statusId = (string) Str::uuid();
    $typeId = (string) Str::uuid();
    $prioId = (string) Str::uuid();
    DB::table('statuses')->insert(['id' => $statusId, 'name' => 'To Do', 'slug' => 'todo-u', 'category' => 'TODO']);
    DB::table('issue_types')->insert(['id' => $typeId, 'name' => 'Task', 'slug' => 'task-u', 'icon' => 'check']);
    DB::table('priorities')->insert(['id' => $prioId, 'name' => 'High', 'slug' => 'high-u', 'level' => 1, 'color' => '#000']);

    DB::table('issues')->insert([
        'id' => $issueA,
        'project_id' => $projA,
        'issue_type_id' => $typeId,
        'status_id' => $statusId,
        'priority_id' => $prioId,
        'number' => 1,
        'title' => 'Core Task',
        'reporter_id' => $ownerA->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $globalRole = RoleModel::create(['id' => (string) Str::uuid(), 'name' => 'Global Dev', 'scope' => 'GLOBAL']);
    foreach (['issues:create', 'issues:edit', 'sprints:manage'] as $permName) {
        $perm = PermissionModel::firstOrCreate(['name' => $permName], ['module' => explode(':', $permName)[0]]);
        DB::table('role_permissions')->insert(['role_id' => $globalRole->id, 'permission_id' => $perm->id]);
    }
    DB::table('user_roles')->insert([
        'id' => (string) Str::uuid(),
        'user_id' => $outsiderWithGlobalPerm->id,
        'role_id' => $globalRole->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $createReq = CreateIssueHttpRequest::create('/api/issues', 'POST', ['project_id' => $projA]);
    $createReq->setUserResolver(fn () => $outsiderWithGlobalPerm);

    $transitionReq = TransitionIssueHttpRequest::create("/api/issues/{$issueA}/transition", 'POST');
    $transitionReq->setUserResolver(fn () => $outsiderWithGlobalPerm);
    $transitionReq->setRouteResolver(function () use ($issueA) {
        $route = Mockery::mock();
        $route->shouldReceive('parameter')->with('id', null)->andReturn($issueA);

        return $route;
    });

    expect($createReq->authorize())->toBeFalse()
        ->and($transitionReq->authorize())->toBeFalse()
        ->and(WorkloadAccessChecker::canManageSprint($outsiderWithGlobalPerm->id, $projA, 'sprints:create'))->toBeFalse();
});

test('R-12 Unit: AssignRoleToUserCommand throws ValidationException on duplicate role assignment in same context including NULL', function () {
    $user = UserModel::factory()->create();
    $role = RoleModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Workspace Owner',
        'scope' => 'WORKSPACE',
    ]);

    $command = new AssignRoleToUserCommand;
    $command->execute((string) $user->id, $role->id, 'WORKSPACE', null);

    expect(fn () => $command->execute((string) $user->id, $role->id, 'WORKSPACE', null))
        ->toThrow(ValidationException::class);

    $wsId = (string) Str::uuid();
    $command->execute((string) $user->id, $role->id, 'WORKSPACE', $wsId);

    expect(fn () => $command->execute((string) $user->id, $role->id, 'WORKSPACE', $wsId))
        ->toThrow(ValidationException::class);
});
