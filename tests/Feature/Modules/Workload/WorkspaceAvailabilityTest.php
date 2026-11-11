<?php

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\ProjectModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\StatusModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\WorkspaceModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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

if (! function_exists('availabilitySeedLookups')) {
    /**
     * @return array{todo: string, done: string, type: string, priority: string}
     */
    function availabilitySeedLookups(string $suffix): array
    {
        $todo = StatusModel::create([
            'id' => (string) Str::uuid(),
            'name' => 'To Do',
            'slug' => "to-do-{$suffix}",
            'category' => 'TODO',
        ]);
        $done = StatusModel::create([
            'id' => (string) Str::uuid(),
            'name' => 'Done',
            'slug' => "done-{$suffix}",
            'category' => 'DONE',
        ]);

        $typeId = (string) Str::uuid();
        DB::table('issue_types')->insert([
            'id' => $typeId,
            'name' => 'Task',
            'slug' => "task-{$suffix}",
            'icon' => 'check',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $priorityId = (string) Str::uuid();
        DB::table('priorities')->insert([
            'id' => $priorityId,
            'name' => 'Medium',
            'slug' => "medium-{$suffix}",
            'level' => 3,
            'color' => '#fbbf24',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ['todo' => $todo->id, 'done' => $done->id, 'type' => $typeId, 'priority' => $priorityId];
    }
}

if (! function_exists('availabilitySeedIssue')) {
    function availabilitySeedIssue(
        string $projectId,
        array $lookups,
        int $number,
        string $statusId,
        ?int $assigneeId,
        ?int $originalEstimateSeconds,
        ?int $remainingEstimateSeconds,
        int $reporterId
    ): string {
        $id = (string) Str::uuid();
        DB::table('issues')->insert([
            'id' => $id,
            'project_id' => $projectId,
            'issue_type_id' => $lookups['type'],
            'status_id' => $statusId,
            'priority_id' => $lookups['priority'],
            'number' => $number,
            'title' => "Issue {$number}",
            'reporter_id' => $reporterId,
            'assignee_id' => $assigneeId,
            'original_estimate_seconds' => $originalEstimateSeconds,
            'remaining_estimate_seconds' => $remainingEstimateSeconds,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }
}

it('returns weekly capacity, allocated and available hours per workspace member', function () {
    $member = UserModel::factory()->create();

    $workspace = WorkspaceModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Availability Workspace',
        'owner_group_id' => (string) Str::uuid(),
        'status' => 'ACTIVE',
    ]);
    DB::table('workspace_members')->insert([
        'workspace_id' => $workspace->id,
        'user_id' => $member->id,
        'role' => 'member',
        'daily_capacity_hours' => 6,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $project = ProjectModel::create([
        'id' => (string) Str::uuid(),
        'workspace_id' => $workspace->id,
        'key' => 'AVL',
        'name' => 'Availability Project',
        'status' => 'ACTIVE',
    ]);
    $lookups = availabilitySeedLookups('avl');

    // Open, remaining estimate wins over original: 1h
    availabilitySeedIssue($project->id, $lookups, 1, $lookups['todo'], (int) $member->id, 7200, 3600, (int) $member->id);
    // Open, no remaining estimate, falls back to original: 3h
    availabilitySeedIssue($project->id, $lookups, 2, $lookups['todo'], (int) $member->id, 10800, null, (int) $member->id);
    // Done: excluded
    availabilitySeedIssue($project->id, $lookups, 3, $lookups['done'], (int) $member->id, 36000, null, (int) $member->id);
    // Unassigned: excluded
    availabilitySeedIssue($project->id, $lookups, 4, $lookups['todo'], null, 3600, null, (int) $member->id);

    $response = $this->actingAs($member)->getJson("/api/workspaces/{$workspace->id}/availability");

    $response->assertStatus(200);
    $data = $response->json('data');

    expect($data)->toHaveCount(1);
    expect($data[0]['user_id'])->toBe((int) $member->id);
    expect($data[0]['role'])->toBe('member');
    expect($data[0]['daily_capacity_hours'])->toEqual(6);
    expect($data[0]['weekly_capacity_hours'])->toEqual(30);
    expect($data[0]['allocated_hours'])->toEqual(4);
    expect($data[0]['available_hours'])->toEqual(26);
    expect($data[0]['open_task_count'])->toBe(2);
});

it('forbids availability lookup for users outside the workspace', function () {
    $outsider = UserModel::factory()->create();

    $workspace = WorkspaceModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Private Workspace',
        'owner_group_id' => (string) Str::uuid(),
        'status' => 'ACTIVE',
    ]);

    $this->actingAs($outsider)
        ->getJson("/api/workspaces/{$workspace->id}/availability")
        ->assertStatus(403);
});

it('resolves status ids to names in dashboard recent activity', function () {
    $groupId = (string) Str::uuid();
    $user = UserModel::factory()->create(['org_unit_id' => $groupId]);

    $workspace = WorkspaceModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Dashboard Label Workspace',
        'owner_group_id' => $groupId,
        'status' => 'ACTIVE',
    ]);
    $project = ProjectModel::create([
        'id' => (string) Str::uuid(),
        'workspace_id' => $workspace->id,
        'key' => 'LBL',
        'name' => 'Dashboard Label Project',
        'status' => 'ACTIVE',
    ]);
    $lookups = availabilitySeedLookups('lbl');

    $issueId = availabilitySeedIssue($project->id, $lookups, 1, $lookups['done'], (int) $user->id, null, null, (int) $user->id);

    DB::table('issue_histories')->insert([
        'id' => (string) Str::uuid(),
        'issue_id' => $issueId,
        'actor_id' => $user->id,
        'field_changed' => 'status_id',
        'old_value' => $lookups['todo'],
        'new_value' => $lookups['done'],
        'created_at' => now(),
    ]);

    $response = $this->actingAs($user)->get('/dashboard');
    $response->assertStatus(200);
    $props = $response->viewData('page')['props'];

    expect($props['recent_activities'])->toHaveCount(1);
    expect($props['recent_activities'][0]['action_type'])->toBe('status_id');
    expect($props['recent_activities'][0]['new_value'])->toBe($lookups['done']);
    expect($props['recent_activities'][0]['old_label'])->toBe('To Do');
    expect($props['recent_activities'][0]['new_label'])->toBe('Done');
});
