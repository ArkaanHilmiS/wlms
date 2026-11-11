<?php

declare(strict_types=1);

use App\Modules\Workload\Application\DTOs\LogWorkInput;
use App\Modules\Workload\Application\UseCases\LogWorkUseCase;
use App\Modules\Workload\Domain\Entities\Issue;
use App\Modules\Workload\Domain\Repositories\IssueRepositoryInterface;
use App\Modules\Workload\Domain\ValueObjects\IssueId;
use App\Modules\Workload\Domain\ValueObjects\IssueNumber;
use App\Modules\Workload\Domain\ValueObjects\IssueTypeId;
use App\Modules\Workload\Domain\ValueObjects\PriorityId;
use App\Modules\Workload\Domain\ValueObjects\ProjectId;
use App\Modules\Workload\Domain\ValueObjects\StatusId;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('throws exception when issue not found', function () {
    $issueRepo = Mockery::mock(IssueRepositoryInterface::class);
    $issueRepo->shouldReceive('findById')->once()->andReturnNull();

    $useCase = new LogWorkUseCase($issueRepo);
    $input = new LogWorkInput('issue-1', '1', 3600, 'Worked on bug', '2026-10-14 10:00:00');

    expect(fn () => $useCase->execute($input))
        ->toThrow(InvalidArgumentException::class, 'Issue not found');
});

test('successfully logs work and decrements remaining_estimate_seconds', function () {
    $workspaceId = (string) Str::uuid();
    DB::table('workspaces')->insert([
        'id' => $workspaceId,
        'owner_group_id' => (string) Str::uuid(),
        'name' => 'W',
        'status' => 'ACTIVE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $workflowId = (string) Str::uuid();
    DB::table('workflows')->insert([
        'id' => $workflowId,
        'name' => 'Default',
        'is_default' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $projectId = (string) Str::uuid();
    DB::table('projects')->insert([
        'id' => $projectId,
        'workspace_id' => $workspaceId,
        'workflow_id' => $workflowId,
        'key' => 'TEST',
        'name' => 'Test Project',
        'status' => 'ACTIVE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $issueTypeId = (string) Str::uuid();
    DB::table('issue_types')->insert([
        'id' => $issueTypeId,
        'name' => 'Task',
        'slug' => 'task',
        'icon' => 'check',
        'color' => '#000',
        'sort_order' => 1,
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $priorityId = (string) Str::uuid();
    DB::table('priorities')->insert([
        'id' => $priorityId,
        'name' => 'High',
        'slug' => 'high',
        'level' => 1,
        'color' => '#000',
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $statusId = (string) Str::uuid();
    DB::table('statuses')->insert([
        'id' => $statusId,
        'name' => 'To Do',
        'slug' => 'todo',
        'category' => 'TODO',
        'color' => '#000',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $issueId = (string) Str::uuid();

    DB::table('issues')->insert([
        'id' => $issueId,
        'project_id' => $projectId,
        'status_id' => $statusId,
        'number' => 1,
        'title' => 'Issue for worklog',
        'issue_type_id' => $issueTypeId,
        'priority_id' => $priorityId,
        'reporter_id' => 1,
        'original_estimate_seconds' => 7200,
        'remaining_estimate_seconds' => 7200,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $issue = Issue::create(
        new IssueId($issueId),
        new ProjectId($projectId),
        new IssueNumber('TEST', 1),
        'Issue for worklog',
        null,
        new IssueTypeId($issueTypeId),
        new PriorityId($priorityId),
        new StatusId($statusId),
        null,
        '1',
        7200
    );

    $issueRepo = Mockery::mock(IssueRepositoryInterface::class);
    $issueRepo->shouldReceive('findById')->once()->andReturn($issue);

    $useCase = new LogWorkUseCase($issueRepo);
    $input = new LogWorkInput(
        issueId: $issueId,
        authorUserId: '1',
        timeSpentSeconds: 3600,
        description: 'Completed analysis',
        startedAt: '2026-10-14 10:00:00'
    );

    $useCase->execute($input);

    $this->assertDatabaseHas('worklogs', [
        'issue_id' => $issueId,
        'author_id' => 1,
        'time_spent_seconds' => 3600,
        'description' => 'Completed analysis',
    ]);

    $this->assertDatabaseHas('issues', [
        'id' => $issueId,
        'remaining_estimate_seconds' => 3600,
    ]);
});
