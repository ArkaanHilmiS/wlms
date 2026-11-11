<?php

declare(strict_types=1);

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\RoleModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Workload\Presentation\Http\Controllers\GetProjectAnalyticsController;
use App\Modules\Workload\Presentation\Http\Controllers\GetWorkspaceAnalyticsController;
use Carbon\Carbon;
use Database\Seeders\WorkloadLookupSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

if (! function_exists('createAnalyticsWorkspace')) {
    function createAnalyticsWorkspace(string $ownerGroupId, string $name = 'Workspace', string $status = 'ACTIVE'): string
    {
        $id = Str::uuid()->toString();
        DB::table('workspaces')->insert([
            'id' => $id,
            'owner_group_id' => $ownerGroupId,
            'name' => $name,
            'status' => $status,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }
}

if (! function_exists('addAnalyticsWorkspaceMember')) {
    function addAnalyticsWorkspaceMember(string $workspaceId, int $userId, string $role = 'member', int $dailyCapacity = 8): void
    {
        DB::table('workspace_members')->insert([
            'workspace_id' => $workspaceId,
            'user_id' => $userId,
            'role' => $role,
            'daily_capacity_hours' => $dailyCapacity,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

if (! function_exists('createAnalyticsProject')) {
    function createAnalyticsProject(
        string $workspaceId,
        string $key,
        string $name,
        ?int $leadId = null,
        string $status = 'ACTIVE',
        ?string $endDate = null
    ): string {
        $id = Str::uuid()->toString();
        DB::table('projects')->insert([
            'id' => $id,
            'workspace_id' => $workspaceId,
            'key' => $key,
            'name' => $name,
            'status' => $status,
            'lead_id' => $leadId,
            'end_date' => $endDate,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }
}

if (! function_exists('createAnalyticsIssue')) {
    /**
     * @param  array<string, mixed>  $overrides
     */
    function createAnalyticsIssue(string $projectId, array $overrides = []): string
    {
        static $numberSeq = 1;
        $id = (string) ($overrides['id'] ?? Str::uuid());
        $number = $overrides['number'] ?? $numberSeq++;

        DB::table('issues')->insert([
            'id' => $id,
            'project_id' => $projectId,
            'number' => $number,
            'title' => $overrides['title'] ?? "Issue #{$number}",
            'status_id' => $overrides['status_id'],
            'issue_type_id' => $overrides['issue_type_id'],
            'priority_id' => $overrides['priority_id'],
            'reporter_id' => $overrides['reporter_id'],
            'assignee_id' => $overrides['assignee_id'] ?? null,
            'story_points' => $overrides['story_points'] ?? 3,
            'original_estimate_seconds' => array_key_exists('original_estimate_seconds', $overrides) ? $overrides['original_estimate_seconds'] : 14400,
            'remaining_estimate_seconds' => array_key_exists('remaining_estimate_seconds', $overrides) ? $overrides['remaining_estimate_seconds'] : 7200,
            'sprint_id' => $overrides['sprint_id'] ?? null,
            'created_at' => $overrides['created_at'] ?? now(),
            'updated_at' => $overrides['updated_at'] ?? now(),
        ]);

        return $id;
    }
}

if (! function_exists('createAnalyticsWorklog')) {
    function createAnalyticsWorklog(string $issueId, int $authorId, int $seconds, ?Carbon $startedAt = null): string
    {
        $id = Str::uuid()->toString();
        DB::table('worklogs')->insert([
            'id' => $id,
            'issue_id' => $issueId,
            'author_id' => $authorId,
            'time_spent_seconds' => $seconds,
            'started_at' => $startedAt ?? now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }
}

if (! function_exists('createAnalyticsSprint')) {
    /**
     * @param  array<string, mixed>  $overrides
     */
    function createAnalyticsSprint(string $projectId, string $name, array $overrides = []): string
    {
        $id = (string) ($overrides['id'] ?? Str::uuid());
        DB::table('sprints')->insert(array_merge([
            'id' => $id,
            'project_id' => $projectId,
            'name' => $name,
            'state' => 'ACTIVE',
            'start_date' => now()->subDays(7),
            'end_date' => now()->addDays(7),
            'committed_points' => 20,
            'completed_points' => 10,
            'created_at' => now(),
            'updated_at' => now(),
        ], $overrides));

        return $id;
    }
}

if (! function_exists('createAnalyticsIssueHistory')) {
    function createAnalyticsIssueHistory(
        string $issueId,
        int $actorId,
        string $field,
        ?string $oldValue,
        ?string $newValue,
        ?Carbon $createdAt = null
    ): string {
        $id = Str::uuid()->toString();
        DB::table('issue_histories')->insert([
            'id' => $id,
            'issue_id' => $issueId,
            'actor_id' => $actorId,
            'field_changed' => $field,
            'old_value' => $oldValue,
            'new_value' => $newValue,
            'created_at' => $createdAt ?? now(),
        ]);

        return $id;
    }
}

beforeEach(function () {
    // 1. Seed lookup metadata
    $this->seed(WorkloadLookupSeeder::class);

    $this->todoStatus = (string) DB::table('statuses')->where('slug', 'to-do')->value('id');
    $this->inProgressStatus = (string) DB::table('statuses')->where('slug', 'in-progress')->value('id');
    $this->doneStatus = (string) DB::table('statuses')->where('slug', 'done')->value('id');

    $this->taskType = (string) DB::table('issue_types')->where('slug', 'task')->value('id');
    $this->bugType = (string) DB::table('issue_types')->where('slug', 'bug')->value('id');
    $this->storyType = (string) DB::table('issue_types')->where('slug', 'story')->value('id');

    $this->highPriority = (string) DB::table('priorities')->where('slug', 'high')->value('id');
    $this->mediumPriority = (string) DB::table('priorities')->where('slug', 'medium')->value('id');
    $this->lowPriority = (string) DB::table('priorities')->where('slug', 'low')->value('id');

    // 2. Org hierarchy
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
        'name' => 'Engineering',
    ]);

    // 3. Baseline Users
    $this->user = UserModel::factory()->create([
        'org_unit_id' => $this->groupId,
    ]);

    $this->otherUser = UserModel::factory()->create([
        'org_unit_id' => Str::uuid()->toString(),
    ]);

    $this->superAdminRole = RoleModel::create([
        'id' => Str::uuid()->toString(),
        'name' => 'Superadmin',
        'scope' => 'GLOBAL',
    ]);

    $this->superAdmin = UserModel::factory()->create([
        'email' => 'superadmin@wlms.com',
        'org_unit_id' => Str::uuid()->toString(),
    ]);

    DB::table('user_roles')->insert([
        'id' => Str::uuid()->toString(),
        'user_id' => $this->superAdmin->id,
        'role_id' => $this->superAdminRole->id,
    ]);

    // 4. Register Analytics routes dynamically if not yet loaded in routes.php
    $routes = collect(Route::getRoutes()->getRoutes());
    $hasWorkspaceRoute = $routes->contains(
        fn ($r) => str_contains($r->uri(), 'workspaces/{workspaceId}/analytics') || str_contains($r->uri(), 'workspaces/{id}/analytics')
    );

    if (! $hasWorkspaceRoute) {
        Route::middleware(['auth:sanctum'])->group(function () {
            Route::get(
                '/api/workspaces/{workspaceId}/analytics',
                GetWorkspaceAnalyticsController::class
            );
            Route::get(
                '/api/projects/{id}/analytics',
                GetProjectAnalyticsController::class
            );
        });
    }
});

// =========================================================================
// TIER 1: FEATURE COVERAGE (HAPPY PATH)
// =========================================================================

test('1.1: GET /api/workspaces/{id}/analytics returns overall project progress, active project count, and health status', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Platform Workspace');
    addAnalyticsWorkspaceMember($wsId, $this->user->id, 'admin');

    // Project 1: 5 issues, 5 done (100% completed)
    $p1 = createAnalyticsProject($wsId, 'PLT', 'Platform Core', $this->user->id, 'ACTIVE');
    for ($i = 0; $i < 5; $i++) {
        createAnalyticsIssue($p1, [
            'status_id' => $this->doneStatus,
            'issue_type_id' => $this->taskType,
            'priority_id' => $this->mediumPriority,
            'reporter_id' => $this->user->id,
            'assignee_id' => $this->user->id,
        ]);
    }

    // Project 2: 5 issues, 2 done (40% progress)
    $p2 = createAnalyticsProject($wsId, 'API', 'API Gateway', $this->user->id, 'ACTIVE');
    for ($i = 0; $i < 2; $i++) {
        createAnalyticsIssue($p2, [
            'status_id' => $this->doneStatus,
            'issue_type_id' => $this->taskType,
            'priority_id' => $this->mediumPriority,
            'reporter_id' => $this->user->id,
            'assignee_id' => $this->user->id,
        ]);
    }
    for ($i = 0; $i < 3; $i++) {
        createAnalyticsIssue($p2, [
            'status_id' => $this->todoStatus,
            'issue_type_id' => $this->taskType,
            'priority_id' => $this->mediumPriority,
            'reporter_id' => $this->user->id,
            'assignee_id' => $this->user->id,
        ]);
    }

    $response = $this->actingAs($this->user)->getJson("/api/workspaces/{$wsId}/analytics");

    $response->assertStatus(200);
    $response->assertJsonStructure([
        'summary' => ['total_projects', 'active_projects', 'total_issues', 'completed_issues', 'completion_rate'],
        'projects' => [
            '*' => ['id', 'key', 'name', 'status', 'total_issues', 'completed_issues', 'progress_percent', 'health_status'],
        ],
        'throughput',
        'member_workload',
        'filters',
    ]);

    $summary = $response->json('summary');
    expect($summary['total_projects'])->toBe(2)
        ->and($summary['total_issues'])->toBe(10)
        ->and($summary['completed_issues'])->toBe(7)
        ->and((float) $summary['completion_rate'])->toBe(70.0);

    $projects = collect($response->json('projects'));
    $proj1 = $projects->firstWhere('key', 'PLT');
    $proj2 = $projects->firstWhere('key', 'API');

    expect((float) $proj1['progress_percent'])->toBe(100.0)
        ->and($proj1['health_status'])->toBe('completed')
        ->and((float) $proj2['progress_percent'])->toBe(40.0)
        ->and($proj2['health_status'])->toBe('on_track');
});

test('1.2: GET /api/workspaces/{id}/analytics returns throughput grouped by period', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Throughput Workspace');
    addAnalyticsWorkspaceMember($wsId, $this->user->id, 'admin');

    $p1 = createAnalyticsProject($wsId, 'THP', 'Throughput Project', $this->user->id);

    // Create 3 completed issues updated today
    for ($i = 0; $i < 3; $i++) {
        createAnalyticsIssue($p1, [
            'status_id' => $this->doneStatus,
            'issue_type_id' => $this->taskType,
            'priority_id' => $this->mediumPriority,
            'reporter_id' => $this->user->id,
            'updated_at' => now(),
        ]);
    }

    $response = $this->actingAs($this->user)->getJson("/api/workspaces/{$wsId}/analytics?date_range=30d");

    $response->assertStatus(200);
    $throughput = $response->json('throughput');
    expect($throughput)->toBeArray()->and(count($throughput))->toBeGreaterThan(0);

    $totalCompleted = collect($throughput)->sum('completed_count');
    expect($totalCompleted)->toBeGreaterThanOrEqual(3);
});

test('1.3: GET /api/workspaces/{id}/analytics returns cross-project member workload distribution', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Member Workspace');
    addAnalyticsWorkspaceMember($wsId, $this->user->id, 'admin', 8);

    $member2 = UserModel::factory()->create(['org_unit_id' => $this->groupId]);
    addAnalyticsWorkspaceMember($wsId, $member2->id, 'member', 6);

    $p1 = createAnalyticsProject($wsId, 'PR1', 'Project 1');
    $p2 = createAnalyticsProject($wsId, 'PR2', 'Project 2');

    // User 1 has 3 issues across 2 projects (estimate: 3x4h = 12h, worklog: 4h)
    $iss1 = createAnalyticsIssue($p1, [
        'status_id' => $this->inProgressStatus,
        'issue_type_id' => $this->taskType,
        'priority_id' => $this->mediumPriority,
        'reporter_id' => $this->user->id,
        'assignee_id' => $this->user->id,
        'original_estimate_seconds' => 14400, // 4h
    ]);
    createAnalyticsWorklog($iss1, $this->user->id, 14400); // 4h logged

    createAnalyticsIssue($p2, [
        'status_id' => $this->doneStatus,
        'issue_type_id' => $this->taskType,
        'priority_id' => $this->mediumPriority,
        'reporter_id' => $this->user->id,
        'assignee_id' => $this->user->id,
        'original_estimate_seconds' => 14400,
    ]);

    // Member 2 has 1 issue in project 2 (estimate: 8h, 0h worklog)
    createAnalyticsIssue($p2, [
        'status_id' => $this->todoStatus,
        'issue_type_id' => $this->taskType,
        'priority_id' => $this->highPriority,
        'reporter_id' => $this->user->id,
        'assignee_id' => $member2->id,
        'original_estimate_seconds' => 28800, // 8h
    ]);

    $response = $this->actingAs($this->user)->getJson("/api/workspaces/{$wsId}/analytics");

    $response->assertStatus(200);
    $workload = collect($response->json('member_workload'));

    $userWorkload = $workload->firstWhere('user_id', $this->user->id);
    $member2Workload = $workload->firstWhere('user_id', $member2->id);

    expect($userWorkload)->not->toBeNull()
        ->and($userWorkload['task_count'])->toBe(2)
        ->and($userWorkload['completed_task_count'])->toBe(1)
        ->and((float) $userWorkload['estimated_hours'])->toBe(8.0)
        ->and((float) $userWorkload['logged_hours'])->toBe(4.0)
        ->and($member2Workload['task_count'])->toBe(1)
        ->and((float) $member2Workload['estimated_hours'])->toBe(8.0)
        ->and((float) $member2Workload['logged_hours'])->toBe(0.0);
});

test('1.4: GET /api/workspaces/{id}/analytics filters by preset date ranges (7d, 30d, quarter)', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Date Filter Workspace');
    addAnalyticsWorkspaceMember($wsId, $this->user->id);

    $p1 = createAnalyticsProject($wsId, 'DFP', 'Date Filter Project');
    createAnalyticsIssue($p1, [
        'status_id' => $this->doneStatus,
        'issue_type_id' => $this->taskType,
        'priority_id' => $this->mediumPriority,
        'reporter_id' => $this->user->id,
        'updated_at' => now(),
    ]);

    foreach (['7d', '30d', 'quarter'] as $preset) {
        $res = $this->actingAs($this->user)->getJson("/api/workspaces/{$wsId}/analytics?date_range={$preset}");
        $res->assertStatus(200);
        expect($res->json('filters.date_range'))->toBe($preset)
            ->and($res->json('filters.start_date'))->toBeString()
            ->and($res->json('filters.end_date'))->toBeString();
    }
});

test('1.5: GET /api/projects/{id}/analytics returns lead time and cycle time distributions and percentiles', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Lead Time Workspace');
    addAnalyticsWorkspaceMember($wsId, $this->user->id);

    $projId = createAnalyticsProject($wsId, 'LTC', 'Lead & Cycle Project');

    // Issue 1: Lead time 1 day (0-2d bucket)
    createAnalyticsIssue($projId, [
        'status_id' => $this->doneStatus,
        'issue_type_id' => $this->taskType,
        'priority_id' => $this->mediumPriority,
        'reporter_id' => $this->user->id,
        'created_at' => now()->subDays(1),
        'updated_at' => now(),
    ]);

    // Issue 2: Lead time 4 days (3-5d bucket)
    createAnalyticsIssue($projId, [
        'status_id' => $this->doneStatus,
        'issue_type_id' => $this->taskType,
        'priority_id' => $this->mediumPriority,
        'reporter_id' => $this->user->id,
        'created_at' => now()->subDays(4),
        'updated_at' => now(),
    ]);

    // Issue 3: Lead time 8 days (6-10d bucket)
    createAnalyticsIssue($projId, [
        'status_id' => $this->doneStatus,
        'issue_type_id' => $this->taskType,
        'priority_id' => $this->mediumPriority,
        'reporter_id' => $this->user->id,
        'created_at' => now()->subDays(8),
        'updated_at' => now(),
    ]);

    $response = $this->actingAs($this->user)->getJson("/api/projects/{$projId}/analytics");

    $response->assertStatus(200);
    $leadTime = $response->json('lead_time');
    $cycleTime = $response->json('cycle_time');

    expect($leadTime)->toHaveKeys(['average_days', 'median_days', 'p85_days', 'distribution'])
        ->and($leadTime['average_days'])->toBeGreaterThan(0)
        ->and($leadTime['median_days'])->toBeGreaterThan(0)
        ->and($leadTime['p85_days'])->toBeGreaterThan(0)
        ->and($cycleTime)->toHaveKeys(['average_days', 'median_days', 'p85_days', 'distribution']);

    $distributionTotal = collect($leadTime['distribution'])->sum('count');
    expect($distributionTotal)->toBe(3);
});

test('1.6: GET /api/projects/{id}/analytics returns cumulative flow diagram (CFD) status trends over time', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'CFD Workspace');
    addAnalyticsWorkspaceMember($wsId, $this->user->id);

    $projId = createAnalyticsProject($wsId, 'CFD', 'CFD Project');

    createAnalyticsIssue($projId, [
        'status_id' => $this->todoStatus,
        'issue_type_id' => $this->taskType,
        'priority_id' => $this->mediumPriority,
        'reporter_id' => $this->user->id,
    ]);
    createAnalyticsIssue($projId, [
        'status_id' => $this->inProgressStatus,
        'issue_type_id' => $this->taskType,
        'priority_id' => $this->mediumPriority,
        'reporter_id' => $this->user->id,
    ]);
    createAnalyticsIssue($projId, [
        'status_id' => $this->doneStatus,
        'issue_type_id' => $this->taskType,
        'priority_id' => $this->mediumPriority,
        'reporter_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)->getJson("/api/projects/{$projId}/analytics");

    $response->assertStatus(200);
    $cfd = $response->json('cumulative_flow');
    expect($cfd)->toBeArray()->and(count($cfd))->toBeGreaterThan(0);

    $lastPoint = end($cfd);
    expect($lastPoint)->toHaveKeys(['date', 'todo', 'in_progress', 'done'])
        ->and($lastPoint['done'])->toBeGreaterThanOrEqual(1);
});

test('1.7: GET /api/projects/{id}/analytics returns issue type and priority distributions', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Dist Workspace');
    addAnalyticsWorkspaceMember($wsId, $this->user->id);

    $projId = createAnalyticsProject($wsId, 'DST', 'Distribution Project');

    // 2 Tasks, 1 Bug
    createAnalyticsIssue($projId, [
        'status_id' => $this->todoStatus,
        'issue_type_id' => $this->taskType,
        'priority_id' => $this->highPriority,
        'reporter_id' => $this->user->id,
    ]);
    createAnalyticsIssue($projId, [
        'status_id' => $this->todoStatus,
        'issue_type_id' => $this->taskType,
        'priority_id' => $this->mediumPriority,
        'reporter_id' => $this->user->id,
    ]);
    createAnalyticsIssue($projId, [
        'status_id' => $this->todoStatus,
        'issue_type_id' => $this->bugType,
        'priority_id' => $this->lowPriority,
        'reporter_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)->getJson("/api/projects/{$projId}/analytics");

    $response->assertStatus(200);
    $issueTypes = collect($response->json('issue_types'));
    $priorities = collect($response->json('priorities'));

    expect($issueTypes->sum('count'))->toBe(3)
        ->and($priorities->sum('count'))->toBe(3);

    $taskEntry = $issueTypes->firstWhere('slug', 'task');
    expect($taskEntry['count'])->toBe(2)
        ->and($taskEntry)->toHaveKeys(['id', 'name', 'slug', 'count', 'color']);
});

test('1.8: GET /api/projects/{id}/analytics returns sprint burndown and velocity metrics when sprints exist', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Sprint Metrics WS');
    addAnalyticsWorkspaceMember($wsId, $this->user->id);

    $projId = createAnalyticsProject($wsId, 'SPR', 'Sprint Project');

    // Historical completed sprint
    createAnalyticsSprint($projId, 'Sprint 1', [
        'state' => 'CLOSED',
        'committed_points' => 30,
        'completed_points' => 28,
        'start_date' => now()->subDays(20),
        'end_date' => now()->subDays(6),
        'created_at' => now()->subDays(25),
    ]);

    // Active sprint
    $sprint2 = createAnalyticsSprint($projId, 'Sprint 2', [
        'state' => 'ACTIVE',
        'committed_points' => 40,
        'completed_points' => 20,
        'start_date' => now()->subDays(5),
        'end_date' => now()->addDays(9),
        'created_at' => now()->subDays(5),
    ]);

    // Add issues to Sprint 2
    createAnalyticsIssue($projId, [
        'status_id' => $this->doneStatus,
        'issue_type_id' => $this->taskType,
        'priority_id' => $this->mediumPriority,
        'reporter_id' => $this->user->id,
        'sprint_id' => $sprint2,
        'story_points' => 8,
    ]);

    $response = $this->actingAs($this->user)->getJson("/api/projects/{$projId}/analytics");

    $response->assertStatus(200);
    $sprintMetrics = $response->json('sprint_metrics');

    expect($sprintMetrics['has_sprints'])->toBeTrue()
        ->and($sprintMetrics['velocity'])->toBeArray()->and(count($sprintMetrics['velocity']))->toBe(2)
        ->and($sprintMetrics['burndown'])->toBeArray()->and(count($sprintMetrics['burndown']))->toBeGreaterThan(0);

    $firstVelocity = $sprintMetrics['velocity'][0];
    expect($firstVelocity)->toHaveKeys(['sprint_id', 'sprint_name', 'committed_points', 'completed_points'])
        ->and($firstVelocity['completed_points'])->toBe(28);
});

test('1.9: GET /api/projects/{id}/analytics handles kanban project without sprints gracefully', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Kanban WS');
    addAnalyticsWorkspaceMember($wsId, $this->user->id);

    $projId = createAnalyticsProject($wsId, 'KAN', 'Kanban Project');

    createAnalyticsIssue($projId, [
        'status_id' => $this->doneStatus,
        'issue_type_id' => $this->taskType,
        'priority_id' => $this->mediumPriority,
        'reporter_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)->getJson("/api/projects/{$projId}/analytics");

    $response->assertStatus(200);
    $sprintMetrics = $response->json('sprint_metrics');

    expect($sprintMetrics['has_sprints'])->toBeFalse()
        ->and($sprintMetrics['burndown'])->toBeArray()->not->toBeEmpty()
        ->and($sprintMetrics['velocity'])->toBeArray()->not->toBeEmpty()
        ->and($response->json('summary.total_issues'))->toBe(1);
});

test('1.10: Authorized workspace member can access workspace and project analytics (200 OK)', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Auth Workspace');
    addAnalyticsWorkspaceMember($wsId, $this->user->id, 'viewer');

    $projId = createAnalyticsProject($wsId, 'ATH', 'Auth Project');

    $this->actingAs($this->user)
        ->getJson("/api/workspaces/{$wsId}/analytics")
        ->assertStatus(200);

    $this->actingAs($this->user)
        ->getJson("/api/projects/{$projId}/analytics")
        ->assertStatus(200);
});

// =========================================================================
// TIER 2: BOUNDARY & CORNER CASES
// =========================================================================

test('2.1: Empty workspace with 0 projects returns zeroed metrics without division by zero', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Empty Workspace');
    addAnalyticsWorkspaceMember($wsId, $this->user->id);

    $response = $this->actingAs($this->user)->getJson("/api/workspaces/{$wsId}/analytics");

    $response->assertStatus(200);
    $summary = $response->json('summary');

    expect($summary['total_projects'])->toBe(0)
        ->and($summary['total_issues'])->toBe(0)
        ->and($summary['completed_issues'])->toBe(0)
        ->and((float) $summary['completion_rate'])->toBe(0.0)
        ->and($response->json('projects'))->toBe([])
        ->and($response->json('throughput'))->toBe([]);
});

test('2.2: Workspace with projects but 0 issues returns zeroed metrics', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Projects No Issues WS');
    addAnalyticsWorkspaceMember($wsId, $this->user->id);

    createAnalyticsProject($wsId, 'PR1', 'Project 1');
    createAnalyticsProject($wsId, 'PR2', 'Project 2');

    $response = $this->actingAs($this->user)->getJson("/api/workspaces/{$wsId}/analytics");

    $response->assertStatus(200);
    $summary = $response->json('summary');

    expect($summary['total_projects'])->toBe(2)
        ->and($summary['total_issues'])->toBe(0)
        ->and($summary['completed_issues'])->toBe(0)
        ->and((float) $summary['completion_rate'])->toBe(0.0);

    foreach ($response->json('projects') as $proj) {
        expect($proj['total_issues'])->toBe(0)
            ->and($proj['completed_issues'])->toBe(0)
            ->and((float) $proj['progress_percent'])->toBe(0.0);
    }
});

test('2.3: Project with 0 issues returns zeroed lead/cycle time and clean empty metrics', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Empty Project WS');
    addAnalyticsWorkspaceMember($wsId, $this->user->id);

    $projId = createAnalyticsProject($wsId, 'EMP', 'Empty Project');

    $response = $this->actingAs($this->user)->getJson("/api/projects/{$projId}/analytics");

    $response->assertStatus(200);
    expect($response->json('summary.total_issues'))->toBe(0)
        ->and((float) $response->json('lead_time.average_days'))->toBe(0.0)
        ->and((float) $response->json('lead_time.median_days'))->toBe(0.0)
        ->and((float) $response->json('cycle_time.average_days'))->toBe(0.0)
        ->and($response->json('cumulative_flow'))->toBe([])
        ->and($response->json('issue_types'))->toBe([])
        ->and($response->json('priorities'))->toBe([]);
});

