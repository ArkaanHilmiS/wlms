<?php

declare(strict_types=1);

use App\Modules\Workload\Application\DTOs\ArchiveProjectInput;
use App\Modules\Workload\Application\DTOs\CreateProjectInput;
use App\Modules\Workload\Application\DTOs\GetProjectsInput;
use App\Modules\Workload\Application\DTOs\ProjectOutput;
use App\Modules\Workload\Application\DTOs\UpdateProjectInput;
use App\Modules\Workload\Application\UseCases\ArchiveProjectUseCase;
use App\Modules\Workload\Application\UseCases\CreateProjectUseCase;
use App\Modules\Workload\Application\UseCases\GetProjectsUseCase;
use App\Modules\Workload\Application\UseCases\ImportProjectsUseCase;
use App\Modules\Workload\Application\UseCases\UpdateProjectUseCase;
use App\Modules\Workload\Domain\Entities\Project;
use App\Modules\Workload\Domain\Repositories\ProjectRepositoryInterface;
use App\Modules\Workload\Domain\ValueObjects\ProjectId;
use App\Modules\Workload\Domain\ValueObjects\ProjectKey;
use App\Modules\Workload\Domain\ValueObjects\WorkspaceId;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

uses(TestCase::class);

test('CreateProjectUseCase throws 403 exception when user is unauthorized', function () {
    $userRolesTable = Mockery::mock();
    $userRolesTable->shouldReceive('join')->once()->andReturnSelf();
    $userRolesTable->shouldReceive('where')->twice()->andReturnSelf();
    $userRolesTable->shouldReceive('exists')->once()->andReturnFalse();

    $usersTable = Mockery::mock();
    $usersTable->shouldReceive('where')->once()->andReturnSelf();
    $usersTable->shouldReceive('select')->once()->andReturnSelf();
    $usersTable->shouldReceive('first')->once()->andReturn((object) ['org_unit_id' => 'unit-a']);

    $workspacesTable = Mockery::mock();
    $workspacesTable->shouldReceive('where')->once()->andReturnSelf();
    $workspacesTable->shouldReceive('select')->once()->andReturnSelf();
    $workspacesTable->shouldReceive('first')->once()->andReturn((object) ['owner_group_id' => 'unit-b']);

    $membersTable = Mockery::mock();
    $membersTable->shouldReceive('where')->times(3)->andReturnSelf();
    $membersTable->shouldReceive('exists')->once()->andReturnFalse();

    DB::shouldReceive('table')->with('user_roles')->andReturn($userRolesTable);
    DB::shouldReceive('table')->with('users')->andReturn($usersTable);
    DB::shouldReceive('table')->with('workspaces')->andReturn($workspacesTable);
    DB::shouldReceive('table')->with('workspace_members')->andReturn($membersTable);

    $repo = Mockery::mock(ProjectRepositoryInterface::class);
    $useCase = new CreateProjectUseCase($repo);
    $input = new CreateProjectInput(
        projectId: 'proj-1',
        workspaceId: '01923abc-0000-7000-8000-000000000001',
        key: 'PRJ',
        name: 'Project One',
        description: null,
        leadId: null,
        actorUserId: '99'
    );

    expect(fn () => $useCase->execute($input))
        ->toThrow(Exception::class, 'Unauthorized: You must be a workspace admin or internal member to create projects.');
});

test('CreateProjectUseCase throws exception when project key already exists', function () {
    $userRolesTable = Mockery::mock();
    $userRolesTable->shouldReceive('join')->once()->andReturnSelf();
    $userRolesTable->shouldReceive('where')->twice()->andReturnSelf();
    $userRolesTable->shouldReceive('exists')->once()->andReturnTrue();

    DB::shouldReceive('table')->with('user_roles')->andReturn($userRolesTable);

    $repo = Mockery::mock(ProjectRepositoryInterface::class);
    $repo->shouldReceive('existsByKey')->once()->andReturnTrue();

    $useCase = new CreateProjectUseCase($repo);
    $input = new CreateProjectInput(
        projectId: 'proj-1',
        workspaceId: '01923abc-0000-7000-8000-000000000001',
        key: 'PRJ',
        name: 'Project One',
        description: null,
        leadId: null,
        actorUserId: '1'
    );

    expect(fn () => $useCase->execute($input))
        ->toThrow(Exception::class, 'Project key already exists.');
});

