<?php

declare(strict_types=1);

use App\Modules\Workload\Application\UseCases\DeleteIssueUseCase;
use App\Modules\Workload\Domain\Entities\Issue;
use App\Modules\Workload\Domain\Repositories\IssueRepositoryInterface;
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

    $useCase = new DeleteIssueUseCase($issueRepo);

    expect(fn () => $useCase->execute('issue-1'))
        ->toThrow(Exception::class, 'Issue not found.');
});

test('successfully deletes issue via repository', function () {
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
    $issueRepo->shouldReceive('delete')->once()->with(Mockery::on(function (IssueId $id) {
        return $id->value === 'issue-1';
    }));

    $useCase = new DeleteIssueUseCase($issueRepo);
    $useCase->execute('issue-1');

    expect(true)->toBeTrue();
});