test('2.4: Issues with null assignee, null estimate, or zero worklogs handle gracefully', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Nulls WS');
    addAnalyticsWorkspaceMember($wsId, $this->user->id);

    $projId = createAnalyticsProject($wsId, 'NUL', 'Nulls Project');

    // Issue with null assignee and null estimate
    createAnalyticsIssue($projId, [
        'status_id' => $this->doneStatus,
        'issue_type_id' => $this->taskType,
        'priority_id' => $this->mediumPriority,
        'reporter_id' => $this->user->id,
        'assignee_id' => null,
        'original_estimate_seconds' => null,
        'remaining_estimate_seconds' => null,
    ]);

    $wsRes = $this->actingAs($this->user)->getJson("/api/workspaces/{$wsId}/analytics");
    $wsRes->assertStatus(200);
    expect($wsRes->json('summary.total_issues'))->toBe(1)
        ->and((float) $wsRes->json('summary.total_estimated_hours'))->toBe(0.0)
        ->and((float) $wsRes->json('summary.total_logged_hours'))->toBe(0.0);

    $projRes = $this->actingAs($this->user)->getJson("/api/projects/{$projId}/analytics");
    $projRes->assertStatus(200);
    expect($projRes->json('summary.total_issues'))->toBe(1);
});

test('2.5: Issues transitioning directly from TODO to DONE without IN_PROGRESS calculate lead and cycle time', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Direct Done WS');
    addAnalyticsWorkspaceMember($wsId, $this->user->id);

    $projId = createAnalyticsProject($wsId, 'DIR', 'Direct Done Project');

    // Created 3 days ago, moved directly to Done without history
    createAnalyticsIssue($projId, [
        'status_id' => $this->doneStatus,
        'issue_type_id' => $this->taskType,
        'priority_id' => $this->mediumPriority,
        'reporter_id' => $this->user->id,
        'created_at' => now()->subDays(3),
        'updated_at' => now(),
    ]);

    $response = $this->actingAs($this->user)->getJson("/api/projects/{$projId}/analytics");

    $response->assertStatus(200);
    expect((float) $response->json('cycle_time.average_days'))->toBeGreaterThan(0.0)
        ->and((float) $response->json('lead_time.average_days'))->toBeGreaterThan(0.0);
});

