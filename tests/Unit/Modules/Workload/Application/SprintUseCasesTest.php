<?php

declare(strict_types=1);

use App\Modules\Workload\Application\DTOs\CreateSprintInput;
use App\Modules\Workload\Application\DTOs\SprintOutput;
use App\Modules\Workload\Application\UseCases\CompleteSprintUseCase;
use App\Modules\Workload\Application\UseCases\CreateSprintUseCase;
use App\Modules\Workload\Application\UseCases\StartSprintUseCase;
use App\Modules\Workload\Domain\Entities\Issue;
use App\Modules\Workload\Domain\Entities\Project;
use App\Modules\Workload\Domain\Entities\Sprint;
use App\Modules\Workload\Domain\Repositories\IssueRepositoryInterface;
use App\Modules\Workload\Domain\Repositories\ProjectRepositoryInterface;
use App\Modules\Workload\Domain\Repositories\SprintRepositoryInterface;
use App\Modules\Workload\Domain\ValueObjects\IssueId;
use App\Modules\Workload\Domain\ValueObjects\IssueNumber;
use App\Modules\Workload\Domain\ValueObjects\IssueTypeId;
use App\Modules\Workload\Domain\ValueObjects\PriorityId;
use App\Modules\Workload\Domain\ValueObjects\ProjectId;
use App\Modules\Workload\Domain\ValueObjects\ProjectKey;
use App\Modules\Workload\Domain\ValueObjects\SprintId;
use App\Modules\Workload\Domain\ValueObjects\StatusId;
use App\Modules\Workload\Domain\ValueObjects\WorkspaceId;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class);

test('CreateSprintUseCase throws exception when project not found', function () {
    $sprintRepo = Mockery::mock(SprintRepositoryInterface::class);
    $projectRepo = Mockery::mock(ProjectRepositoryInterface::class);
    $projectRepo->shouldReceive('findById')->once()->andReturnNull();

    $useCase = new CreateSprintUseCase($sprintRepo, $projectRepo);
    $input = new CreateSprintInput('sprint-1', 'project-1', 'Sprint 1', 'Goal', 'user-1');

    expect(fn () => $useCase->execute($input))
        ->toThrow(Exception::class, 'Project not found.');
});

test('CreateSprintUseCase throws exception when project is archived', function () {
    $sprintRepo = Mockery::mock(SprintRepositoryInterface::class);
    $projectRepo = Mockery::mock(ProjectRepositoryInterface::class);

    $project = Project::create(
        new ProjectId('project-1'),
        new WorkspaceId('01923abc-0000-7000-8000-000000000001'),
        new ProjectKey('PRJ'),
        'Archived Project',
        null,
        null,
        'user-1'
    );
    $project->archive('user-1');

    $projectRepo->shouldReceive('findById')->once()->andReturn($project);

    $useCase = new CreateSprintUseCase($sprintRepo, $projectRepo);
    $input = new CreateSprintInput('sprint-1', 'project-1', 'Sprint 1', 'Goal', 'user-1');

    expect(fn () => $useCase->execute($input))
        ->toThrow(Exception::class, 'Cannot create sprint in an archived project.');
});

test('CreateSprintUseCase creates and saves PENDING sprint', function () {
    $sprintRepo = Mockery::mock(SprintRepositoryInterface::class);
    $projectRepo = Mockery::mock(ProjectRepositoryInterface::class);

    $project = Project::create(
        new ProjectId('project-1'),
        new WorkspaceId('01923abc-0000-7000-8000-000000000001'),
        new ProjectKey('PRJ'),
        'Active Project',
        null,
        null,
        'user-1'
    );

    $projectRepo->shouldReceive('findById')->once()->andReturn($project);
    $sprintRepo->shouldReceive('save')->once()->with(Mockery::on(function (Sprint $sprint) {
        return $sprint->getId()->value === 'sprint-1'
            && $sprint->getName() === 'Sprint 1'
            && $sprint->getGoal() === 'Deliver MVP'
            && $sprint->getState() === 'PENDING';
    }));

    $useCase = new CreateSprintUseCase($sprintRepo, $projectRepo);
    $output = $useCase->execute(new CreateSprintInput('sprint-1', 'project-1', 'Sprint 1', 'Deliver MVP', 'user-1'));

    expect($output)->toBeInstanceOf(SprintOutput::class)
        ->and($output->id)->toBe('sprint-1')
        ->and($output->state)->toBe('PENDING');
});

test('StartSprintUseCase throws exception when sprint not found', function () {
    $sprintRepo = Mockery::mock(SprintRepositoryInterface::class);
    $sprintRepo->shouldReceive('findById')->once()->andReturnNull();

    $useCase = new StartSprintUseCase($sprintRepo);

    expect(fn () => $useCase->execute('sprint-1'))
        ->toThrow(InvalidArgumentException::class, 'Sprint not found');
});

