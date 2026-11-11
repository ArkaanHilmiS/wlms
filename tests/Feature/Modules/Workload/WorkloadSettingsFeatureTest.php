<?php

declare(strict_types=1);

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\RoleModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Workload\Infrastructure\Config\WorkloadSettings;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('local');

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
        'name' => 'Settings Workspace',
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
        'key' => 'CFG',
        'name' => 'Config Project',
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

    $this->highPriorityId = Str::uuid()->toString();
    DB::table('priorities')->insert([
        'id' => $this->highPriorityId,
        'name' => 'High',
        'slug' => 'high',
        'color' => '#ff0000',
        'level' => 2,
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

    DB::table('workflow_transitions')->insert([
        'id' => Str::uuid()->toString(),
        'workflow_id' => $this->workflowId,
        'from_status_id' => null,
        'to_status_id' => $this->todoStatusId,
        'name' => 'Create',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->superAdminRole = RoleModel::create([
        'id' => Str::uuid()->toString(),
        'name' => 'Superadmin',
        'scope' => 'GLOBAL',
    ]);

    $this->superAdmin = UserModel::factory()->create([
        'org_unit_id' => $this->groupId,
    ]);

    DB::table('user_roles')->insert([
        'id' => Str::uuid()->toString(),
        'user_id' => $this->superAdmin->id,
        'role_id' => $this->superAdminRole->id,
    ]);

    $this->normalUser = UserModel::factory()->create([
        'org_unit_id' => $this->groupId,
    ]);

    DB::table('workspace_members')->insert([
        [
            'workspace_id' => $this->workspaceId,
            'user_id' => $this->superAdmin->id,
            'role' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'workspace_id' => $this->workspaceId,
            'user_id' => $this->normalUser->id,
            'role' => 'member',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);
});

test('superadmin can update global workload settings and non-admin gets 403', function () {
    $this->actingAs($this->normalUser)
        ->putJson('/api/settings/workload', [
            'worklog_max_hours_per_day' => 8,
        ])
        ->assertStatus(403);

    $response = $this->actingAs($this->superAdmin)
        ->putJson('/api/settings/workload', [
            'sla_days_by_priority' => ['high' => 3, 'medium' => 6],
            'working_days' => [1, 2, 3, 4, 5],
            'holidays' => ['2026-12-25'],
            'enable_sprints_default' => false,
            'worklog_max_hours_per_day' => 8.5,
            'worklog_allow_future_date' => false,
            'attachment_max_mb' => 10,
            'attachment_allowed_extensions' => ['pdf', 'png'],
            'similarity_threshold' => 0.45,
            'sla_warning_days' => 3,
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.worklog_max_hours_per_day', 8.5)
        ->assertJsonPath('data.attachment_max_mb', 10)
        ->assertJsonPath('data.enable_sprints_default', false)
        ->assertJsonPath('data.sla_warning_days', 3);

    $getResponse = $this->actingAs($this->normalUser)->getJson('/api/settings/workload');
    $getResponse->assertStatus(200)
        ->assertJsonPath('data.holidays', ['2026-12-25'])
        ->assertJsonPath('data.attachment_allowed_extensions', ['pdf', 'png']);
});

test('creating an issue without due_date auto-populates due_date based on priority SLA matrix and skips holidays and weekends', function () {
    WorkloadSettings::update([
        'sla_days_by_priority' => ['high' => 2],
        'working_days' => [1, 2, 3, 4, 5],
        'holidays' => ['2026-11-02'], // Monday holiday
    ]);

    // Start on Friday 2026-10-30. +2 business days:
    // Sat 10-31 (skip), Sun 11-01 (skip), Mon 11-02 (holiday skip), Tue 11-03 (day 1), Wed 11-04 (day 2)
    $response = $this->actingAs($this->superAdmin)->postJson('/api/issues', [
        'project_id' => $this->projectId,
        'title' => 'Auto SLA Issue',
        'issue_type_id' => $this->issueTypeId,
        'priority_id' => $this->highPriorityId,
        'start_date' => '2026-10-30',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.start_date', '2026-10-30')
        ->assertJsonPath('data.due_date', '2026-11-04');
});

test('worklog validation rejects future dates and exceeding daily max hours', function () {
    WorkloadSettings::update([
        'worklog_allow_future_date' => false,
        'worklog_max_hours_per_day' => 8,
    ]);

    $issueId = Str::uuid()->toString();
    DB::table('issues')->insert([
        'id' => $issueId,
        'project_id' => $this->projectId,
        'status_id' => $this->todoStatusId,
        'issue_type_id' => $this->issueTypeId,
        'priority_id' => $this->highPriorityId,
        'reporter_id' => $this->superAdmin->id,
        'assignee_id' => $this->normalUser->id,
        'number' => 1,
        'title' => 'Worklog Issue',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // 1. Reject future date
    $futureDate = CarbonImmutable::now()->addDays(2)->toDateString();
    $this->actingAs($this->normalUser)
        ->postJson("/api/issues/{$issueId}/worklogs", [
            'time_spent_seconds' => 3600,
            'description' => 'Future work',
            'started_at' => $futureDate,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['started_at']);

    // 2. Log 5 hours today -> OK
    $today = CarbonImmutable::now()->toDateString();
    $this->actingAs($this->normalUser)
        ->postJson("/api/issues/{$issueId}/worklogs", [
            'time_spent_seconds' => 5 * 3600,
            'description' => 'Morning work',
            'started_at' => $today,
        ])
        ->assertStatus(201);

    // 3. Log another 4 hours today (total 9h > 8h limit) -> 422
    $this->actingAs($this->normalUser)
        ->postJson("/api/issues/{$issueId}/worklogs", [
            'time_spent_seconds' => 4 * 3600,
            'description' => 'Overtime work',
            'started_at' => $today,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['time_spent_seconds']);
});

test('attachment validation rejects disallowed file extensions', function () {
    WorkloadSettings::update([
        'attachment_max_mb' => 5,
        'attachment_allowed_extensions' => ['pdf', 'png'],
    ]);

    $issueId = Str::uuid()->toString();
    DB::table('issues')->insert([
        'id' => $issueId,
        'project_id' => $this->projectId,
        'status_id' => $this->todoStatusId,
        'issue_type_id' => $this->issueTypeId,
        'priority_id' => $this->highPriorityId,
        'reporter_id' => $this->superAdmin->id,
        'assignee_id' => $this->normalUser->id,
        'number' => 1,
        'title' => 'Attachment Issue',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $badFile = UploadedFile::fake()->create('malware.exe', 100, 'application/octet-stream');
    $this->actingAs($this->normalUser)
        ->postJson("/api/issues/{$issueId}/attachments", [
            'file' => $badFile,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['file']);

    $goodFile = UploadedFile::fake()->create('spec.pdf', 100, 'application/pdf');
    $this->actingAs($this->normalUser)
        ->postJson("/api/issues/{$issueId}/attachments", [
            'file' => $goodFile,
        ])
        ->assertStatus(201);
});

test('per-workspace sprint toggle updates lookups.settings.enable_sprints for projects in that workspace', function () {
    $this->actingAs($this->superAdmin)
        ->putJson("/api/workspaces/{$this->workspaceId}/settings", [
            'enable_sprints' => false,
        ])
        ->assertStatus(200)
        ->assertJsonPath('data.enable_sprints', false);

    $this->actingAs($this->superAdmin)
        ->getJson("/api/workspaces/{$this->workspaceId}/settings")
        ->assertStatus(200)
        ->assertJsonPath('data.enable_sprints', false);

    $lookups = $this->actingAs($this->superAdmin)
        ->getJson("/api/projects/{$this->projectId}/lookups");

    $lookups->assertStatus(200)
        ->assertJsonPath('data.settings.enable_sprints', false);

    $this->actingAs($this->superAdmin)
        ->putJson("/api/workspaces/{$this->workspaceId}/settings", [
            'enable_sprints' => true,
        ])
        ->assertStatus(200)
        ->assertJsonPath('data.enable_sprints', true);

    $this->actingAs($this->superAdmin)
        ->getJson("/api/projects/{$this->projectId}/lookups")
        ->assertStatus(200)
        ->assertJsonPath('data.settings.enable_sprints', true);
});