test('2.6: Custom date range boundaries (same start and end date, future dates)', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Custom Boundary WS');
    addAnalyticsWorkspaceMember($wsId, $this->user->id);

    $projId = createAnalyticsProject($wsId, 'CBD', 'Custom Boundary Project');
    createAnalyticsIssue($projId, [
        'status_id' => $this->doneStatus,
        'issue_type_id' => $this->taskType,
        'priority_id' => $this->mediumPriority,
        'reporter_id' => $this->user->id,
    ]);

    // Same date start and end
    $today = now()->toDateString();
    $res1 = $this->actingAs($this->user)->getJson("/api/workspaces/{$wsId}/analytics?date_range=custom&from={$today}&to={$today}");
    $res1->assertStatus(200);
    expect($res1->json('filters.date_range'))->toBe('custom');

    // Future date range with 0 throughput
    $futureStart = now()->addDays(30)->toDateString();
    $futureEnd = now()->addDays(40)->toDateString();
    $res2 = $this->actingAs($this->user)->getJson("/api/workspaces/{$wsId}/analytics?date_range=custom&from={$futureStart}&to={$futureEnd}");
    $res2->assertStatus(200);
    $throughputCounts = collect($res2->json('throughput'))->sum('completed_count');
    expect($throughputCounts)->toBe(0);
});

