<?php

declare(strict_types=1);

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\RoleModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserRoleModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueTypeModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\PriorityModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\ProjectModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\StatusModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\WorkspaceModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = UserModel::factory()->create();

    $this->adminRole = RoleModel::firstOrCreate(
        ['name' => 'Superadmin'],
        ['id' => Str::uuid(), 'scope' => 'GLOBAL']
    );

    $this->workspace = WorkspaceModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Export Workspace',
        'status' => 'ACTIVE',
        'owner_group_id' => (string) Str::uuid(),
    ]);

    DB::table('workspace_members')->insert([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'admin',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->project = ProjectModel::create([
        'id' => (string) Str::uuid(),
        'workspace_id' => $this->workspace->id,
        'key' => 'EXP',
        'name' => 'Export Project',
        'status' => 'ACTIVE',
        'lead_id' => $this->user->id,
    ]);

    $this->type = IssueTypeModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Task',
        'slug' => 'task',
        'icon' => 'check-square',
    ]);

    $this->priority = PriorityModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'High',
        'slug' => 'high',
        'level' => 1,
        'color' => '#ef4444',
    ]);

    $this->statusTodo = StatusModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'To Do',
        'slug' => 'todo',
        'category' => 'TODO',
        'color' => '#94a3b8',
    ]);

    $this->statusDone = StatusModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Done',
        'slug' => 'done',
        'category' => 'DONE',
        'color' => '#22c55e',
    ]);

    $this->issue1 = IssueModel::create([
        'id' => (string) Str::uuid(),
        'project_id' => $this->project->id,
        'status_id' => $this->statusTodo->id,
        'issue_type_id' => $this->type->id,
        'priority_id' => $this->priority->id,
        'number' => 1,
        'title' => 'Issue for Excel Export',
        'reporter_id' => $this->user->id,
        'assignee_id' => $this->user->id,
        'original_estimate_seconds' => 7200,
        'remaining_estimate_seconds' => 3600,
    ]);

    $this->issue2 = IssueModel::create([
        'id' => (string) Str::uuid(),
        'project_id' => $this->project->id,
        'status_id' => $this->statusDone->id,
        'issue_type_id' => $this->type->id,
        'priority_id' => $this->priority->id,
        'number' => 2,
        'title' => 'Completed Issue',
        'reporter_id' => $this->user->id,
        'assignee_id' => $this->user->id,
    ]);
});

test('member can export workspace issues as xlsx', function () {
    $response = $this->actingAs($this->user)->get("/api/workspaces/{$this->workspace->id}/issues/export?format=xlsx");

    $response->assertStatus(200);
    $response->assertHeader('content-disposition');
    expect($response->headers->get('content-disposition'))->toContain('issues_export_');
    expect($response->headers->get('content-disposition'))->toContain('.xlsx');
});

test('member can export workspace issues as csv and respects filter', function () {
    $response = $this->actingAs($this->user)->get("/api/workspaces/{$this->workspace->id}/issues/export?format=csv&status_category=TODO");

    $response->assertStatus(200);
    $response->assertHeader('content-disposition');
    expect($response->headers->get('content-disposition'))->toContain('.csv');

    $content = $response->streamedContent();
    expect($content)->toContain('Issue for Excel Export');
    expect($content)->not->toContain('Completed Issue');
});

test('member can export project issues directly', function () {
    $response = $this->actingAs($this->user)->get("/api/projects/{$this->project->id}/issues/export?format=csv");

    $response->assertStatus(200);
    expect($response->headers->get('content-disposition'))->toContain('.csv');
});

test('unauthorized user cannot export workspace issues (Anti-IDOR)', function () {
    $otherUser = UserModel::factory()->create();

    $response = $this->actingAs($otherUser)->get("/api/workspaces/{$this->workspace->id}/issues/export");
    $response->assertStatus(403);

    $projectResponse = $this->actingAs($otherUser)->get("/api/projects/{$this->project->id}/issues/export");
    $projectResponse->assertStatus(403);
});
