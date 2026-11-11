<?php

declare(strict_types=1);

use App\Modules\Workload\Application\DTOs\StatusDTO;
use App\Modules\Workload\Application\DTOs\WorkflowDTO;
use App\Modules\Workload\Application\UseCases\ImportIssuesUseCase;
use App\Modules\Workload\Application\UseCases\ManageStatusUseCase;
use App\Modules\Workload\Application\UseCases\ManageWorkflowUseCase;
use App\Modules\Workload\Domain\Entities\Status;
use App\Modules\Workload\Domain\Entities\Workflow;
use App\Modules\Workload\Domain\Repositories\StatusRepositoryInterface;
use App\Modules\Workload\Domain\Repositories\WorkflowRepositoryInterface;
use App\Modules\Workload\Domain\ValueObjects\StatusId;
use App\Modules\Workload\Domain\ValueObjects\WorkflowId;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

uses(TestCase::class);

test('ManageStatusUseCase creates, updates, deletes and lists statuses', function () {
    DB::shouldReceive('transaction')->times(3)->andReturnUsing(fn ($cb) => $cb());

    $repo = Mockery::mock(StatusRepositoryInterface::class);
    $repo->shouldReceive('save')->twice();

    $useCase = new ManageStatusUseCase($repo);

    // 1. Create
    $created = $useCase->create(new StatusDTO('In Review', 'in-review', 'IN_PROGRESS', '#3b82f6'));
    expect($created)->toBeInstanceOf(Status::class)
        ->and($created->getName())->toBe('In Review')
        ->and($created->getCategory())->toBe('IN_PROGRESS');

    // 2. Update
    $repo->shouldReceive('findById')->once()->andReturn($created);
    $updated = $useCase->update($created->getId()->value, new StatusDTO('QA Review', 'qa-review', 'IN_PROGRESS', '#10b981'));
    expect($updated->getName())->toBe('QA Review')
        ->and($updated->getSlug())->toBe('qa-review');

    // 3. Delete
    $repo->shouldReceive('delete')->once()->with(Mockery::on(fn (StatusId $id) => $id->value === $created->getId()->value));
    $useCase->delete($created->getId()->value);

    // 4. GetAll
    $repo->shouldReceive('findAll')->once()->andReturn([$updated]);
    expect($useCase->getAll())->toHaveCount(1);
});

test('ManageStatusUseCase throws exception when updating non-existent status', function () {
    DB::shouldReceive('transaction')->once()->andReturnUsing(fn ($cb) => $cb());

    $repo = Mockery::mock(StatusRepositoryInterface::class);
    $repo->shouldReceive('findById')->once()->andReturnNull();

    $useCase = new ManageStatusUseCase($repo);

    expect(fn () => $useCase->update('missing-id', new StatusDTO('Name', 'slug', 'TODO', null)))
        ->toThrow(Exception::class, 'Status not found');
});

test('ManageWorkflowUseCase creates, updates, deletes and lists workflows', function () {
    DB::shouldReceive('transaction')->times(3)->andReturnUsing(fn ($cb) => $cb());

    $repo = Mockery::mock(WorkflowRepositoryInterface::class);
    $repo->shouldReceive('save')->twice();

    $useCase = new ManageWorkflowUseCase($repo);

    // 1. Create
    $created = $useCase->create(new WorkflowDTO('Kanban Flow', 'Simple flow', true));
    expect($created)->toBeInstanceOf(Workflow::class)
        ->and($created->getName())->toBe('Kanban Flow')
        ->and($created->isDefault())->toBeTrue();

    // 2. Update
    $repo->shouldReceive('findById')->once()->andReturn($created);
    $updated = $useCase->update($created->getId()->value, new WorkflowDTO('Scrum Flow', 'Updated desc', false));
    expect($updated->getName())->toBe('Scrum Flow')
        ->and($updated->isDefault())->toBeFalse();

    // 3. Delete
    $repo->shouldReceive('delete')->once()->with(Mockery::on(fn (WorkflowId $id) => $id->value === $created->getId()->value));
    $useCase->delete($created->getId()->value);

    // 4. GetAll
    $repo->shouldReceive('findAll')->once()->andReturn([$updated]);
    expect($useCase->getAll())->toHaveCount(1);
});

test('ManageWorkflowUseCase throws exception when updating non-existent workflow', function () {
    DB::shouldReceive('transaction')->once()->andReturnUsing(fn ($cb) => $cb());

    $repo = Mockery::mock(WorkflowRepositoryInterface::class);
    $repo->shouldReceive('findById')->once()->andReturnNull();

    $useCase = new ManageWorkflowUseCase($repo);

    expect(fn () => $useCase->update('missing-id', new WorkflowDTO('Name', null, false)))
        ->toThrow(Exception::class, 'Workflow not found');
});