test('2.7: Non-existent workspace or project ID returns 404 Not Found', function () {
    $randomId = Str::uuid()->toString();

    $this->actingAs($this->user)
        ->getJson("/api/workspaces/{$randomId}/analytics")
        ->assertStatus(404);

    $this->actingAs($this->user)
        ->getJson("/api/projects/{$randomId}/analytics")
        ->assertStatus(404);
});

test('2.8: Unauthenticated request returns 401 Unauthorized', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Unauth WS');
    $projId = createAnalyticsProject($wsId, 'UNA', 'Unauth Project');

    $this->getJson("/api/workspaces/{$wsId}/analytics")
        ->assertStatus(401);

    $this->getJson("/api/projects/{$projId}/analytics")
        ->assertStatus(401);
});

test('2.9: Non-member user without permission returns 403 Forbidden (Anti-IDOR)', function () {
    // Workspace belongs to org unit where otherUser does not have access
    $wsId = createAnalyticsWorkspace(Str::uuid()->toString(), 'Private WS');
    addAnalyticsWorkspaceMember($wsId, $this->user->id);

    // otherUser is not a member and has different org_unit_id
    $this->actingAs($this->otherUser)
        ->getJson("/api/workspaces/{$wsId}/analytics")
        ->assertStatus(403);
});

