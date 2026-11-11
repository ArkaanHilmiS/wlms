<?php

declare(strict_types=1);

use App\Modules\Workload\Application\DTOs\CreateIssueInput;
use App\Modules\Workload\Application\DTOs\IssueOutput;
use App\Modules\Workload\Application\UseCases\CreateIssueUseCase;
use App\Modules\Workload\Domain\Entities\Issue;
use App\Modules\Workload\Domain\Entities\Project;
use App\Modules\Workload\Domain\Repositories\IssueRepositoryInterface;
use App\Modules\Workload\Domain\Repositories\ProjectRepositoryInterface;
use App\Modules\Workload\Domain\Repositories\WorkflowRepositoryInterface;
use App\Modules\Workload\Domain\ValueObjects\ProjectId;
use App\Modules\Workload\Domain\ValueObjects\ProjectKey;
use App\Modules\Workload\Domain\ValueObjects\WorkspaceId;
use Tests\TestCase;

uses(TestCase::class);

test('throws exception when project not found', function () {
    $issueRepo = Mockery::mock(IssueRepositoryInterface::class);
    $projectRepo = Mockery::mock(ProjectRepositoryInterface::class);
    $workflowRepo = Mockery::mock(WorkflowRepositoryInterface::class);

    $projectRepo->shouldReceive('findById')->once()->andReturnNull();

    $useCase = new CreateIssueUseCase($issueRepo, $projectRepo, $workflowRepo);
    $input = new CreateIssueInput(
        issueId: 'issue-1',
        projectId: 'project-1',
        title: 'New Issue',
        description: 'Description',
        issueTypeId: 'type-1',
        priorityId: 'priority-1',
        sprintId: null,
        reporterUserId: 'user-1'
    );

    expect(fn () => $useCase->execute($input))
        ->toThrow(Exception::class, 'Project not found.');
});

test('throws exception when project is archived', function () {
    $issueRepo = Mockery::mock(IssueRepositoryInterface::class);
    $projectRepo = Mockery::mock(ProjectRepositoryInterface::class);
    $workflowRepo = Mockery::mock(WorkflowRepositoryInterface::class);

    $project = Project::create(
        new ProjectId('project-1'),
        new WorkspaceId('01923abc-0000-7000-8000-000000000001'),
        new ProjectKey('PROJ'),
        'Archived Project',
        null,
        null,
        'user-1'
    );
    $project->archive('user-1');

    $projectRepo->shouldReceive('findById')->once()->andReturn($project);

    $useCase = new CreateIssueUseCase($issueRepo, $projectRepo, $workflowRepo);
    $input = new CreateIssueInput(
        issueId: 'issue-1',
        projectId: 'project-1',
        title: 'New Issue',
        description: null,
        issueTypeId: 'type-1',
        priorityId: 'priority-1',
        sprintId: null,
        reporterUserId: 'user-1'
    );

    expect(fn () => $useCase->execute($input))
        ->toThrow(Exception::class, 'Cannot create issue in an archived project.');
});

test('successfully creates issue with sequential number and initial workflow status', function () {
    $issueRepo = Mockery::mock(IssueRepositoryInterface::class);
    $projectRepo = Mockery::mock(ProjectRepositoryInterface::class);
    $workflowRepo = Mockery::mock(WorkflowRepositoryInterface::class);

    $project = Project::create(
        new ProjectId('project-1'),
        new WorkspaceId('01923abc-0000-7000-8000-000000000001'),
        new ProjectKey('PROJ'),
        'Active Project',
        null,
        null,
        'user-1'
    );

    $projectRepo->shouldReceive('findById')->once()->andReturn($project);
    $issueRepo->shouldReceive('nextNumberForProject')->once()->andReturn(10);
    $workflowRepo->shouldReceive('getInitialStatusId')->once()->andReturn('status-todo');

    $issueRepo->shouldReceive('save')->once()->with(Mockery::on(function (Issue $issue) {
        return $issue->getNumber()->display === 'PROJ-010'
            && $issue->getStatusId()->value === 'status-todo'
            && $issue->getTitle() === 'Task Title'
            && $issue->getAssigneeId() === null;
    }));

    $useCase = new CreateIssueUseCase($issueRepo, $projectRepo, $workflowRepo);
    $input = new CreateIssueInput(
        issueId: 'issue-1',
        projectId: 'project-1',
        title: 'Task Title',
        description: 'Details',
        issueTypeId: 'type-1',
        priorityId: 'priority-1',
        sprintId: null,
        reporterUserId: 'user-1',
        originalEstimateSeconds: 3600
    );

    $output = $useCase->execute($input);

    expect($output)->toBeInstanceOf(IssueOutput::class)
        ->and($output->id)->toBe('issue-1')
        ->and($output->projectId)->toBe('project-1')
        ->and($output->issueNumber)->toBe('PROJ-010')
        ->and($output->title)->toBe('Task Title')
        ->and($output->statusId)->toBe('status-todo');
});