test('CreateProjectUseCase creates and saves project when authorized', function () {
    $userRolesTable = Mockery::mock();
    $userRolesTable->shouldReceive('join')->once()->andReturnSelf();
    $userRolesTable->shouldReceive('where')->twice()->andReturnSelf();
    $userRolesTable->shouldReceive('exists')->once()->andReturnTrue();

    DB::shouldReceive('table')->with('user_roles')->andReturn($userRolesTable);

    $repo = Mockery::mock(ProjectRepositoryInterface::class);
    $repo->shouldReceive('existsByKey')->once()->andReturnFalse();
    $repo->shouldReceive('save')->once()->with(Mockery::on(function (Project $project) {
        return $project->getId()->value === 'proj-1'
            && $project->getKey()->value === 'PRJ'
            && $project->getPriorityId()?->value === 'prio-1';
    }));

    $useCase = new CreateProjectUseCase($repo);
    $output = $useCase->execute(new CreateProjectInput(
        projectId: 'proj-1',
        workspaceId: '01923abc-0000-7000-8000-000000000001',
        key: 'PRJ',
        name: 'Project One',
        description: 'Desc',
        leadId: '1',
        actorUserId: '1',
        priorityId: 'prio-1'
    ));

    expect($output)->toBeInstanceOf(ProjectOutput::class)
        ->and($output->id)->toBe('proj-1')
        ->and($output->key)->toBe('PRJ')
        ->and($output->priorityId)->toBe('prio-1');
});

test('UpdateProjectUseCase throws exception when project not found', function () {
    DB::shouldReceive('transaction')->once()->andReturnUsing(fn ($cb) => $cb());

    $repo = Mockery::mock(ProjectRepositoryInterface::class);
    $repo->shouldReceive('findById')->once()->andReturnNull();

    $useCase = new UpdateProjectUseCase($repo);
    $input = new UpdateProjectInput('proj-1', 'Updated', null, null, null, '1');

    expect(fn () => $useCase->execute($input))
        ->toThrow(InvalidArgumentException::class, 'Project not found');
});

test('UpdateProjectUseCase updates project details and saves within transaction', function () {
    DB::shouldReceive('transaction')->once()->andReturnUsing(fn ($cb) => $cb());

    $project = Project::create(
        new ProjectId('proj-1'),
        new WorkspaceId('01923abc-0000-7000-8000-000000000001'),
        new ProjectKey('PRJ'),
        'Old Name',
        null,
        null,
        '1'
    );

    $repo = Mockery::mock(ProjectRepositoryInterface::class);
    $repo->shouldReceive('findById')->once()->andReturn($project);
    $repo->shouldReceive('save')->once()->with(Mockery::on(function (Project $p) {
        return $p->getName() === 'New Name'
            && $p->getWorkflowId()?->value === 'wf-1'
            && $p->getPriorityId()?->value === 'prio-2';
    }));

    $useCase = new UpdateProjectUseCase($repo);
    $useCase->execute(new UpdateProjectInput('proj-1', 'New Name', 'New Desc', '2', 'wf-1', '1', 'prio-2'));

    expect($project->getName())->toBe('New Name')
        ->and($project->getDescription())->toBe('New Desc');
});

test('ArchiveProjectUseCase throws exception when project not found', function () {
    DB::shouldReceive('transaction')->once()->andReturnUsing(fn ($cb) => $cb());

    $repo = Mockery::mock(ProjectRepositoryInterface::class);
    $repo->shouldReceive('findById')->once()->andReturnNull();

    $useCase = new ArchiveProjectUseCase($repo);

    expect(fn () => $useCase->execute(new ArchiveProjectInput('proj-1', '1')))
        ->toThrow(InvalidArgumentException::class, 'Project not found');
});

test('ArchiveProjectUseCase archives project and saves within transaction', function () {
    DB::shouldReceive('transaction')->once()->andReturnUsing(fn ($cb) => $cb());

    $project = Project::create(
        new ProjectId('proj-1'),
        new WorkspaceId('01923abc-0000-7000-8000-000000000001'),
        new ProjectKey('PRJ'),
        'Active Project',
        null,
        null,
        '1'
    );

    $repo = Mockery::mock(ProjectRepositoryInterface::class);
    $repo->shouldReceive('findById')->once()->andReturn($project);
    $repo->shouldReceive('save')->once()->with(Mockery::on(fn (Project $p) => $p->getStatus() === 'ARCHIVED'));

    $useCase = new ArchiveProjectUseCase($repo);
    $useCase->execute(new ArchiveProjectInput('proj-1', '1'));

    expect($project->getStatus())->toBe('ARCHIVED');
});