test('2.10: Cross-tenant project access blocked (user in Workspace A cannot access Workspace B project)', function () {
    $wsA = createAnalyticsWorkspace($this->groupId, 'Workspace A');
    addAnalyticsWorkspaceMember($wsA, $this->user->id);

    $wsB = createAnalyticsWorkspace(Str::uuid()->toString(), 'Workspace B');
    $projB = createAnalyticsProject($wsB, 'PRB', 'Project in B');

    // User is member of Workspace A but NOT Workspace B
    $this->actingAs($this->user)
        ->getJson("/api/projects/{$projB}/analytics")
        ->assertStatus(403);
});

// =========================================================================
// TIER 3: CROSS-FEATURE COMBINATIONS & INVARIANCE
// =========================================================================

test('3.1: Combining date range filter with multiple projects and multiple assignees', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Combo WS');
    addAnalyticsWorkspaceMember($wsId, $this->user->id);

    $user2 = UserModel::factory()->create(['org_unit_id' => $this->groupId]);
    addAnalyticsWorkspaceMember($wsId, $user2->id);

    $p1 = createAnalyticsProject($wsId, 'CP1', 'Combo Project 1');
    $p2 = createAnalyticsProject($wsId, 'CP2', 'Combo Project 2');

    // Completed 3 days ago (inside 7d)
    createAnalyticsIssue($p1, [
        'status_id' => $this->doneStatus,
        'issue_type_id' => $this->taskType,
        'priority_id' => $this->mediumPriority,
        'reporter_id' => $this->user->id,
        'assignee_id' => $this->user->id,
        'updated_at' => now()->subDays(3),
    ]);

    // Completed 15 days ago (outside 7d, inside 30d)
    createAnalyticsIssue($p2, [
        'status_id' => $this->doneStatus,
        'issue_type_id' => $this->bugType,
        'priority_id' => $this->highPriority,
        'reporter_id' => $this->user->id,
        'assignee_id' => $user2->id,
        'updated_at' => now()->subDays(15),
    ]);

    $res7d = $this->actingAs($this->user)->getJson("/api/workspaces/{$wsId}/analytics?date_range=7d");
    $res7d->assertStatus(200);
    $throughput7d = collect($res7d->json('throughput'))->sum('completed_count');
    expect($throughput7d)->toBe(1);

    $res30d = $this->actingAs($this->user)->getJson("/api/workspaces/{$wsId}/analytics?date_range=30d");
    $res30d->assertStatus(200);
    $throughput30d = collect($res30d->json('throughput'))->sum('completed_count');
    expect($throughput30d)->toBe(2);
});

