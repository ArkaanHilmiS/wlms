<?php

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\RoleModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserRoleModel;
use App\Modules\Workload\Application\UseCases\ImportIssuesUseCase;
use App\Modules\Workload\Domain\Events\IssueAssigned;
use App\Modules\Workload\Infrastructure\Mail\IssueAssignedMail;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\ProjectModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\StatusModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\WorkspaceModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Dynamic schema compatibility for in-memory SQLite
    if (DB::getDriverName() === 'sqlite') {
        if (! Schema::hasTable('org_levels')) {
            Schema::create('org_levels', function ($table) {
                $table->uuid('id')->primary();
                $table->string('name');
                $table->integer('level_order')->default(1);
                $table->timestamps();
            });
        }
        if (! Schema::hasTable('org_units')) {
            Schema::create('org_units', function ($table) {
                $table->uuid('id')->primary();
                $table->string('name');
                $table->string('code')->nullable();
                $table->uuid('level_id')->nullable();
                $table->uuid('parent_id')->nullable();
                $table->timestamps();
            });
        }
    }
});

it('allows authorized superadmin to create dynamic status for kanban list', function () {
    $user = UserModel::factory()->create();

    // Assign Superadmin role
    $role = RoleModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Superadmin',
        'display_name' => 'Superadmin',
    ]);
    UserRoleModel::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
    ]);

    $response = $this->actingAs($user)->postJson('/api/statuses', [
        'name' => 'Testing Review',
        'slug' => 'testing-review',
        'category' => 'IN_PROGRESS',
        'color' => '#10b981',
    ]);

    $response->assertStatus(201);
    $response->assertJsonPath('name', 'Testing Review');
    $response->assertJsonPath('category', 'IN_PROGRESS');

    expect(StatusModel::where('slug', 'testing-review')->exists())->toBeTrue();
});

it('returns description and dates in get projects api for overview views', function () {
    $user = UserModel::factory()->create();
    $role = RoleModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Superadmin',
        'display_name' => 'Superadmin',
    ]);
    UserRoleModel::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
    ]);

    $workspace = WorkspaceModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Test Workspace',
        'owner_group_id' => (string) Str::uuid(),
        'status' => 'ACTIVE',
    ]);

    ProjectModel::create([
        'id' => (string) Str::uuid(),
        'workspace_id' => $workspace->id,
        'key' => 'TEST',
        'name' => 'Test Project With Details',
        'description' => 'Detailed description for testing',
        'status' => 'ACTIVE',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-31',
    ]);

    $response = $this->actingAs($user)->getJson("/api/workspaces/{$workspace->id}/projects");

    $response->assertStatus(200);
    $data = $response->json();
    expect($data)->toHaveCount(1);
    expect($data[0]['description'])->toBe('Detailed description for testing');
    expect($data[0]['start_date'])->toBe('2026-10-01');
    expect($data[0]['end_date'])->toBe('2026-10-31');
});