test('GetProjectsUseCase returns mapped ProjectOutput array with cursor pagination', function () {
    $issuesSubQuery = Mockery::mock();
    $issuesSubQuery->shouldReceive('selectRaw')->andReturnSelf();
    $issuesSubQuery->shouldReceive('whereColumn')->andReturnSelf();
    $issuesSubQuery->shouldReceive('join')->andReturnSelf();
    $issuesSubQuery->shouldReceive('where')->andReturnSelf();

    $projectsQuery = Mockery::mock();
    $projectsQuery->shouldReceive('where')->with('projects.workspace_id', 'ws-1')->andReturnSelf();
    $projectsQuery->shouldReceive('whereNull')->with('projects.deleted_at')->andReturnSelf();
    $projectsQuery->shouldReceive('select')->andReturnSelf();
    $projectsQuery->shouldReceive('addSelect')->andReturnSelf();
    $projectsQuery->shouldReceive('orderBy')->with('id', 'asc')->andReturnSelf();
    $projectsQuery->shouldReceive('limit')->with(10)->andReturnSelf();
    $projectsQuery->shouldReceive('where')->with('id', '>', 'proj-0')->andReturnSelf();
    $projectsQuery->shouldReceive('get')->once()->andReturn(collect([
        (object) [
            'id' => 'proj-1',
            'workspace_id' => 'ws-1',
            'key' => 'BJT',
            'name' => 'Bank Jatim App',
            'description' => 'Core App',
            'status' => 'ACTIVE',
            'priority_id' => 'prio-1',
            'total_issues_count' => 12,
            'completed_issues_count' => 5,
            'start_date' => '2026-10-01 00:00:00',
            'end_date' => '2026-12-31 00:00:00',
        ],
    ]));

    $usersQuery = Mockery::mock();
    $usersQuery->shouldReceive('where')->with('id', '1')->andReturnSelf();
    $usersQuery->shouldReceive('where')->with(Mockery::type('Closure'))->andReturnSelf();
    $usersQuery->shouldReceive('exists')->once()->andReturnTrue();

    DB::shouldReceive('table')->with('projects')->andReturn($projectsQuery);
    DB::shouldReceive('table')->with('issues')->andReturn($issuesSubQuery);
    DB::shouldReceive('table')->with('users')->andReturn($usersQuery);

    $useCase = new GetProjectsUseCase;
    $outputs = $useCase->execute(new GetProjectsInput(
        actorUserId: '1',
        workspaceId: 'ws-1',
        limit: 10,
        cursor: 'proj-0'
    ));

    expect($outputs)->toHaveCount(1)
        ->and($outputs[0])->toBeInstanceOf(ProjectOutput::class)
        ->and($outputs[0]->id)->toBe('proj-1')
        ->and($outputs[0]->key)->toBe('BJT')
        ->and($outputs[0]->totalIssuesCount)->toBe(12)
        ->and($outputs[0]->completedIssuesCount)->toBe(5)
        ->and($outputs[0]->startDate)->toBe('2026-10-01')
        ->and($outputs[0]->endDate)->toBe('2026-12-31');
});

test('ImportProjectsUseCase imports valid rows, generates unique keys, and skips empty names', function () {
    DB::shouldReceive('transaction')->once()->andReturnUsing(fn ($cb) => $cb());
    Log::shouldReceive('warning')->once();

    $prioritiesTable = Mockery::mock();
    $prioritiesTable->shouldReceive('orderBy')->once()->with('level')->andReturnSelf();
    $prioritiesTable->shouldReceive('first')->once()->andReturn((object) ['id' => 'prio-default']);

    $projectsTable = Mockery::mock();
    $projectsTable->shouldReceive('where')->once()->with('workspace_id', 'ws-1')->andReturnSelf();
    $projectsTable->shouldReceive('pluck')->once()->with('key')->andReturn(collect(['COR']));
    $projectsTable->shouldReceive('insert')->once()->with(Mockery::on(function (array $chunk) {
        return count($chunk) === 2
            && $chunk[0]['key'] === 'COR1'
            && $chunk[0]['name'] === 'Core System'
            && $chunk[1]['key'] === 'PRJ'
            && $chunk[1]['name'] === '!!!';
    }))->andReturnTrue();

    DB::shouldReceive('table')->with('priorities')->andReturn($prioritiesTable);
    DB::shouldReceive('table')->with('projects')->andReturn($projectsTable);

    $rows = collect([
        ['project_name' => null],
        [
            'project_name' => 'Core System',
            'status' => 'active',
            'description' => 'Main system',
            'start_date' => '2026-10-01',
            'end_date' => 'invalid-date',
        ],
        [
            'name' => '!!!',
        ],
    ]);

    $useCase = new ImportProjectsUseCase;
    $result = $useCase->execute($rows, 'ws-1');

    expect($result['total_rows'])->toBe(3)
        ->and($result['success_count'])->toBe(2)
        ->and($result['skipped_count'])->toBe(1)
        ->and($result['errors'])->toHaveCount(1);
});