test('3.2: Query count invariance: scaling from 2 to 10 projects does not increase query count (0 N+1)', function () {
    // Workspace 1: 2 projects
    $ws1 = createAnalyticsWorkspace($this->groupId, '2 Projects WS');
    addAnalyticsWorkspaceMember($ws1, $this->user->id);
    for ($i = 0; $i < 2; $i++) {
        $p = createAnalyticsProject($ws1, "P2{$i}", "Project {$i}");
        createAnalyticsIssue($p, [
            'status_id' => $this->doneStatus,
            'issue_type_id' => $this->taskType,
            'priority_id' => $this->mediumPriority,
            'reporter_id' => $this->user->id,
        ]);
    }

    // Warm-up to eliminate one-time auth caching
    $this->actingAs($this->user)->getJson("/api/workspaces/{$ws1}/analytics");

    DB::flushQueryLog();
    DB::enableQueryLog();
    $this->actingAs($this->user)->getJson("/api/workspaces/{$ws1}/analytics");
    $queries2 = count(DB::getQueryLog());
    DB::disableQueryLog();

    // Workspace 2: 10 projects
    $ws2 = createAnalyticsWorkspace($this->groupId, '10 Projects WS');
    addAnalyticsWorkspaceMember($ws2, $this->user->id);
    for ($i = 0; $i < 10; $i++) {
        $p = createAnalyticsProject($ws2, "PX{$i}", "Project {$i}");
        createAnalyticsIssue($p, [
            'status_id' => $this->doneStatus,
            'issue_type_id' => $this->taskType,
            'priority_id' => $this->mediumPriority,
            'reporter_id' => $this->user->id,
        ]);
    }

    DB::flushQueryLog();
    DB::enableQueryLog();
    $this->actingAs($this->user)->getJson("/api/workspaces/{$ws2}/analytics");
    $queries10 = count(DB::getQueryLog());
    DB::disableQueryLog();

    // Invariance: query count should remain constant (<= 2 query difference variance at most, bounded <= 10)
    expect($queries10)->toBeLessThanOrEqual($queries2 + 1)
        ->and($queries10)->toBeLessThanOrEqual(10);
});