it('bulk assigns multiple issues atomically via single endpoint', function () {
    $admin = UserModel::factory()->create();
    $assignee = UserModel::factory()->create();
    $role = RoleModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Superadmin',
        'display_name' => 'Superadmin',
    ]);
    UserRoleModel::create([
        'user_id' => $admin->id,
        'role_id' => $role->id,
    ]);

    $workspace = WorkspaceModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Bulk Workspace',
        'owner_group_id' => (string) Str::uuid(),
        'status' => 'ACTIVE',
    ]);
    $project = ProjectModel::create([
        'id' => (string) Str::uuid(),
        'workspace_id' => $workspace->id,
        'key' => 'BLK',
        'name' => 'Bulk Project',
        'status' => 'ACTIVE',
    ]);
    $status = StatusModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'To Do',
        'slug' => 'to-do-bulk',
        'category' => 'TODO',
    ]);
    $typeId = (string) Str::uuid();
    DB::table('issue_types')->insert([
        'id' => $typeId,
        'name' => 'Task',
        'slug' => 'task',
        'icon' => 'check',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $priorityId = (string) Str::uuid();
    DB::table('priorities')->insert([
        'id' => $priorityId,
        'name' => 'Medium',
        'slug' => 'medium',
        'level' => 2,
        'color' => '#fbbf24',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $issue1Id = (string) Str::uuid();
    $issue2Id = (string) Str::uuid();
    foreach ([[$issue1Id, 1], [$issue2Id, 2]] as [$id, $num]) {
        DB::table('issues')->insert([
            'id' => $id,
            'project_id' => $project->id,
            'issue_type_id' => $typeId,
            'status_id' => $status->id,
            'priority_id' => $priorityId,
            'number' => $num,
            'title' => "Issue $num",
            'reporter_id' => $admin->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    $response = $this->actingAs($admin)->postJson('/api/issues/bulk-update', [
        'issue_ids' => [$issue1Id, $issue2Id],
        'assignee_id' => (string) $assignee->id,
    ]);

    $response->assertStatus(200);
    expect(DB::table('issues')->whereIn('id', [$issue1Id, $issue2Id])->pluck('assignee_id')->unique()->all())
        ->toBe([(int) $assignee->id]);
});

it('returns more than 15 issues when limit=500 is passed to workspace issues endpoint', function () {
    $groupId = (string) Str::uuid();
    $user = UserModel::factory()->create(['org_unit_id' => $groupId]);
    $workspace = WorkspaceModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Pagination Workspace',
        'owner_group_id' => $groupId,
        'status' => 'ACTIVE',
    ]);
    $project = ProjectModel::create([
        'id' => (string) Str::uuid(),
        'workspace_id' => $workspace->id,
        'key' => 'PAG',
        'name' => 'Pagination Project',
        'status' => 'ACTIVE',
    ]);
    $status = StatusModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'To Do',
        'slug' => 'to-do-pag',
        'category' => 'TODO',
    ]);
    $typeId = (string) Str::uuid();
    DB::table('issue_types')->insert([
        'id' => $typeId,
        'name' => 'Task',
        'slug' => 'task-pag',
        'icon' => 'check',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $priorityId = (string) Str::uuid();
    DB::table('priorities')->insert([
        'id' => $priorityId,
        'name' => 'Medium',
        'slug' => 'medium-pag',
        'level' => 2,
        'color' => '#fbbf24',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $rows = [];
    for ($i = 1; $i <= 20; $i++) {
        $rows[] = [
            'id' => (string) Str::uuid(),
            'project_id' => $project->id,
            'issue_type_id' => $typeId,
            'status_id' => $status->id,
            'priority_id' => $priorityId,
            'number' => $i,
            'title' => "Issue $i",
            'reporter_id' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
    DB::table('issues')->insert($rows);

    $response = $this->actingAs($user)->getJson("/api/workspaces/{$workspace->id}/issues?limit=500");

    $response->assertStatus(200);
    expect($response->json('data'))->toHaveCount(20);
});

it('saves assignee_id on issue creation when provided and enforces context-aware RBAC on workspace issues and project page', function () {
    $ownerGroupId = (string) Str::uuid();
    $externalGroupId = (string) Str::uuid();

    $creator = UserModel::factory()->create(['org_unit_id' => $ownerGroupId]);
    $assignee = UserModel::factory()->create(['org_unit_id' => $ownerGroupId]);
    $outsider = UserModel::factory()->create(['org_unit_id' => $externalGroupId]);

    $role = RoleModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Superadmin',
        'display_name' => 'Superadmin',
    ]);
    UserRoleModel::create([
        'user_id' => $creator->id,
        'role_id' => $role->id,
    ]);

    $workspace = WorkspaceModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Division A Workspace',
        'owner_group_id' => $ownerGroupId,
        'status' => 'ACTIVE',
    ]);
    $workflowId = (string) Str::uuid();
    DB::table('workflows')->insert([
        'id' => $workflowId,
        'name' => 'Default Workflow',
        'is_default' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $project = ProjectModel::create([
        'id' => (string) Str::uuid(),
        'workspace_id' => $workspace->id,
        'workflow_id' => $workflowId,
        'key' => 'DVA',
        'name' => 'Division A Secret Project',
        'status' => 'ACTIVE',
    ]);
    $status = StatusModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'To Do',
        'slug' => 'to-do-dva',
        'category' => 'TODO',
    ]);
    DB::table('workflow_transitions')->insert([
        'id' => (string) Str::uuid(),
        'workflow_id' => $workflowId,
        'from_status_id' => null,
        'to_status_id' => $status->id,
        'name' => 'Create',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $typeId = (string) Str::uuid();
    DB::table('issue_types')->insert([
        'id' => $typeId,
        'name' => 'Task',
        'slug' => 'task-dva',
        'icon' => 'check',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $priorityId = (string) Str::uuid();
    DB::table('priorities')->insert([
        'id' => $priorityId,
        'name' => 'High',
        'slug' => 'high-dva',
        'level' => 3,
        'color' => '#ef4444',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $createResponse = $this->actingAs($creator)->postJson('/api/issues', [
        'project_id' => $project->id,
        'title' => 'Assigned on Create',
        'issue_type_id' => $typeId,
        'priority_id' => $priorityId,
        'assignee_id' => (string) $assignee->id,
    ]);

    $createResponse->assertStatus(201);
    expect($createResponse->json('data.assignee.id'))->toBe((int) $assignee->id);

    // Outsider from another division cannot see Division A's issues or open Division A's project page
    $outsiderIssues = $this->actingAs($outsider)->getJson("/api/workspaces/{$workspace->id}/issues");
    $outsiderIssues->assertStatus(200);
    expect($outsiderIssues->json('data'))->toHaveCount(0);

    $this->actingAs($outsider)->get("/projects/{$project->id}")->assertStatus(403);
});

it('allows user with Superadmin role and non-default email to pass WorkspacePolicy', function () {
    $superadmin = UserModel::factory()->create(['email' => 'custom-admin@company.id']);
    $role = RoleModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Superadmin',
        'display_name' => 'Superadmin',
    ]);
    UserRoleModel::create([
        'user_id' => $superadmin->id,
        'role_id' => $role->id,
    ]);

    $workspace = WorkspaceModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'External Division Workspace',
        'owner_group_id' => (string) Str::uuid(),
        'status' => 'ACTIVE',
    ]);

    $this->actingAs($superadmin)
        ->getJson("/api/workspaces/{$workspace->id}/members")
        ->assertStatus(200);
});

it('enforces context-scoped permissions without global leakage and protects Superadmin role from deletion', function () {
    $superadmin = UserModel::factory()->create();
    $member = UserModel::factory()->create();

    $superadminRole = RoleModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Superadmin',
        'scope' => 'GLOBAL',
    ]);
    UserRoleModel::create([
        'user_id' => $superadmin->id,
        'role_id' => $superadminRole->id,
    ]);

    $projectRole = RoleModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Project Manager',
        'scope' => 'PROJECT',
    ]);
    $permissionId = (string) Str::uuid();
    DB::table('permissions')->insert([
        'id' => $permissionId,
        'name' => 'sprints:manage',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('role_permissions')->insert([
        'role_id' => $projectRole->id,
        'permission_id' => $permissionId,
    ]);

    $projectId = (string) Str::uuid();

    $assignResponse = $this->actingAs($superadmin)->postJson('/api/rbac/user-roles/assign', [
        'user_id' => $member->id,
        'role_id' => $projectRole->id,
        'context_type' => 'project',
        'context_id' => $projectId,
    ]);
    $assignResponse->assertStatus(200);

    $stored = DB::table('user_roles')
        ->where('user_id', $member->id)
        ->where('role_id', $projectRole->id)
        ->first();

    expect($stored->context_type)->toBe('PROJECT');
    expect($member->fresh()->hasPermission('sprints:manage', 'PROJECT', $projectId))->toBeTrue();
    expect($member->fresh()->hasPermission('sprints:manage'))->toBeFalse();

    $deleteResponse = $this->actingAs($superadmin)->deleteJson("/api/rbac/roles/{$superadminRole->id}");
    $deleteResponse->assertStatus(422);

    // Backfill migration test: lowercase row normalized + duplicate lowercase row deduplicated
    $workspaceId = (string) Str::uuid();
    DB::table('user_roles')->insert([
        [
            'id' => (string) Str::uuid(),
            'user_id' => $member->id,
            'role_id' => $projectRole->id,
            'context_type' => 'workspace',
            'context_id' => $workspaceId,
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => (string) Str::uuid(),
            'user_id' => $member->id,
            'role_id' => $projectRole->id,
            'context_type' => 'project',
            'context_id' => $projectId,
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    $migration = require base_path('database/migrations/2026_10_13_123500_normalize_user_roles_context_type_case.php');
    $migration->up();

    expect(
        DB::table('user_roles')
            ->where('user_id', $member->id)
            ->where('context_id', $workspaceId)
            ->value('context_type')
    )->toBe('WORKSPACE');

    expect(
        DB::table('user_roles')
            ->where('user_id', $member->id)
            ->where('context_id', $projectId)
            ->count()
    )->toBe(1);
});

it('serves real user-scoped metrics and tasks on /dashboard and workspace lookups on /issues', function () {
    $groupId = (string) Str::uuid();
    $user = UserModel::factory()->create(['org_unit_id' => $groupId]);
    $otherUser = UserModel::factory()->create(['org_unit_id' => $groupId]);

    $workspace = WorkspaceModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Dashboard Workspace',
        'owner_group_id' => $groupId,
        'status' => 'ACTIVE',
    ]);
    $project = ProjectModel::create([
        'id' => (string) Str::uuid(),
        'workspace_id' => $workspace->id,
        'key' => 'DSH',
        'name' => 'Dashboard Project',
        'status' => 'ACTIVE',
    ]);
    $todoStatus = StatusModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'To Do',
        'slug' => 'to-do-dsh',
        'category' => 'TODO',
    ]);
    $doneStatus = StatusModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Done',
        'slug' => 'done-dsh',
        'category' => 'DONE',
    ]);
    $typeId = (string) Str::uuid();
    DB::table('issue_types')->insert([
        'id' => $typeId,
        'name' => 'Task',
        'slug' => 'task-dsh',
        'icon' => 'check',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $priorityId = (string) Str::uuid();
    DB::table('priorities')->insert([
        'id' => $priorityId,
        'name' => 'High',
        'slug' => 'high-dsh',
        'level' => 3,
        'color' => '#ef4444',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $myOpenIssueId = (string) Str::uuid();
    DB::table('issues')->insert([
        [
            'id' => $myOpenIssueId,
            'project_id' => $project->id,
            'issue_type_id' => $typeId,
            'status_id' => $todoStatus->id,
            'priority_id' => $priorityId,
            'number' => 1,
            'title' => 'My Overdue Task',
            'reporter_id' => $user->id,
            'assignee_id' => $user->id,
            'due_date' => now()->subDay()->toDateString(),
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => (string) Str::uuid(),
            'project_id' => $project->id,
            'issue_type_id' => $typeId,
            'status_id' => $doneStatus->id,
            'priority_id' => $priorityId,
            'number' => 2,
            'title' => 'Other User Done Task',
            'reporter_id' => $otherUser->id,
            'assignee_id' => $otherUser->id,
            'due_date' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    DB::table('issue_histories')->insert([
        'id' => (string) Str::uuid(),
        'issue_id' => $myOpenIssueId,
        'actor_id' => $user->id,
        'field_changed' => 'status_id',
        'old_value' => 'Backlog',
        'new_value' => 'To Do',
        'created_at' => now(),
    ]);

    $dashboardResponse = $this->actingAs($user)->get('/dashboard');
    $dashboardResponse->assertStatus(200);
    $dashboardProps = $dashboardResponse->viewData('page')['props'];

    expect($dashboardProps['stats']['active_projects'])->toBe(1);
    expect($dashboardProps['stats']['total_issues'])->toBe(2);
    expect($dashboardProps['stats']['completed_issues'])->toBe(1);
    expect($dashboardProps['stats']['completion_rate'])->toBe(50);
    expect($dashboardProps['stats']['my_open_tasks'])->toBe(1);
    expect($dashboardProps['stats']['overdue_tasks'])->toBe(1);
    expect($dashboardProps['my_tasks'])->toHaveCount(1);
    expect($dashboardProps['my_tasks'][0]['key'])->toBe('DSH-1');
    expect($dashboardProps['my_tasks'][0]['urgency'])->toBe('overdue');
    expect($dashboardProps['recent_activities'])->toHaveCount(1);
    expect($dashboardProps['recent_activities'][0]['action_type'])->toBe('status_id');

    $issuesResponse = $this->actingAs($user)->get('/issues');
    $issuesResponse->assertStatus(200);
    $issuesProps = $issuesResponse->viewData('page')['props'];

    expect($issuesProps['workspace_id'])->toBe($workspace->id);
    expect($issuesProps['lookups'])->toHaveKeys(['projects', 'issueTypes', 'priorities', 'statuses', 'users']);
});

it('matches PIC by employee_id and email during import and queues notification mail on issue assignment', function () {
    Mail::fake();

    $reporter = UserModel::factory()->create();
    $userByNip = UserModel::factory()->create([
        'employee_id' => 'EMP-998877',
        'email' => 'nip_user@example.com',
        'name' => 'John NIP',
    ]);
    $userByEmail = UserModel::factory()->create([
        'employee_id' => 'EMP-112233',
        'email' => 'email_user@example.com',
        'name' => 'Jane Email',
    ]);

    $workspace = WorkspaceModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Multi Identifier Workspace',
        'owner_group_id' => (string) Str::uuid(),
        'status' => 'ACTIVE',
    ]);
    ProjectModel::create([
        'id' => (string) Str::uuid(),
        'workspace_id' => $workspace->id,
        'key' => 'MID',
        'name' => 'Multi ID Project',
        'status' => 'ACTIVE',
    ]);

    DB::table('issue_types')->insert([
        'id' => (string) Str::uuid(),
        'name' => 'Task',
        'slug' => 'task-mid',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('priorities')->insert([
        'id' => (string) Str::uuid(),
        'name' => 'Medium',
        'slug' => 'med-mid',
        'level' => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('statuses')->insert([
        'id' => (string) Str::uuid(),
        'name' => 'To Do',
        'slug' => 'todo-mid',
        'category' => 'TODO',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $useCase = app(ImportIssuesUseCase::class);
    $useCase->execute(collect([
        [
            'project' => 'Multi ID Project',
            'task' => 'NIP Task',
            'pic' => 'EMP-998877',
        ],
        [
            'project' => 'Multi ID Project',
            'task' => 'Email Task',
            'pic' => 'email_user@example.com',
        ],
    ]), (string) $reporter->id);

    $nipIssue = DB::table('issues')->where('title', 'NIP Task')->first();
    $emailIssue = DB::table('issues')->where('title', 'Email Task')->first();

    expect($nipIssue)->not->toBeNull()
        ->and((int) $nipIssue->assignee_id)->toBe((int) $userByNip->id);
    expect($emailIssue)->not->toBeNull()
        ->and((int) $emailIssue->assignee_id)->toBe((int) $userByEmail->id);

    event(new IssueAssigned(
        issueId: (string) $nipIssue->id,
        issueNumber: 'MID-1',
        assigneeId: $userByNip->id,
        actorId: $reporter->id,
        occurredAt: new DateTimeImmutable()
    ));

    Mail::assertQueued(IssueAssignedMail::class, function (IssueAssignedMail $mail) use ($userByNip) {
        return $mail->hasTo($userByNip->email)
            && $mail->issueNumber === 'MID-1'
            && $mail->assigneeName === $userByNip->name;
    });
});

it('forbids user from Division B without access from viewing Division A project and issue sub-endpoints', function () {
    $divA = (string) Str::uuid();
    $divB = (string) Str::uuid();

    $userB = UserModel::factory()->create(['org_unit_id' => $divB]);

    $role = RoleModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Member-DivB',
        'scope' => 'GLOBAL',
    ]);
    $permId = (string) Str::uuid();
    DB::table('permissions')->insert([
        'id' => $permId,
        'name' => 'issues:view',
        'description' => 'View Issues',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('role_permissions')->insert([
        'role_id' => $role->id,
        'permission_id' => $permId,
    ]);
    UserRoleModel::create([
        'user_id' => $userB->id,
        'role_id' => $role->id,
    ]);

    $userA = UserModel::factory()->create(['org_unit_id' => $divA]);

    $workspaceA = WorkspaceModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Division A Workspace',
        'owner_group_id' => $divA,
        'status' => 'ACTIVE',
    ]);
    $projectA = ProjectModel::create([
        'id' => (string) Str::uuid(),
        'workspace_id' => $workspaceA->id,
        'key' => 'DIVA',
        'name' => 'Division A Project',
        'status' => 'ACTIVE',
    ]);

    $issueId = (string) Str::uuid();
    $typeId = (string) Str::uuid();
    DB::table('issue_types')->insert([
        'id' => $typeId,
        'name' => 'Task',
        'slug' => 'task-diva',
        'icon' => 'check',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $statusId = (string) Str::uuid();
    DB::table('statuses')->insert([
        'id' => $statusId,
        'name' => 'To Do',
        'slug' => 'todo-diva',
        'category' => 'TODO',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $priorityId = (string) Str::uuid();
    DB::table('priorities')->insert([
        'id' => $priorityId,
        'name' => 'Medium',
        'slug' => 'med-diva',
        'level' => 2,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('issues')->insert([
        'id' => $issueId,
        'project_id' => $projectA->id,
        'issue_type_id' => $typeId,
        'status_id' => $statusId,
        'priority_id' => $priorityId,
        'number' => 1,
        'title' => 'Project A Issue',
        'reporter_id' => $userA->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->actingAs($userB)->getJson("/api/projects/{$projectA->id}/board")->assertStatus(403);
    $this->actingAs($userB)->getJson("/api/projects/{$projectA->id}/backlog")->assertStatus(403);
    $this->actingAs($userB)->getJson("/api/projects/{$projectA->id}/issues")->assertStatus(403);
    $this->actingAs($userB)->getJson("/api/issues/{$issueId}")->assertStatus(403);
    $this->actingAs($userB)->getJson("/api/issues/{$issueId}/timeline")->assertStatus(403);
});

it('enforces org unit workspace quota and automatic creator ownership', function () {
    $levelId = (string) Str::uuid();
    DB::table('org_levels')->insert([
        'id' => $levelId, 'slug' => 'divisi-level', 'name' => 'Divisi', 'depth' => 1, 'can_own_workspace' => true,
    ]);

    // Unit 1: DWH (max_workspaces = 0, cannot create)
    $dwhId = (string) Str::uuid();
    DB::table('org_units')->insert([
        'id' => $dwhId, 'org_level_id' => $levelId, 'name' => 'Big Data & Datawarehouse', 'code' => 'TEST_DWH', 'max_workspaces' => 0,
    ]);

    // Unit 2: TMDP (max_workspaces = 1, can create 1)
    $tmdpId = (string) Str::uuid();
    DB::table('org_units')->insert([
        'id' => $tmdpId, 'org_level_id' => $levelId, 'name' => 'Manajemen Data Perusahaan', 'code' => 'TEST_TMDP', 'max_workspaces' => 1,
    ]);

    $userDwh = UserModel::factory()->create(['org_unit_id' => $dwhId]);
    $userTmdp = UserModel::factory()->create(['org_unit_id' => $tmdpId]);

    // Give both users workspaces:manage permission
    $role = RoleModel::create(['id' => (string) Str::uuid(), 'name' => 'Manager Role', 'scope' => 'GLOBAL']);
    $permId = (string) Str::uuid();
    DB::table('permissions')->insertOrIgnore(['id' => $permId, 'name' => 'workspaces:manage']);
    $perm = DB::table('permissions')->where('name', 'workspaces:manage')->first();
    DB::table('role_permissions')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);
    UserRoleModel::create(['id' => (string) Str::uuid(), 'user_id' => $userDwh->id, 'role_id' => $role->id]);
    UserRoleModel::create(['id' => (string) Str::uuid(), 'user_id' => $userTmdp->id, 'role_id' => $role->id]);

    // DWH tries to create -> fails with 422
    $this->actingAs($userDwh)->postJson('/api/workspaces', ['name' => 'DWH Workspace'])
        ->assertStatus(422)
        ->assertJsonFragment(['message' => 'Workspace limit of 0 reached. Unit organisasi Anda tidak memiliki kuota untuk membuat workspace baru. Silakan hubungi Administrator.']);

    // TMDP creates first workspace -> 201 Created and auto-assigned as owner
    $resp1 = $this->actingAs($userTmdp)->postJson('/api/workspaces', ['name' => 'TMDP Data Platform'])
        ->assertStatus(201);
    $wsId = $resp1->json('id');

    // Assert user is in workspace_members with role 'admin'
    $this->assertDatabaseHas('workspace_members', [
        'workspace_id' => $wsId,
        'user_id' => $userTmdp->id,
        'role' => 'admin',
    ]);

    // TMDP tries to create 2nd workspace -> fails with 422 quota reached
    $this->actingAs($userTmdp)->postJson('/api/workspaces', ['name' => 'TMDP Workspace 2'])
        ->assertStatus(422);
});

it('supports hierarchical workspace visibility for parent (DTI) and child (DWH) units', function () {
    $levelId = (string) Str::uuid();
    DB::table('org_levels')->insert([
        'id' => $levelId, 'slug' => 'test-levels', 'name' => 'Level', 'depth' => 1, 'can_own_workspace' => true,
    ]);

    $dtiId = (string) Str::uuid();
    $tmdpId = (string) Str::uuid();
    $dwhId = (string) Str::uuid();
    $miiId = (string) Str::uuid();

    DB::table('org_units')->insert([
        ['id' => $dtiId, 'parent_id' => null, 'org_level_id' => $levelId, 'name' => 'Divisi TI', 'code' => 'H_DTI', 'max_workspaces' => 0],
        ['id' => $tmdpId, 'parent_id' => $dtiId, 'org_level_id' => $levelId, 'name' => 'TMDP', 'code' => 'H_TMDP', 'max_workspaces' => 1],
        ['id' => $dwhId, 'parent_id' => $tmdpId, 'org_level_id' => $levelId, 'name' => 'DWH', 'code' => 'H_DWH', 'max_workspaces' => 0],
        ['id' => $miiId, 'parent_id' => null, 'org_level_id' => $levelId, 'name' => 'MII Vendor', 'code' => 'H_MII', 'max_workspaces' => 1],
    ]);

    // Populate org_unit_closures
    DB::table('org_unit_closures')->insert([
        ['ancestor_id' => $dtiId, 'descendant_id' => $dtiId, 'depth' => 0],
        ['ancestor_id' => $dtiId, 'descendant_id' => $tmdpId, 'depth' => 1],
        ['ancestor_id' => $dtiId, 'descendant_id' => $dwhId, 'depth' => 2],
        ['ancestor_id' => $tmdpId, 'descendant_id' => $tmdpId, 'depth' => 0],
        ['ancestor_id' => $tmdpId, 'descendant_id' => $dwhId, 'depth' => 1],
        ['ancestor_id' => $dwhId, 'descendant_id' => $dwhId, 'depth' => 0],
        ['ancestor_id' => $miiId, 'descendant_id' => $miiId, 'depth' => 0],
    ]);

    $wsTmdpId = (string) Str::uuid();
    $wsMiiId = (string) Str::uuid();

    DB::table('workspaces')->insert([
        ['id' => $wsTmdpId, 'owner_group_id' => $tmdpId, 'name' => 'TMDP Shared Platform', 'status' => 'ACTIVE', 'created_at' => now(), 'updated_at' => now()],
        ['id' => $wsMiiId, 'owner_group_id' => $miiId, 'name' => 'MII ML Platform', 'status' => 'ACTIVE', 'created_at' => now(), 'updated_at' => now()],
    ]);

    $query = app(\App\Modules\Workload\Application\Queries\GetWorkspacesByGroupQuery::class);

    // 1. Pimdiv DTI sees TMDP workspace (as descendant) but NOT MII
    $dtiWorkspaces = collect($query->execute($dtiId, 999))->pluck('id')->all();
    expect($dtiWorkspaces)->toContain($wsTmdpId)->not->toContain($wsMiiId);

    // 2. DWH team sees TMDP workspace (as ancestor) but NOT MII
    $dwhWorkspaces = collect($query->execute($dwhId, 888))->pluck('id')->all();
    expect($dwhWorkspaces)->toContain($wsTmdpId)->not->toContain($wsMiiId);

    // 3. MII only sees MII workspace
    $miiWorkspaces = collect($query->execute($miiId, 777))->pluck('id')->all();
    expect($miiWorkspaces)->toContain($wsMiiId)->not->toContain($wsTmdpId);
});

it('blocks IDOR when user from Unit B attempts to rename or archive Unit A workspace', function () {
    $unitA = (string) Str::uuid();
    $unitB = (string) Str::uuid();

    $userA = UserModel::factory()->create(['org_unit_id' => $unitA]);
    $userB = UserModel::factory()->create(['org_unit_id' => $unitB]);

    // Give userB workspaces:manage permission so they pass FormRequest authorization
    $role = RoleModel::create(['id' => (string) Str::uuid(), 'name' => 'Manager Role B', 'scope' => 'GLOBAL']);
    $permId = (string) Str::uuid();
    DB::table('permissions')->insertOrIgnore(['id' => $permId, 'name' => 'workspaces:manage']);
    $perm = DB::table('permissions')->where('name', 'workspaces:manage')->first();
    DB::table('role_permissions')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);
    UserRoleModel::create(['id' => (string) Str::uuid(), 'user_id' => $userB->id, 'role_id' => $role->id]);

    $workspaceA = WorkspaceModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Unit A Workspace',
        'owner_group_id' => $unitA,
        'status' => 'ACTIVE',
    ]);

    // User B tries to rename Unit A's workspace -> 403 Forbidden
    $this->actingAs($userB)
        ->putJson("/api/workspaces/{$workspaceA->id}", ['name' => 'Hacked Workspace Name'])
        ->assertStatus(403);

    // User B tries to archive Unit A's workspace -> 403 Forbidden
    $this->actingAs($userB)
        ->deleteJson("/api/workspaces/{$workspaceA->id}")
        ->assertStatus(403);

    // Verify workspace was not changed
    expect(WorkspaceModel::find($workspaceA->id)->name)->toBe('Unit A Workspace');
    expect(WorkspaceModel::find($workspaceA->id)->status)->toBe('ACTIVE');
});

it('releases workspace quota upon archival allowing department with limit 1 to create new workspace', function () {
    $levelId = (string) Str::uuid();
    DB::table('org_levels')->insert([
        'id' => $levelId, 'slug' => 'div-level-quota', 'name' => 'Divisi', 'depth' => 1, 'can_own_workspace' => true,
    ]);

    $unitId = (string) Str::uuid();
    DB::table('org_units')->insert([
        'id' => $unitId, 'org_level_id' => $levelId, 'name' => 'Unit Quota Test', 'code' => 'U_QUOTA', 'max_workspaces' => 1,
    ]);

    $user = UserModel::factory()->create(['org_unit_id' => $unitId]);

    $role = RoleModel::create(['id' => (string) Str::uuid(), 'name' => 'Quota Manager Role', 'scope' => 'GLOBAL']);
    $permId = (string) Str::uuid();
    DB::table('permissions')->insertOrIgnore(['id' => $permId, 'name' => 'workspaces:manage']);
    $perm = DB::table('permissions')->where('name', 'workspaces:manage')->first();
    DB::table('role_permissions')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);
    UserRoleModel::create(['id' => (string) Str::uuid(), 'user_id' => $user->id, 'role_id' => $role->id]);

    // 1. Create first workspace -> 201 Created
    $resp1 = $this->actingAs($user)->postJson('/api/workspaces', ['name' => 'First Workspace'])
        ->assertStatus(201);
    $wsId = $resp1->json('id');

    // 2. Second workspace creation blocked by quota limit
    $this->actingAs($user)->postJson('/api/workspaces', ['name' => 'Second Workspace'])
        ->assertStatus(422);

    // 3. Archive first workspace -> 200 OK
    $this->actingAs($user)->deleteJson("/api/workspaces/{$wsId}")
        ->assertStatus(200);

    // 4. Second workspace creation now succeeds because quota was released
    $resp2 = $this->actingAs($user)->postJson('/api/workspaces', ['name' => 'Second Workspace After Archival'])
        ->assertStatus(201);

    expect($resp2->json('id'))->not->toBeNull();
});

it('allows parent unit (DTI) to pass WorkspacePolicy view for child unit (TMDP) workspace', function () {
    $levelId = (string) Str::uuid();
    DB::table('org_levels')->insert([
        'id' => $levelId, 'slug' => 'hierarchy-level', 'name' => 'Level', 'depth' => 1, 'can_own_workspace' => true,
    ]);

    $dtiId = (string) Str::uuid();
    $tmdpId = (string) Str::uuid();

    DB::table('org_units')->insert([
        ['id' => $dtiId, 'parent_id' => null, 'org_level_id' => $levelId, 'name' => 'Divisi TI', 'code' => 'H_DTI_POL', 'max_workspaces' => 0],
        ['id' => $tmdpId, 'parent_id' => $dtiId, 'org_level_id' => $levelId, 'name' => 'TMDP', 'code' => 'H_TMDP_POL', 'max_workspaces' => 1],
    ]);

    DB::table('org_unit_closures')->insert([
        ['ancestor_id' => $dtiId, 'descendant_id' => $dtiId, 'depth' => 0],
        ['ancestor_id' => $dtiId, 'descendant_id' => $tmdpId, 'depth' => 1],
        ['ancestor_id' => $tmdpId, 'descendant_id' => $tmdpId, 'depth' => 0],
    ]);

    $parentUser = UserModel::factory()->create(['org_unit_id' => $dtiId]);

    $childWorkspace = WorkspaceModel::create([
        'id' => (string) Str::uuid(),
        'owner_group_id' => $tmdpId,
        'name' => 'TMDP Child Workspace',
        'status' => 'ACTIVE',
    ]);

    $policy = app(\App\Modules\Workload\Infrastructure\Auth\Policies\WorkspacePolicy::class);

    expect($policy->view($parentUser, $childWorkspace))->toBeTrue();
    expect($policy->update($parentUser, $childWorkspace))->toBeTrue();
});

it('blocks subordinate child unit (DWH) from updating or archiving parent (TMDP) workspace', function () {
    $levelId = (string) Str::uuid();
    DB::table('org_levels')->insert([
        'id' => $levelId, 'slug' => 'child-sec-level', 'name' => 'Level', 'depth' => 1, 'can_own_workspace' => true,
    ]);

    $tmdpId = (string) Str::uuid();
    $dwhId = (string) Str::uuid();

    DB::table('org_units')->insert([
        ['id' => $tmdpId, 'parent_id' => null, 'org_level_id' => $levelId, 'name' => 'TMDP', 'code' => 'P_TMDP', 'max_workspaces' => 1],
        ['id' => $dwhId, 'parent_id' => $tmdpId, 'org_level_id' => $levelId, 'name' => 'DWH', 'code' => 'C_DWH', 'max_workspaces' => 0],
    ]);

    DB::table('org_unit_closures')->insert([
        ['ancestor_id' => $tmdpId, 'descendant_id' => $tmdpId, 'depth' => 0],
        ['ancestor_id' => $tmdpId, 'descendant_id' => $dwhId, 'depth' => 1],
        ['ancestor_id' => $dwhId, 'descendant_id' => $dwhId, 'depth' => 0],
    ]);

    $childUser = UserModel::factory()->create(['org_unit_id' => $dwhId]);

    // Give childUser workspaces:manage permission
    $role = RoleModel::create(['id' => (string) Str::uuid(), 'name' => 'Child Manager', 'scope' => 'GLOBAL']);
    $permId = (string) Str::uuid();
    DB::table('permissions')->insertOrIgnore(['id' => $permId, 'name' => 'workspaces:manage']);
    $perm = DB::table('permissions')->where('name', 'workspaces:manage')->first();
    DB::table('role_permissions')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);
    UserRoleModel::create(['id' => (string) Str::uuid(), 'user_id' => $childUser->id, 'role_id' => $role->id]);

    $parentWorkspace = WorkspaceModel::create([
        'id' => (string) Str::uuid(),
        'owner_group_id' => $tmdpId,
        'name' => 'TMDP Master Workspace',
        'status' => 'ACTIVE',
    ]);

    // Child unit user CANNOT rename parent workspace -> 403 Forbidden
    $this->actingAs($childUser)
        ->putJson("/api/workspaces/{$parentWorkspace->id}", ['name' => 'Hacked TMDP'])
        ->assertStatus(403);

    // Child unit user CANNOT archive parent workspace -> 403 Forbidden
    $this->actingAs($childUser)
        ->deleteJson("/api/workspaces/{$parentWorkspace->id}")
        ->assertStatus(403);

    // Policy check: child unit user cannot update/delete parent workspace
    $policy = app(\App\Modules\Workload\Infrastructure\Auth\Policies\WorkspacePolicy::class);
    expect($policy->update($childUser, $parentWorkspace))->toBeFalse();
    expect($policy->delete($childUser, $parentWorkspace))->toBeFalse();
});

it('rejects workspace creation when user has no assigned org_unit_id', function () {
    $userWithoutUnit = UserModel::factory()->create(['org_unit_id' => null]);

    $role = RoleModel::create(['id' => (string) Str::uuid(), 'name' => 'Floating Manager', 'scope' => 'GLOBAL']);
    $permId = (string) Str::uuid();
    DB::table('permissions')->insertOrIgnore(['id' => $permId, 'name' => 'workspaces:manage']);
    $perm = DB::table('permissions')->where('name', 'workspaces:manage')->first();
    DB::table('role_permissions')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);
    UserRoleModel::create(['id' => (string) Str::uuid(), 'user_id' => $userWithoutUnit->id, 'role_id' => $role->id]);

    $this->actingAs($userWithoutUnit)
        ->postJson('/api/workspaces', ['name' => 'Orphan Workspace'])
        ->assertStatus(422)
        ->assertJsonFragment(['message' => 'User belum terdaftar pada unit organisasi. Hubungi Administrator.']);
});

it('returns 404 when superadmin updates or archives a non-existent workspace', function () {
    $superadmin = UserModel::factory()->create(['email' => 'superadmin@wlms.com']);
    $fakeId = (string) Str::uuid();

    $this->actingAs($superadmin)
        ->putJson("/api/workspaces/{$fakeId}", ['name' => 'New Name'])
        ->assertStatus(404);

    $this->actingAs($superadmin)
        ->deleteJson("/api/workspaces/{$fakeId}")
        ->assertStatus(404);
});

it('authorizes project lookups for users with project-level access and blocks outsiders', function () {
    $ownerGroupId = (string) Str::uuid();
    $outsiderGroupId = (string) Str::uuid();

    $lead = UserModel::factory()->create(['org_unit_id' => $ownerGroupId]);
    $guest = UserModel::factory()->create(['org_unit_id' => $outsiderGroupId]);
    $outsider = UserModel::factory()->create(['org_unit_id' => $outsiderGroupId]);

    $workspace = WorkspaceModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Project Lookups Workspace',
        'owner_group_id' => $ownerGroupId,
        'status' => 'ACTIVE',
    ]);

    $workflowId = (string) Str::uuid();
    DB::table('workflows')->insert([
        'id' => $workflowId,
        'name' => 'Workflow Lookups',
        'is_default' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $project = ProjectModel::create([
        'id' => (string) Str::uuid(),
        'workspace_id' => $workspace->id,
        'workflow_id' => $workflowId,
        'key' => 'LKUP',
        'name' => 'Project Lookups Test',
        'status' => 'ACTIVE',
        'lead_id' => $lead->id,
    ]);

    // Give guest project-level role in user_roles
    $role = RoleModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Project Guest Role',
        'scope' => 'PROJECT',
    ]);
    UserRoleModel::create([
        'id' => (string) Str::uuid(),
        'user_id' => $guest->id,
        'role_id' => $role->id,
        'context_type' => 'PROJECT',
        'context_id' => $project->id,
    ]);

    // Outsider has no access -> 403 Forbidden
    $this->actingAs($outsider)
        ->getJson("/api/projects/{$project->id}/lookups")
        ->assertStatus(403);

    // Guest has PROJECT role in user_roles -> 200 OK
    $this->actingAs($guest)
        ->getJson("/api/projects/{$project->id}/lookups")
        ->assertStatus(200);
});

test('user with Workspace Owner role scoped as WORKSPACE can create workspace for their unit', function () {
    $levelId = (string) Str::uuid();
    DB::table('org_levels')->insert([
        'id' => $levelId,
        'slug' => 'vendor-level',
        'name' => 'Vendor Level',
        'depth' => 1,
        'can_own_workspace' => true,
    ]);

    $vendorUnitId = (string) Str::uuid();
    DB::table('org_units')->insert([
        'id' => $vendorUnitId,
        'org_level_id' => $levelId,
        'name' => 'Mitra Integrasi Informatika Test',
        'code' => 'MII_TEST',
        'max_workspaces' => 1,
    ]);

    $vendorUser = UserModel::factory()->create(['org_unit_id' => $vendorUnitId]);

    // Role Workspace Owner with scope workspace and permission workspaces:manage
    $role = RoleModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Workspace Owner',
        'scope' => 'workspace',
    ]);
    $permId = (string) Str::uuid();
    DB::table('permissions')->insertOrIgnore(['id' => $permId, 'name' => 'workspaces:manage']);
    $perm = DB::table('permissions')->where('name', 'workspaces:manage')->first();
    DB::table('role_permissions')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);

    // Assign to user with context_type WORKSPACE
    UserRoleModel::create([
        'id' => (string) Str::uuid(),
        'user_id' => $vendorUser->id,
        'role_id' => $role->id,
        'context_type' => 'WORKSPACE',
        'context_id' => null,
    ]);

    // Vendor user can successfully create workspace
    $response = $this->actingAs($vendorUser)
        ->postJson('/api/workspaces', ['name' => 'MII Workspace Test'])
        ->assertStatus(201);

    expect($response->json('name'))->toBe('MII Workspace Test')
        ->and($response->json('owner_group_id'))->toBe($vendorUnitId);

    // Vendor user can fetch projects for their workspace without 403
    $workspaceId = $response->json('id');
    $this->actingAs($vendorUser)
        ->getJson("/api/workspaces/{$workspaceId}/projects")
        ->assertStatus(200);
});




