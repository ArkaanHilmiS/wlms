<?php

declare(strict_types=1);

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\RoleModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueTypeModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\PriorityModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\ProjectModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\SprintModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\StatusModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\WorklogModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\WorkspaceModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = UserModel::factory()->create([
        'name' => 'Robi Leksono',
        'email' => 'robi@wlms.com',
    ]);

    $this->adminRole = RoleModel::firstOrCreate(
        ['name' => 'Superadmin'],
        ['id' => (string) Str::uuid(), 'scope' => 'GLOBAL']
    );

    $this->workspace = WorkspaceModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Timesheet Workspace',
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
        'key' => 'TMS',
        'name' => 'Timesheet Project',
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

    $this->sprint = SprintModel::create([
        'id' => (string) Str::uuid(),
        'project_id' => $this->project->id,
        'name' => 'Sprint Oct 1',
        'state' => 'ACTIVE',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-15',
    ]);

    $this->sprintIssue = IssueModel::create([
        'id' => (string) Str::uuid(),
        'project_id' => $this->project->id,
        'sprint_id' => $this->sprint->id,
        'status_id' => $this->statusDone->id,
        'issue_type_id' => $this->type->id,
        'priority_id' => $this->priority->id,
        'number' => 1,
        'title' => 'Sprint Feature Task',
        'reporter_id' => $this->user->id,
        'assignee_id' => $this->user->id,
    ]);

    $this->nonSprintIssue = IssueModel::create([
        'id' => (string) Str::uuid(),
        'project_id' => $this->project->id,
        'sprint_id' => null,
        'status_id' => $this->statusTodo->id,
        'issue_type_id' => $this->type->id,
        'priority_id' => $this->priority->id,
        'number' => 2,
        'title' => 'Continuous Kanban Task',
        'reporter_id' => $this->user->id,
        'assignee_id' => $this->user->id,
    ]);

    WorklogModel::create([
        'id' => (string) Str::uuid(),
        'issue_id' => $this->sprintIssue->id,
        'author_id' => $this->user->id,
        'time_spent_seconds' => 7200,
        'description' => 'Implemented sprint feature',
        'started_at' => '2026-10-10 09:00:00',
    ]);

    WorklogModel::create([
        'id' => (string) Str::uuid(),
        'issue_id' => $this->nonSprintIssue->id,
        'author_id' => $this->user->id,
        'time_spent_seconds' => 5400,
        'description' => 'Resolved non-sprint operational item',
        'started_at' => '2026-10-12 14:00:00',
    ]);

    WorklogModel::create([
        'id' => (string) Str::uuid(),
        'issue_id' => $this->nonSprintIssue->id,
        'author_id' => $this->user->id,
        'time_spent_seconds' => 3600,
        'description' => 'September worklog outside October filter',
        'started_at' => '2026-09-15 10:00:00',
    ]);
});

test('workspace and project monthly timesheet export includes both Sprint and Non-Sprint worklogs in csv and xlsx', function () {
    $csvResponse = $this->actingAs($this->user)
        ->get("/api/workspaces/{$this->workspace->id}/timesheets/export?month=2026-10&format=csv");

    $csvResponse->assertStatus(200);
    expect($csvResponse->headers->get('content-disposition'))->toContain('timesheet_2026-10.csv');

    $content = $csvResponse->streamedContent();
    expect($content)->toContain('Sprint Oct 1')
        ->and($content)->toContain('TMS-1')
        ->and($content)->toContain('Implemented sprint feature')
        ->and($content)->toContain('TMS-2')
        ->and($content)->toContain('Resolved non-sprint operational item')
        ->and($content)->not->toContain('September worklog outside October filter');

    $xlsxResponse = $this->actingAs($this->user)
        ->get("/api/projects/{$this->project->id}/timesheets/export?month=2026-10&format=xlsx");

    $xlsxResponse->assertStatus(200);
    expect($xlsxResponse->headers->get('content-disposition'))->toContain('timesheet_2026-10.xlsx');
});

test('unauthorized user without workspace or project access receives 403 on timesheet export', function () {
    $outsider = UserModel::factory()->create();

    $this->actingAs($outsider)
        ->get("/api/workspaces/{$this->workspace->id}/timesheets/export?month=2026-10")
        ->assertStatus(403);

    $this->actingAs($outsider)
        ->get("/api/projects/{$this->project->id}/timesheets/export?month=2026-10")
        ->assertStatus(403);
});

test('project analytics returns non-empty burndown and velocity even when project has zero sprints', function () {
    $kanbanProject = ProjectModel::create([
        'id' => (string) Str::uuid(),
        'workspace_id' => $this->workspace->id,
        'key' => 'KNB',
        'name' => 'No Sprint Project',
        'status' => 'ACTIVE',
        'lead_id' => $this->user->id,
    ]);

    IssueModel::create([
        'id' => (string) Str::uuid(),
        'project_id' => $kanbanProject->id,
        'sprint_id' => null,
        'status_id' => $this->statusDone->id,
        'issue_type_id' => $this->type->id,
        'priority_id' => $this->priority->id,
        'number' => 1,
        'title' => 'Kanban Done Task',
        'reporter_id' => $this->user->id,
        'assignee_id' => $this->user->id,
    ]);

    IssueModel::create([
        'id' => (string) Str::uuid(),
        'project_id' => $kanbanProject->id,
        'sprint_id' => null,
        'status_id' => $this->statusTodo->id,
        'issue_type_id' => $this->type->id,
        'priority_id' => $this->priority->id,
        'number' => 2,
        'title' => 'Kanban Todo Task',
        'reporter_id' => $this->user->id,
        'assignee_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)
        ->getJson("/api/projects/{$kanbanProject->id}/analytics");

    $response->assertStatus(200);
    $sprintMetrics = $response->json('sprint_metrics');

    expect($sprintMetrics['has_sprints'])->toBeFalse()
        ->and($sprintMetrics['mode'])->toBe('non_sprint')
        ->and($sprintMetrics['burndown'])->toBeArray()->not->toBeEmpty()
        ->and($sprintMetrics['velocity'])->toBeArray()->not->toBeEmpty();
});