test('3.3: Query count invariance: scaling from 5 to 50 issues does not increase project query count', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Issue Scale WS');
    addAnalyticsWorkspaceMember($wsId, $this->user->id);

    // Project 1: 5 issues
    $p1 = createAnalyticsProject($wsId, 'IS5', '5 Issues');
    for ($i = 0; $i < 5; $i++) {
        createAnalyticsIssue($p1, [
            'status_id' => $this->doneStatus,
            'issue_type_id' => $this->taskType,
            'priority_id' => $this->mediumPriority,
            'reporter_id' => $this->user->id,
        ]);
    }

    // Warm-up to eliminate one-time auth caching difference
    $this->actingAs($this->user)->getJson("/api/projects/{$p1}/analytics");

    DB::flushQueryLog();
    DB::enableQueryLog();
    $this->actingAs($this->user)->getJson("/api/projects/{$p1}/analytics");
    $queriesP1 = count(DB::getQueryLog());
    DB::disableQueryLog();

    // Project 2: 50 issues
    $p2 = createAnalyticsProject($wsId, 'I50', '50 Issues');
    for ($i = 0; $i < 50; $i++) {
        createAnalyticsIssue($p2, [
            'status_id' => $this->doneStatus,
            'issue_type_id' => $this->taskType,
            'priority_id' => $this->mediumPriority,
            'reporter_id' => $this->user->id,
        ]);
    }

    DB::flushQueryLog();
    DB::enableQueryLog();
    $this->actingAs($this->user)->getJson("/api/projects/{$p2}/analytics");
    $queriesP2 = count(DB::getQueryLog());
    DB::disableQueryLog();

    // Invariance: query count should be identical
    expect($queriesP2)->toBe($queriesP1)
        ->and($queriesP2)->toBeLessThanOrEqual(8);
});

test('3.4: Sprint metrics combined with custom date range and specific sprint_id filter', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Sprint Filter WS');
    addAnalyticsWorkspaceMember($wsId, $this->user->id);

    $projId = createAnalyticsProject($wsId, 'SPF', 'Sprint Filter Project');

    $sprintA = createAnalyticsSprint($projId, 'Sprint Alpha', [
        'state' => 'CLOSED',
        'committed_points' => 20,
        'completed_points' => 20,
    ]);
    $sprintB = createAnalyticsSprint($projId, 'Sprint Beta', [
        'state' => 'ACTIVE',
        'committed_points' => 30,
        'completed_points' => 15,
    ]);

    createAnalyticsIssue($projId, [
        'status_id' => $this->doneStatus,
        'issue_type_id' => $this->taskType,
        'priority_id' => $this->mediumPriority,
        'reporter_id' => $this->user->id,
        'sprint_id' => $sprintA,
        'story_points' => 10,
    ]);

    $res = $this->actingAs($this->user)->getJson(
        "/api/projects/{$projId}/analytics?sprint_id={$sprintA}&date_range=custom&from=".now()->subDays(10)->toDateString().'&to='.now()->toDateString()
    );

    $res->assertStatus(200);
    expect($res->json('filters.sprint_id'))->toBe($sprintA)
        ->and($res->json('sprint_metrics.has_sprints'))->toBeTrue()
        ->and(count($res->json('sprint_metrics.velocity')))->toBe(2);
});

test('3.5: Superadmin can access analytics across all workspaces without explicit membership', function () {
    $privateWsId = createAnalyticsWorkspace(Str::uuid()->toString(), 'Private Superadmin WS');
    $privateProjId = createAnalyticsProject($privateWsId, 'PRV', 'Private Project');

    $this->actingAs($this->superAdmin)
        ->getJson("/api/workspaces/{$privateWsId}/analytics")
        ->assertStatus(200);

    $this->actingAs($this->superAdmin)
        ->getJson("/api/projects/{$privateProjId}/analytics")
        ->assertStatus(200);
});

// =========================================================================
// TIER 4: REAL-WORLD APPLICATION SCENARIOS & PERFORMANCE
// =========================================================================

test('4.1: Real-world multi-project software team sprint cycle verifies end-to-end KPI alignment', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Enterprise Portfolio');
    addAnalyticsWorkspaceMember($wsId, $this->user->id, 'admin', 8);

    // 3 projects: Frontend, Backend, Mobile
    $pFe = createAnalyticsProject($wsId, 'FE', 'Frontend App', $this->user->id);
    $pBe = createAnalyticsProject($wsId, 'BE', 'Backend API', $this->user->id);
    $pMob = createAnalyticsProject($wsId, 'MOB', 'Mobile App', $this->user->id);

    // 5 team members with different roles and capacities
    $members = [];
    foreach (['Dev1', 'Dev2', 'QA', 'Lead'] as $name) {
        $u = UserModel::factory()->create(['name' => $name, 'org_unit_id' => $this->groupId]);
        addAnalyticsWorkspaceMember($wsId, $u->id, 'member', 8);
        $members[$name] = $u;
    }

    // Seed 15 issues across the 3 projects with mixed points and estimates
    // Frontend: 6 issues (4 done, 2 in progress)
    for ($i = 0; $i < 4; $i++) {
        $iss = createAnalyticsIssue($pFe, [
            'status_id' => $this->doneStatus,
            'issue_type_id' => $this->storyType,
            'priority_id' => $this->highPriority,
            'reporter_id' => $this->user->id,
            'assignee_id' => $members['Dev1']->id,
            'story_points' => 5,
            'original_estimate_seconds' => 14400, // 4h
        ]);
        createAnalyticsWorklog($iss, $members['Dev1']->id, 14400);
    }
    for ($i = 0; $i < 2; $i++) {
        createAnalyticsIssue($pFe, [
            'status_id' => $this->inProgressStatus,
            'issue_type_id' => $this->taskType,
            'priority_id' => $this->mediumPriority,
            'reporter_id' => $this->user->id,
            'assignee_id' => $members['Dev1']->id,
            'story_points' => 3,
            'original_estimate_seconds' => 7200,
        ]);
    }

    // Backend: 5 issues (3 done, 2 todo)
    for ($i = 0; $i < 3; $i++) {
        $iss = createAnalyticsIssue($pBe, [
            'status_id' => $this->doneStatus,
            'issue_type_id' => $this->bugType,
            'priority_id' => $this->highPriority,
            'reporter_id' => $this->user->id,
            'assignee_id' => $members['Dev2']->id,
            'story_points' => 2,
            'original_estimate_seconds' => 7200,
        ]);
        createAnalyticsWorklog($iss, $members['Dev2']->id, 7200);
    }
    for ($i = 0; $i < 2; $i++) {
        createAnalyticsIssue($pBe, [
            'status_id' => $this->todoStatus,
            'issue_type_id' => $this->taskType,
            'priority_id' => $this->lowPriority,
            'reporter_id' => $this->user->id,
            'assignee_id' => $members['QA']->id,
            'story_points' => 1,
            'original_estimate_seconds' => 3600,
        ]);
    }

    // Mobile: 4 issues (2 done, 2 todo)
    for ($i = 0; $i < 2; $i++) {
        createAnalyticsIssue($pMob, [
            'status_id' => $this->doneStatus,
            'issue_type_id' => $this->storyType,
            'priority_id' => $this->mediumPriority,
            'reporter_id' => $this->user->id,
            'assignee_id' => $members['Lead']->id,
            'story_points' => 8,
            'original_estimate_seconds' => 28800,
        ]);
    }
    for ($i = 0; $i < 2; $i++) {
        createAnalyticsIssue($pMob, [
            'status_id' => $this->todoStatus,
            'issue_type_id' => $this->taskType,
            'priority_id' => $this->lowPriority,
            'reporter_id' => $this->user->id,
            'assignee_id' => $members['Lead']->id,
            'story_points' => 3,
            'original_estimate_seconds' => 7200,
        ]);
    }

    $response = $this->actingAs($this->user)->getJson("/api/workspaces/{$wsId}/analytics");
    $response->assertStatus(200);

    $summary = $response->json('summary');
    expect($summary['total_projects'])->toBe(3)
        ->and($summary['total_issues'])->toBe(15)
        ->and($summary['completed_issues'])->toBe(9)
        ->and((float) $summary['completion_rate'])->toBe(60.0);

    $workloads = collect($response->json('member_workload'));
    $dev1Stats = $workloads->firstWhere('user_id', $members['Dev1']->id);
    expect($dev1Stats)->not->toBeNull()
        ->and($dev1Stats['task_count'])->toBe(6)
        ->and($dev1Stats['completed_task_count'])->toBe(4)
        ->and((float) $dev1Stats['logged_hours'])->toBe(16.0);
});

