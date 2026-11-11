<?php

declare(strict_types=1);

use App\Modules\Workload\Application\DTOs\IssueOutput;
use App\Modules\Workload\Application\DTOs\TransitionIssueInput;
use App\Modules\Workload\Application\UseCases\TransitionIssueStatusUseCase;
use App\Modules\Workload\Domain\Entities\Issue;
use App\Modules\Workload\Domain\Exceptions\InvalidTransitionException;
use App\Modules\Workload\Domain\Repositories\IssueRepositoryInterface;
use App\Modules\Workload\Domain\Repositories\WorkflowRepositoryInterface;
use App\Modules\Workload\Domain\Services\WorkflowEngine;
use App\Modules\Workload\Domain\ValueObjects\IssueId;
use App\Modules\Workload\Domain\ValueObjects\IssueNumber;
use App\Modules\Workload\Domain\ValueObjects\IssueTypeId;
use App\Modules\Workload\Domain\ValueObjects\PriorityId;
use App\Modules\Workload\Domain\ValueObjects\ProjectId;
use App\Modules\Workload\Domain\ValueObjects\StatusId;
use App\Modules\Workload\Domain\ValueObjects\WorkflowTransition;
use Tests\TestCase;

uses(TestCase::class);

test('throws exception when issue not found', function () {
    $issueRepo = Mockery::mock(IssueRepositoryInterface::class);
    $workflowRepo = Mockery::mock(WorkflowRepositoryInterface::class);

    $issueRepo->shouldReceive('findById')->once()->andReturnNull();

    $useCase = new TransitionIssueStatusUseCase($issueRepo, $workflowRepo);
    $input = new TransitionIssueInput('issue-1', 'status-in-progress', 'actor-1');

    expect(fn () => $useCase->execute($input))
        ->toThrow(Exception::class, 'Issue not found.');
});

test('throws InvalidTransitionException when transition is not allowed by workflow engine', function () {
    $issueRepo = Mockery::mock(IssueRepositoryInterface::class);
    $workflowRepo = Mockery::mock(WorkflowRepositoryInterface::class);

    $issue = Issue::create(
        new IssueId('issue-1'),
        new ProjectId('project-1'),
        new IssueNumber('PROJ', 1),
        'Issue Title',
        null,
        new IssueTypeId('type-1'),
        new PriorityId('prio-1'),
        new StatusId('status-todo'),
        null,
        'user-1'
    );

    $issueRepo->shouldReceive('findById')->once()->andReturn($issue);

    $engine = new WorkflowEngine([
        new WorkflowTransition('trans-1', 'status-todo', 'status-in-progress', 'Start'),
    ]);
    $workflowRepo->shouldReceive('getEngineForProject')->once()->andReturn($engine);

    $useCase = new TransitionIssueStatusUseCase($issueRepo, $workflowRepo);
    $input = new TransitionIssueInput('issue-1', 'status-done', 'actor-1');

    expect(fn () => $useCase->execute($input))
        ->toThrow(InvalidTransitionException::class);
});

test('successfully transitions issue status and saves', function () {
    $issueRepo = Mockery::mock(IssueRepositoryInterface::class);
    $workflowRepo = Mockery::mock(WorkflowRepositoryInterface::class);

    $issue = Issue::create(
        new IssueId('issue-1'),
        new ProjectId('project-1'),
        new IssueNumber('PROJ', 1),
        'Issue Title',
        null,
        new IssueTypeId('type-1'),
        new PriorityId('prio-1'),
        new StatusId('status-todo'),
        null,
        'user-1'
    );

    $issueRepo->shouldReceive('findById')->once()->andReturn($issue);

    $engine = new WorkflowEngine([
        new WorkflowTransition('trans-1', 'status-todo', 'status-in-progress', 'Start'),
    ]);
    $workflowRepo->shouldReceive('getEngineForProject')->once()->andReturn($engine);

    $issueRepo->shouldReceive('save')->once()->with(Mockery::on(function (Issue $savedIssue) {
        return $savedIssue->getStatusId()->value === 'status-in-progress';
    }));

    $useCase = new TransitionIssueStatusUseCase($issueRepo, $workflowRepo);
    $input = new TransitionIssueInput('issue-1', 'status-in-progress', 'actor-1');

    $output = $useCase->execute($input);

    expect($output)->toBeInstanceOf(IssueOutput::class)
        ->and($output->statusId)->toBe('status-in-progress');
});
