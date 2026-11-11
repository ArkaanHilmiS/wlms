<?php

declare(strict_types=1);

use App\Modules\Workload\Application\DTOs\AssignIssueInput;
use App\Modules\Workload\Application\DTOs\IssueOutput;
use App\Modules\Workload\Application\UseCases\AssignIssueUseCase;
use App\Modules\Workload\Domain\Entities\Issue;
use App\Modules\Workload\Domain\Repositories\IssueRepositoryInterface;
use App\Modules\Workload\Domain\ValueObjects\AssigneeId;
use App\Modules\Workload\Domain\ValueObjects\IssueId;
use App\Modules\Workload\Domain\ValueObjects\IssueNumber;
use App\Modules\Workload\Domain\ValueObjects\IssueTypeId;
use App\Modules\Workload\Domain\ValueObjects\PriorityId;
use App\Modules\Workload\Domain\ValueObjects\ProjectId;
use App\Modules\Workload\Domain\ValueObjects\StatusId;
use Tests\TestCase;

uses(TestCase::class);

test('throws exception when issue not found', function () {
    $issueRepo = Mockery::mock(IssueRepositoryInterface::class);
    $issueRepo->shouldReceive('findById')->once()->andReturnNull();

    $useCase = new AssignIssueUseCase($issueRepo);
    $input = new AssignIssueInput('issue-1', '42', 'actor-1');

    expect(fn () => $useCase->execute($input))
        ->toThrow(Exception::class, 'Issue not found.');
});

test('successfully assigns issue to user', function () {
    $issueRepo = Mockery::mock(IssueRepositoryInterface::class);

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
    $issueRepo->shouldReceive('save')->once()->with(Mockery::on(function (Issue $savedIssue) {
        return $savedIssue->getAssigneeId()?->value === 42;
    }));

    $useCase = new AssignIssueUseCase($issueRepo);
    $input = new AssignIssueInput('issue-1', '42', 'actor-1');

    $output = $useCase->execute($input);

    expect($output)->toBeInstanceOf(IssueOutput::class)
        ->and($output->id)->toBe('issue-1');
});

test('successfully unassigns issue when assigneeId is null', function () {
    $issueRepo = Mockery::mock(IssueRepositoryInterface::class);

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
    $issue->assign(new AssigneeId('42'), 'actor-1');

    $issueRepo->shouldReceive('findById')->once()->andReturn($issue);
    $issueRepo->shouldReceive('save')->once()->with(Mockery::on(function (Issue $savedIssue) {
        return $savedIssue->getAssigneeId() === null;
    }));

    $useCase = new AssignIssueUseCase($issueRepo);
    $input = new AssignIssueInput('issue-1', null, 'actor-1');

    $output = $useCase->execute($input);

    expect($output)->toBeInstanceOf(IssueOutput::class)
        ->and($output->id)->toBe('issue-1');
});
