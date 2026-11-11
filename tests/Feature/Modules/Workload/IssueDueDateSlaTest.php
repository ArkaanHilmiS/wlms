<?php

declare(strict_types=1);

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\RoleModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\SprintModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->levelId = Str::uuid()->toString();
    DB::table('org_levels')->insert([
        'id' => $this->levelId,
        'slug' => 'group',
        'name' => 'Group',
        'depth' => 1,
        'can_own_workspace' => true,
    ]);

    $this->groupId = Str::uuid()->toString();
    DB::table('org_units')->insert([
        'id' => $this->groupId,
        'org_level_id' => $this->levelId,
        'name' => 'IT Group',
    ]);

    $this->workspaceId = Str::uuid()->toString();
    DB::table('workspaces')->insert([
        'id' => $this->workspaceId,
        'owner_group_id' => $this->groupId,
        'name' => 'SLA Workspace',
        'status' => 'ACTIVE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->workflowId = Str::uuid()->toString();
    DB::table('workflows')->insert([
        'id' => $this->workflowId,
        'name' => 'Default Workflow',
        'is_default' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->projectId = Str::uuid()->toString();
    DB::table('projects')->insert([
        'id' => $this->projectId,
        'workspace_id' => $this->workspaceId,
        'workflow_id' => $this->workflowId,
        'key' => 'SLA',
        'name' => 'SLA Project',
        'status' => 'ACTIVE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->issueTypeId = Str::uuid()->toString();
    DB::table('issue_types')->insert([
        'id' => $this->issueTypeId,
        'name' => 'Task',
        'slug' => 'task',
        'icon' => 'task-icon',
        'color' => '#ffffff',
        'sort_order' => 1,
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->priorityId = Str::uuid()->toString();
    DB::table('priorities')->insert([
        'id' => $this->priorityId,
        'name' => 'High',
        'slug' => 'high',
        'color' => '#ff0000',
        'level' => 1,
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->todoStatusId = Str::uuid()->toString();
    DB::table('statuses')->insert([
        'id' => $this->todoStatusId,
        'name' => 'To Do',
        'slug' => 'todo',
        'category' => 'TODO',
        'color' => '#94a3b8',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->inProgressStatusId = Str::uuid()->toString();
    DB::table('statuses')->insert([
        'id' => $this->inProgressStatusId,
        'name' => 'In Progress',
        'slug' => 'in-progress',
        'category' => 'IN_PROGRESS',
        'color' => '#3b82f6',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->doneStatusId = Str::uuid()->toString();
    DB::table('statuses')->insert([
        'id' => $this->doneStatusId,
        'name' => 'Done',
        'slug' => 'done',
        'category' => 'DONE',
        'color' => '#22c55e',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    DB::table('workflow_transitions')->insert([
        [
            'id' => Str::uuid()->toString(),
            'workflow_id' => $this->workflowId,
            'from_status_id' => null,
            'to_status_id' => $this->todoStatusId,
            'name' => 'Create',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => Str::uuid()->toString(),
            'workflow_id' => $this->workflowId,
            'from_status_id' => $this->todoStatusId,
            'to_status_id' => $this->inProgressStatusId,
            'name' => 'Start',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => Str::uuid()->toString(),
            'workflow_id' => $this->workflowId,
            'from_status_id' => $this->inProgressStatusId,
            'to_status_id' => $this->doneStatusId,
            'name' => 'Complete',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'id' => Str::uuid()->toString(),
            'workflow_id' => $this->workflowId,
            'from_status_id' => $this->todoStatusId,
            'to_status_id' => $this->doneStatusId,
            'name' => 'Quick Complete',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    $this->superAdminRole = RoleModel::create([
        'id' => Str::uuid()->toString(),
        'name' => 'Superadmin',
        'scope' => 'GLOBAL',
    ]);

    $this->user = UserModel::factory()->create([
        'org_unit_id' => $this->groupId,
    ]);

    DB::table('user_roles')->insert([
        'id' => Str::uuid()->toString(),
        'user_id' => $this->user->id,
        'role_id' => $this->superAdminRole->id,
    ]);
});

test('can create and update an issue with start_date and due_date', function () {
    $this->actingAs($this->user);

    $startDate = now()->addDays(1)->toDateString();
    $dueDate = now()->addDays(5)->toDateString();

    $createResponse = $this->postJson('/api/issues', [
        'project_id' => $this->projectId,
        'title' => 'Scheduled Issue',
        'description' => 'Testing start and due dates',
        'issue_type_id' => $this->issueTypeId,
        'priority_id' => $this->priorityId,
        'start_date' => $startDate,
        'due_date' => $dueDate,
    ]);

    $createResponse->assertStatus(201)
        ->assertJsonPath('data.start_date', $startDate)
        ->assertJsonPath('data.due_date', $dueDate)
        ->assertJsonPath('data.is_overdue', false);

    $issueId = $createResponse->json('data.id');

    $newStartDate = now()->addDays(2)->toDateString();
    $newDueDate = now()->addDays(10)->toDateString();

    $updateResponse = $this->putJson("/api/issues/{$issueId}", [
        'title' => 'Updated Scheduled Issue',
        'description' => 'Updated dates',
        'issue_type_id' => $this->issueTypeId,
        'status_id' => $this->todoStatusId,
        'priority_id' => $this->priorityId,
        'start_date' => $newStartDate,
        'due_date' => $newDueDate,
    ]);

    $updateResponse->assertStatus(200)
        ->assertJsonPath('data.start_date', $newStartDate)
        ->assertJsonPath('data.due_date', $newDueDate)
        ->assertJsonPath('data.is_overdue', false);
});

test('is_overdue is true when due_date is yesterday and status is TODO or IN_PROGRESS', function () {
    $this->actingAs($this->user);

    $startDate = now()->subDays(5)->toDateString();
    $yesterday = now()->subDay()->toDateString();

    $createResponse = $this->postJson("/api/projects/{$this->projectId}/issues", [
        'title' => 'Overdue Todo Issue',
        'issue_type_id' => $this->issueTypeId,
        'priority_id' => $this->priorityId,
        'start_date' => $startDate,
        'due_date' => $yesterday,
    ]);

    $createResponse->assertStatus(201)
        ->assertJsonPath('data.due_date', $yesterday)
        ->assertJsonPath('data.is_overdue', true);

    $issueId = $createResponse->json('data.id');

    // Verify in backlog query as well
    $backlogResponse = $this->getJson("/api/projects/{$this->projectId}/backlog");
    $backlogResponse->assertStatus(200)
        ->assertJsonPath('data.0.start_date', $startDate)
        ->assertJsonPath('data.0.due_date', $yesterday)
        ->assertJsonPath('data.0.is_overdue', true);

    // Transition to IN_PROGRESS and verify still overdue
    $sprint = SprintModel::create([
        'id' => Str::uuid()->toString(),
        'project_id' => $this->projectId,
        'name' => 'Sprint 1',
        'state' => 'ACTIVE',
    ]);

    $updateResponse = $this->putJson("/api/issues/{$issueId}", [
        'title' => 'Overdue In Progress Issue',
        'issue_type_id' => $this->issueTypeId,
        'status_id' => $this->inProgressStatusId,
        'priority_id' => $this->priorityId,
        'sprint_id' => $sprint->id,
        'start_date' => $startDate,
        'due_date' => $yesterday,
    ]);

    $updateResponse->assertStatus(200)
        ->assertJsonPath('data.is_overdue', true);

    // Verify in board query
    $boardResponse = $this->getJson("/api/projects/{$this->projectId}/board?sprint_id={$sprint->id}");
    $boardResponse->assertStatus(200);
    $inProgressCol = collect($boardResponse->json('data'))->firstWhere('status_id', $this->inProgressStatusId);
    expect($inProgressCol['issues'][0]['is_overdue'])->toBeTrue()
        ->and($inProgressCol['issues'][0]['due_date'])->toBe($yesterday);
});

test('is_overdue is false when status is DONE even if due_date is in the past', function () {
    $this->actingAs($this->user);

    $startDate = now()->subDays(5)->toDateString();
    $yesterday = now()->subDay()->toDateString();

    $createResponse = $this->postJson('/api/issues', [
        'project_id' => $this->projectId,
        'title' => 'Completed Past Due Issue',
        'issue_type_id' => $this->issueTypeId,
        'priority_id' => $this->priorityId,
        'start_date' => $startDate,
        'due_date' => $yesterday,
    ]);

    $issueId = $createResponse->json('data.id');
    expect($createResponse->json('data.is_overdue'))->toBeTrue();

    // Transition to DONE
    $updateResponse = $this->putJson("/api/issues/{$issueId}", [
        'title' => 'Completed Past Due Issue',
        'issue_type_id' => $this->issueTypeId,
        'status_id' => $this->doneStatusId,
        'priority_id' => $this->priorityId,
        'start_date' => $startDate,
        'due_date' => $yesterday,
    ]);

    $updateResponse->assertStatus(200)
        ->assertJsonPath('data.due_date', $yesterday)
        ->assertJsonPath('data.is_overdue', false);
});

test('returns 422 validation error when due_date is before start_date', function () {
    $this->actingAs($this->user);

    $startDate = now()->addDays(5)->toDateString();
    $invalidDueDate = now()->addDays(2)->toDateString();

    $createResponse = $this->postJson('/api/issues', [
        'project_id' => $this->projectId,
        'title' => 'Invalid Dates Issue',
        'issue_type_id' => $this->issueTypeId,
        'priority_id' => $this->priorityId,
        'start_date' => $startDate,
        'due_date' => $invalidDueDate,
    ]);

    $createResponse->assertStatus(422)
        ->assertJsonValidationErrors(['due_date']);

    // Also test on update
    $validCreate = $this->postJson('/api/issues', [
        'project_id' => $this->projectId,
        'title' => 'Valid Issue',
        'issue_type_id' => $this->issueTypeId,
        'priority_id' => $this->priorityId,
    ]);
    $issueId = $validCreate->json('data.id');

    $updateResponse = $this->putJson("/api/issues/{$issueId}", [
        'title' => 'Valid Issue',
        'issue_type_id' => $this->issueTypeId,
        'status_id' => $this->todoStatusId,
        'priority_id' => $this->priorityId,
        'start_date' => $startDate,
        'due_date' => $invalidDueDate,
    ]);

    $updateResponse->assertStatus(422)
        ->assertJsonValidationErrors(['due_date']);
});

test('lazy SLA notification trigger creates overdue and due_soon notifications once per day without cron', function () {
    $this->actingAs($this->user);

    // 1. Overdue issue assigned to user
    $this->postJson('/api/issues', [
        'project_id' => $this->projectId,
        'title' => 'Overdue Assigned Task',
        'issue_type_id' => $this->issueTypeId,
        'priority_id' => $this->priorityId,
        'assignee_id' => (string) $this->user->id,
        'due_date' => now()->subDay()->toDateString(),
    ])->assertStatus(201);

    // 2. Due tomorrow (H-1) issue assigned to user
    $this->postJson('/api/issues', [
        'project_id' => $this->projectId,
        'title' => 'Due Tomorrow Assigned Task',
        'issue_type_id' => $this->issueTypeId,
        'priority_id' => $this->priorityId,
        'assignee_id' => (string) $this->user->id,
        'due_date' => now()->addDay()->toDateString(),
    ])->assertStatus(201);

    // Clear cache before first notification fetch
    Cache::forget("sla_lazy_notify:{$this->user->id}:".now()->toDateString());

    $firstFetch = $this->getJson('/api/notifications')->assertStatus(200);
    $types = array_column($firstFetch->json('data'), 'type');
    expect($types)->toContain('issue.overdue')
        ->and($types)->toContain('issue.due_soon');

    $countAfterFirst = count($firstFetch->json('data'));

    // Second fetch on the same day should NOT duplicate notifications
    $secondFetch = $this->getJson('/api/notifications')->assertStatus(200);
    expect(count($secondFetch->json('data')))->toBe($countAfterFirst);
});