test('ImportIssuesUseCase imports valid rows and records errors for invalid rows without DB hit', function () {
    DB::shouldReceive('transaction')->once()->andReturnUsing(fn ($cb) => $cb());
    Log::shouldReceive('warning')->times(3);

    $issueTypesTable = Mockery::mock();
    $issueTypesTable->shouldReceive('where')->once()->with('name', 'Task')->andReturnSelf();
    $issueTypesTable->shouldReceive('first')->once()->andReturn((object) ['id' => 'type-task']);

    $prioritiesTable = Mockery::mock();
    $prioritiesTable->shouldReceive('orderBy')->once()->with('level')->andReturnSelf();
    $prioritiesTable->shouldReceive('first')->once()->andReturn((object) ['id' => 'prio-low']);
    $prioritiesTable->shouldReceive('get')->once()->andReturn(collect([
        (object) ['id' => 'prio-high', 'name' => 'High'],
        (object) ['id' => 'prio-low', 'name' => 'Low'],
    ]));

    $statusesTable = Mockery::mock();
    $statusesTable->shouldReceive('first')->once()->andReturn((object) ['id' => 'status-todo']);
    $statusesTable->shouldReceive('get')->once()->andReturn(collect([
        (object) ['id' => 'status-todo', 'name' => 'To Do'],
        (object) ['id' => 'status-done', 'name' => 'Done'],
    ]));

    $projectsTable = Mockery::mock();
    $projectsTable->shouldReceive('whereIn')->once()->andReturnSelf();
    $projectsTable->shouldReceive('pluck')->once()->with('id', 'name')->andReturn(collect([
        'Core Banking' => 'proj-1',
    ]));

    $usersTable = Mockery::mock();
    $usersTable->shouldReceive('orWhere')->andReturnSelf();
    $usersTable->shouldReceive('get')->once()->andReturn(collect([
        (object) ['id' => 7, 'name' => 'Budi Santoso', 'email' => 'budi@bankjatim.co.id', 'employee_id' => 'EMP007'],
    ]));

    $issuesTable = Mockery::mock();
    $issuesTable->shouldReceive('whereIn')->once()->with('project_id', ['proj-1'])->andReturnSelf();
    $issuesTable->shouldReceive('select')->once()->andReturnSelf();
    $issuesTable->shouldReceive('groupBy')->once()->with('project_id')->andReturnSelf();
    $issuesTable->shouldReceive('get')->once()->andReturn(collect([
        (object) ['project_id' => 'proj-1', 'max_number' => 4],
    ]));
    $issuesTable->shouldReceive('insert')->once()->with(Mockery::on(function (array $chunk) {
        return count($chunk) === 1
            && $chunk[0]['project_id'] === 'proj-1'
            && $chunk[0]['number'] === 5
            && $chunk[0]['title'] === 'Setup API Gateway'
            && $chunk[0]['assignee_id'] === 7
            && $chunk[0]['priority_id'] === 'prio-high'
            && $chunk[0]['status_id'] === 'status-done';
    }))->andReturnTrue();

    DB::shouldReceive('raw')->once()->with('MAX(number) as max_number')->andReturn('MAX(number) as max_number');
    DB::shouldReceive('table')->with('issue_types')->andReturn($issueTypesTable);
    DB::shouldReceive('table')->with('priorities')->andReturn($prioritiesTable);
    DB::shouldReceive('table')->with('statuses')->andReturn($statusesTable);
    DB::shouldReceive('table')->with('projects')->andReturn($projectsTable);
    DB::shouldReceive('table')->with('users')->andReturn($usersTable);
    DB::shouldReceive('table')->with('issues')->andReturn($issuesTable);

    $rows = collect([
        ['project' => null, 'task' => 'Missing project'],
        ['project' => 'Unknown Project', 'task' => 'Unknown project row'],
        ['project' => 'Core Banking', 'task' => null],
        [
            'project' => 'Core Banking',
            'task' => 'Setup API Gateway',
            'description' => 'Configure kong',
            'pic' => 'EMP007',
            'priority' => 'High',
            'status' => 'Done',
            'start_date' => '2026-10-01',
            'due_date' => '2026-10-15',
        ],
    ]);

    $useCase = new ImportIssuesUseCase;
    $result = $useCase->execute($rows, '1');

    expect($result['total_rows'])->toBe(4)
        ->and($result['success_count'])->toBe(1)
        ->and($result['skipped_count'])->toBe(3)
        ->and($result['errors'])->toHaveCount(3);
});
