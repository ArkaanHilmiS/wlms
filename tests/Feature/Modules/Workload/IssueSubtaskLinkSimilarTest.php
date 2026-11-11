<?php

declare(strict_types=1);

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\RoleModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

function mkIssue(object $t, string $title, ?string $statusId = null, ?string $projectId = null, ?string $parentId = null): string
{
    $id = Str::uuid()->toString();
    DB::table('issues')->insert([
        'id' => $id,
        'project_id' => $projectId ?? $t->projectId,
        'status_id' => $statusId ?? $t->todoStatusId,
        'parent_id' => $parentId,
        'number' => random_int(1, 1000000),
        'title' => $title,
        'issue_type_id' => $t->issueTypeId,
        'priority_id' => $t->priorityId,
        'reporter_id' => $t->user->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return $id;
}

function mkOtherProject(object $t): string
{
    $id = Str::uuid()->toString();
    DB::table('projects')->insert(['id' => $id, 'workspace_id' => $t->workspaceId, 'workflow_id' => $t->workflowId, 'key' => 'OTH', 'name' => 'Other', 'status' => 'ACTIVE', 'created_at' => now(), 'updated_at' => now()]);

    return $id;
}

test('similar search finds DONE issue ranked first and ignores other projects', function () {
    $this->actingAs($this->user);
    $other = mkOtherProject($this);
    $done = mkIssue($this, 'Login page error on mobile', $this->doneStatusId);
    mkIssue($this, 'Login button color');
    mkIssue($this, 'Login page error on mobile', null, $other);
    mkIssue($this, 'Unrelated payroll export');

    $q = urlencode('Login page error mobile');
    $res = $this->getJson("/api/projects/{$this->projectId}/issues/similar?title={$q}")->assertOk();
    expect($res->json('data.0.id'))->toBe($done)
        ->and($res->json('data.0.status_category'))->toBe('DONE')
        ->and($res->json('data.0.key'))->toStartWith('SLA-')
        ->and(collect($res->json('data'))->pluck('title')->all())->not->toContain('Unrelated payroll export')
        ->and(count($res->json('data')))->toBe(1);

    $this->getJson("/api/projects/{$this->projectId}/issues/similar?title=ab")->assertOk()->assertJson(['data' => []]);
    $this->getJson("/api/projects/{$this->projectId}/issues/similar?title={$q}&exclude_id={$done}")
        ->assertOk()->assertJson(['data' => []]);
});

test('link create list delete, duplicate and cross-project rejected', function () {
    $this->actingAs($this->user);
    $a = mkIssue($this, 'A');
    $b = mkIssue($this, 'B');
    $x = mkIssue($this, 'X', null, mkOtherProject($this));

    $linkId = $this->postJson("/api/issues/{$a}/links", ['target_issue_id' => $b, 'link_type' => 'BLOCKS'])
        ->assertCreated()
        ->assertJsonPath('data.link_type', 'BLOCKS')
        ->assertJsonPath('data.direction', 'outgoing')
        ->assertJsonPath('data.issue.id', $b)
        ->json('data.id');

    $this->postJson("/api/issues/{$a}/links", ['target_issue_id' => $b, 'link_type' => 'BLOCKS'])->assertStatus(422);
    $this->postJson("/api/issues/{$a}/links", ['target_issue_id' => $x, 'link_type' => 'RELATES_TO'])->assertStatus(422);
    $this->postJson("/api/issues/{$a}/links", ['target_issue_id' => $a, 'link_type' => 'RELATES_TO'])->assertStatus(422);
    $this->postJson("/api/issues/{$a}/links", ['target_issue_id' => $b, 'link_type' => 'CLONES'])->assertStatus(422);

    $this->getJson("/api/issues/{$b}/links")->assertOk()
        ->assertJsonPath('data.links.0.direction', 'incoming')
        ->assertJsonPath('data.links.0.issue.id', $a);

    $this->deleteJson("/api/issues/{$b}/links/{$linkId}")->assertNoContent();
    $this->getJson("/api/issues/{$a}/links")->assertJsonCount(0, 'data.links');
});

test('is_blocked flips after blocker is DONE and subtask counts are exposed', function () {
    $this->actingAs($this->user);
    $blocker = mkIssue($this, 'Blocker');
    $blocked = mkIssue($this, 'Blocked');
    $this->postJson("/api/issues/{$blocker}/links", ['target_issue_id' => $blocked, 'link_type' => 'BLOCKS'])->assertCreated();

    $this->getJson("/api/issues/{$blocked}")->assertJsonPath('data.is_blocked', true);
    $this->getJson("/api/issues/{$blocker}")->assertJsonPath('data.is_blocked', false);
    $list = $this->getJson("/api/projects/{$this->projectId}/issues")->json('data');
    expect(collect($list)->firstWhere('id', $blocked)['is_blocked'])->toBeTrue();

    DB::table('issues')->where('id', $blocker)->update(['status_id' => $this->doneStatusId]);
    $this->getJson("/api/issues/{$blocked}")->assertJsonPath('data.is_blocked', false);

    $inverse = mkIssue($this, 'Inverse');
    $this->postJson("/api/issues/{$inverse}/links", ['target_issue_id' => $blocker, 'link_type' => 'IS_BLOCKED_BY'])->assertCreated();
    $this->getJson("/api/issues/{$inverse}")->assertJsonPath('data.is_blocked', false);
    $open = mkIssue($this, 'Open blocker');
    $this->postJson("/api/issues/{$inverse}/links", ['target_issue_id' => $open, 'link_type' => 'IS_BLOCKED_BY'])->assertCreated();
    $this->getJson("/api/issues/{$inverse}")->assertJsonPath('data.is_blocked', true);

    $parent = mkIssue($this, 'Parent');
    mkIssue($this, 'Child 1', $this->doneStatusId, null, $parent);
    mkIssue($this, 'Child 2', null, null, $parent);
    $this->getJson("/api/issues/{$parent}")
        ->assertJsonPath('data.subtasks_count', 2)
        ->assertJsonPath('data.completed_subtasks_count', 1);
    $this->getJson("/api/issues/{$parent}/links")->assertJsonCount(2, 'data.subtasks');
});

test('parent_id validated and persisted on create and update', function () {
    $this->actingAs($this->user);
    $parent = mkIssue($this, 'Parent');
    $payload = ['project_id' => $this->projectId, 'title' => 'Sub', 'issue_type_id' => $this->issueTypeId, 'priority_id' => $this->priorityId];

    $childId = $this->postJson('/api/issues', $payload + ['parent_id' => $parent])->assertCreated()
        ->assertJsonPath('data.parent_id', $parent)->json('data.id');

    $this->postJson('/api/issues', $payload + ['parent_id' => $childId])->assertStatus(422)->assertJsonValidationErrors(['parent_id']);
    $this->postJson('/api/issues', $payload + ['parent_id' => Str::uuid()->toString()])->assertStatus(422);
    $foreign = mkIssue($this, 'Foreign', null, mkOtherProject($this));
    $this->postJson('/api/issues', $payload + ['parent_id' => $foreign])->assertStatus(422);

    $upd = ['title' => 'Parent', 'issue_type_id' => $this->issueTypeId, 'status_id' => $this->todoStatusId, 'priority_id' => $this->priorityId];
    $this->putJson("/api/issues/{$parent}", $upd + ['parent_id' => $parent])->assertStatus(422);
    $this->putJson("/api/issues/{$parent}", $upd + ['parent_id' => $childId])->assertStatus(422);
    $loose = mkIssue($this, 'Loose');
    $this->putJson("/api/issues/{$loose}", $upd + ['parent_id' => $parent])->assertOk()->assertJsonPath('data.parent_id', $parent);
});

test('outsider gets 403 on all new endpoints', function () {
    $a = mkIssue($this, 'A');
    $b = mkIssue($this, 'B');
    $link = $this->actingAs($this->user)->postJson("/api/issues/{$a}/links", ['target_issue_id' => $b, 'link_type' => 'RELATES_TO'])->json('data.id');

    $outsider = UserModel::factory()->create(['org_unit_id' => $this->groupId]);
    $this->actingAs($outsider);

    $this->getJson("/api/projects/{$this->projectId}/issues/similar?title=Something+similar")->assertForbidden();
    $this->getJson("/api/issues/{$a}/links")->assertForbidden();
    $this->postJson("/api/issues/{$a}/links", ['target_issue_id' => $b, 'link_type' => 'BLOCKS'])->assertForbidden();
    $this->deleteJson("/api/issues/{$a}/links/{$link}")->assertForbidden();
});