test('StartSprintUseCase throws exception when project already has active sprint', function () {
    $sprintRepo = Mockery::mock(SprintRepositoryInterface::class);
    $sprint = Sprint::create(new SprintId('sprint-1'), new ProjectId('project-1'), 'Sprint 1', null, 'user-1');

    $sprintRepo->shouldReceive('findById')->once()->andReturn($sprint);
    $sprintRepo->shouldReceive('hasActiveSprint')->once()->andReturnTrue();

    $useCase = new StartSprintUseCase($sprintRepo);

    expect(fn () => $useCase->execute('sprint-1'))
        ->toThrow(InvalidArgumentException::class, 'Another sprint is already active in this project');
});

test('StartSprintUseCase starts pending sprint and saves', function () {
    $sprintRepo = Mockery::mock(SprintRepositoryInterface::class);
    $sprint = Sprint::create(new SprintId('sprint-1'), new ProjectId('project-1'), 'Sprint 1', null, 'user-1');

    $sprintRepo->shouldReceive('findById')->once()->andReturn($sprint);
    $sprintRepo->shouldReceive('hasActiveSprint')->once()->andReturnFalse();
    $sprintRepo->shouldReceive('save')->once()->with(Mockery::on(function (Sprint $saved) {
        return $saved->getState() === 'ACTIVE' && $saved->getStartDate() !== null;
    }));

    $useCase = new StartSprintUseCase($sprintRepo);
    $useCase->execute('sprint-1');

    expect($sprint->getState())->toBe('ACTIVE');
});

test('CompleteSprintUseCase throws exception when sprint not found', function () {
    $sprintRepo = Mockery::mock(SprintRepositoryInterface::class);
    $sprintRepo->shouldReceive('findById')->once()->andReturnNull();

    $useCase = new CompleteSprintUseCase($sprintRepo);

    expect(fn () => $useCase->execute('sprint-1', 'user-1'))
        ->toThrow(InvalidArgumentException::class, 'Sprint not found');
});

test('CompleteSprintUseCase completes active sprint and moves unfinished issues to target sprint', function () {
    $sprintRepo = Mockery::mock(SprintRepositoryInterface::class);
    $sprint = Sprint::create(new SprintId('sprint-1'), new ProjectId('project-1'), 'Sprint 1', null, 'user-1');
    $sprint->start(new DateTimeImmutable);

    $sprintRepo->shouldReceive('findById')->once()->andReturn($sprint);
    $sprintRepo->shouldReceive('save')->once()->with(Mockery::on(fn (Sprint $s) => $s->getState() === 'COMPLETED'));

    $queryMock = Mockery::mock();
    $queryMock->shouldReceive('join')->once()->with('statuses', 'issues.status_id', '=', 'statuses.id')->andReturnSelf();
    $queryMock->shouldReceive('where')->once()->with('issues.sprint_id', 'sprint-1')->andReturnSelf();
    $queryMock->shouldReceive('whereNull')->once()->with('issues.deleted_at')->andReturnSelf();
    $queryMock->shouldReceive('where')->once()->with('statuses.category', '!=', 'DONE')->andReturnSelf();
    $queryMock->shouldReceive('pluck')->once()->with('issues.id')->andReturn(collect(['issue-1']));

    DB::shouldReceive('table')->once()->with('issues')->andReturn($queryMock);

    $issue = Issue::create(
        new IssueId('issue-1'),
        new ProjectId('project-1'),
        new IssueNumber('PRJ', 1),
        'Unfinished Issue',
        'Desc',
        new IssueTypeId('type-1'),
        new PriorityId('prio-1'),
        new StatusId('status-todo'),
        new SprintId('sprint-1'),
        'user-1'
    );

    $issueRepo = Mockery::mock(IssueRepositoryInterface::class);
    $issueRepo->shouldReceive('findById')->once()->with(Mockery::on(fn (IssueId $id) => $id->value === 'issue-1'))->andReturn($issue);
    $issueRepo->shouldReceive('save')->once()->with(Mockery::on(function (Issue $savedIssue) {
        return $savedIssue->getSprintId()?->value === 'sprint-2';
    }));

    app()->instance(IssueRepositoryInterface::class, $issueRepo);

    $useCase = new CompleteSprintUseCase($sprintRepo);
    $useCase->execute('sprint-1', 'user-1', 'sprint-2');

    expect($sprint->getState())->toBe('COMPLETED')
        ->and($issue->getSprintId()?->value)->toBe('sprint-2');
});