test('4.2: Mixed scrum/kanban portfolio with varying member capacities and utilization rates', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Mixed Agile Portfolio');
    addAnalyticsWorkspaceMember($wsId, $this->user->id);

    // Part-time member (4h/day) vs Full-time member (8h/day)
    $partTimer = UserModel::factory()->create(['org_unit_id' => $this->groupId]);
    addAnalyticsWorkspaceMember($wsId, $partTimer->id, 'member', 4);

    $fullTimer = UserModel::factory()->create(['org_unit_id' => $this->groupId]);
    addAnalyticsWorkspaceMember($wsId, $fullTimer->id, 'member', 8);

    // Project 1: Scrum
    $scrumProj = createAnalyticsProject($wsId, 'SCM', 'Scrum Project');
    createAnalyticsSprint($scrumProj, 'Sprint 1', ['state' => 'ACTIVE', 'committed_points' => 20]);

    // Project 2: Kanban (no sprints)
    $kanbanProj = createAnalyticsProject($wsId, 'KNB', 'Kanban Project');

    // Part-timer logs 8h on Kanban
    $issK = createAnalyticsIssue($kanbanProj, [
        'status_id' => $this->doneStatus,
        'issue_type_id' => $this->taskType,
        'priority_id' => $this->mediumPriority,
        'reporter_id' => $this->user->id,
        'assignee_id' => $partTimer->id,
    ]);
    createAnalyticsWorklog($issK, $partTimer->id, 28800); // 8h

    $response = $this->actingAs($this->user)->getJson("/api/workspaces/{$wsId}/analytics");
    $response->assertStatus(200);

    $workloads = collect($response->json('member_workload'));
    $partTimeStats = $workloads->firstWhere('user_id', $partTimer->id);
    $fullTimeStats = $workloads->firstWhere('user_id', $fullTimer->id);

    // Monthly capacity: 4h * 20 = 80h; 8h * 20 = 160h
    expect((float) $partTimeStats['capacity_hours'])->toBe(80.0)
        ->and((float) $fullTimeStats['capacity_hours'])->toBe(160.0)
        ->and((float) $partTimeStats['logged_hours'])->toBe(8.0)
        // utilization: 8 / 80 * 100 = 10%
        ->and((float) $partTimeStats['utilization_rate'])->toBe(10.0);
});

test('4.3: High-load simulation asserting query execution time < 200ms on seeded dataset', function () {
    $wsId = createAnalyticsWorkspace($this->groupId, 'Perf Workspace');
    addAnalyticsWorkspaceMember($wsId, $this->user->id);

    // 5 projects with 10 issues each = 50 issues
    $projects = [];
    for ($p = 0; $p < 5; $p++) {
        $projId = createAnalyticsProject($wsId, "PF{$p}", "Perf Project {$p}");
        $projects[] = $projId;

        for ($i = 0; $i < 10; $i++) {
            $status = $i < 5 ? $this->doneStatus : ($i < 8 ? $this->inProgressStatus : $this->todoStatus);
            $iss = createAnalyticsIssue($projId, [
                'status_id' => $status,
                'issue_type_id' => $this->taskType,
                'priority_id' => $this->mediumPriority,
                'reporter_id' => $this->user->id,
                'assignee_id' => $this->user->id,
                'original_estimate_seconds' => 7200,
            ]);

            if ($i < 4) {
                createAnalyticsWorklog($iss, $this->user->id, 3600);
            }
        }
    }

    // Benchmark Workspace Analytics request
    $startWs = microtime(true);
    $wsRes = $this->actingAs($this->user)->getJson("/api/workspaces/{$wsId}/analytics");
    $durationWs = (microtime(true) - $startWs) * 1000;

    $wsRes->assertStatus(200);
    expect($durationWs)->toBeLessThan(200.0);

    // Benchmark Project Analytics request
    $startProj = microtime(true);
    $projRes = $this->actingAs($this->user)->getJson("/api/projects/{$projects[0]}/analytics");
    $durationProj = (microtime(true) - $startProj) * 1000;

    $projRes->assertStatus(200);
    expect($durationProj)->toBeLessThan(200.0);
});