test('assigns issue when assigneeId is provided in input', function () {
    $issueRepo = Mockery::mock(IssueRepositoryInterface::class);
    $projectRepo = Mockery::mock(ProjectRepositoryInterface::class);
    $workflowRepo = Mockery::mock(WorkflowRepositoryInterface::class);

    $project = Project::create(
        new ProjectId('project-1'),
        new WorkspaceId('01923abc-0000-7000-8000-000000000001'),
        new ProjectKey('PROJ'),
        'Active Project',
        null,
        null,
        'user-1'
    );

    $projectRepo->shouldReceive('findById')->once()->andReturn($project);
    $issueRepo->shouldReceive('nextNumberForProject')->once()->andReturn(1);
    $workflowRepo->shouldReceive('getInitialStatusId')->once()->andReturn('status-todo');

    $issueRepo->shouldReceive('save')->once()->with(Mockery::on(function (Issue $issue) {
        return $issue->getAssigneeId()?->value === 42;
    }));

    $useCase = new CreateIssueUseCase($issueRepo, $projectRepo, $workflowRepo);
    $input = new CreateIssueInput(
        issueId: 'issue-1',
        projectId: 'project-1',
        title: 'Assigned Task',
        description: null,
        issueTypeId: 'type-1',
        priorityId: 'priority-1',
        sprintId: null,
        reporterUserId: 'user-1',
        originalEstimateSeconds: null,
        assigneeId: '42'
    );

    $output = $useCase->execute($input);

    expect($output)->toBeInstanceOf(IssueOutput::class)
        ->and($output->id)->toBe('issue-1');
});

test('forwards startDate, dueDate, and parentId to Issue entity', function () {
    $issueRepo = Mockery::mock(IssueRepositoryInterface::class);
    $projectRepo = Mockery::mock(ProjectRepositoryInterface::class);
    $workflowRepo = Mockery::mock(WorkflowRepositoryInterface::class);

    $project = Project::create(
        new ProjectId('project-1'),
        new WorkspaceId('01923abc-0000-7000-8000-000000000001'),
        new ProjectKey('BJT'),
        'Bank Jatim Project',
        null,
        null,
        'user-1'
    );

    $projectRepo->shouldReceive('findById')->once()->andReturn($project);
    $issueRepo->shouldReceive('nextNumberForProject')->once()->andReturn(5);
    $workflowRepo->shouldReceive('getInitialStatusId')->once()->andReturn('status-todo');

    $issueRepo->shouldReceive('save')->once()->with(Mockery::on(function (Issue $issue) {
        return $issue->getStartDate() === '2026-10-20'
            && $issue->getDueDate() === '2026-10-30'
            && $issue->getParentId() === 'parent-uuid-1';
    }));

    $useCase = new CreateIssueUseCase($issueRepo, $projectRepo, $workflowRepo);
    $output = $useCase->execute(new CreateIssueInput(
        issueId: 'issue-sub-1',
        projectId: 'project-1',
        title: 'Subtask deploy MII',
        description: null,
        issueTypeId: 'type-1',
        priorityId: 'priority-1',
        sprintId: null,
        reporterUserId: 'user-1',
        originalEstimateSeconds: 1800,
        assigneeId: null,
        startDate: '2026-10-20',
        dueDate: '2026-10-30',
        parentId: 'parent-uuid-1',
    ));

    expect($output->issueNumber)->toBe('BJT-005');
});
