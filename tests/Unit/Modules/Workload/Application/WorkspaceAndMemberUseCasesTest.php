<?php

declare(strict_types=1);

use App\Modules\Workload\Application\DTOs\ArchiveWorkspaceInput;
use App\Modules\Workload\Application\DTOs\UpdateWorkspaceInput;
use App\Modules\Workload\Application\UseCases\AddWorkspaceMemberUseCase;
use App\Modules\Workload\Application\UseCases\ArchiveWorkspaceUseCase;
use App\Modules\Workload\Application\UseCases\RemoveWorkspaceMemberUseCase;
use App\Modules\Workload\Application\UseCases\UpdateWorkspaceUseCase;
use App\Modules\Workload\Domain\Entities\Workspace;
use App\Modules\Workload\Domain\Repositories\WorkspaceRepositoryInterface;
use App\Modules\Workload\Domain\ValueObjects\WorkspaceId;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class);

test('UpdateWorkspaceUseCase throws exception when workspace not found', function () {
    DB::shouldReceive('transaction')->once()->andReturnUsing(fn ($cb) => $cb());

    $repo = Mockery::mock(WorkspaceRepositoryInterface::class);
    $repo->shouldReceive('findById')->once()->andReturnNull();

    $useCase = new UpdateWorkspaceUseCase($repo);
    $input = new UpdateWorkspaceInput('01923abc-0000-7000-8000-000000000001', 'New Name', ['theme' => 'dark'], 'user-1');

    expect(fn () => $useCase->execute($input))
        ->toThrow(InvalidArgumentException::class, 'Workspace not found');
});

test('UpdateWorkspaceUseCase updates workspace details and saves within transaction', function () {
    DB::shouldReceive('transaction')->once()->andReturnUsing(fn ($cb) => $cb());

    $wsId = '01923abc-0000-7000-8000-000000000001';
    $workspace = Workspace::create(new WorkspaceId($wsId), 'group-1', 'Old Name', 'user-1');

    $repo = Mockery::mock(WorkspaceRepositoryInterface::class);
    $repo->shouldReceive('findById')->once()->andReturn($workspace);
    $repo->shouldReceive('save')->once()->with(Mockery::on(function (Workspace $ws) {
        return $ws->getName() === 'Updated Name' && $ws->getSettings() === ['theme' => 'dark'];
    }));

    $useCase = new UpdateWorkspaceUseCase($repo);
    $useCase->execute(new UpdateWorkspaceInput($wsId, 'Updated Name', ['theme' => 'dark'], 'user-1'));

    expect($workspace->getName())->toBe('Updated Name')
        ->and($workspace->getSettings())->toBe(['theme' => 'dark']);
});

test('ArchiveWorkspaceUseCase throws exception when workspace not found', function () {
    DB::shouldReceive('transaction')->once()->andReturnUsing(fn ($cb) => $cb());

    $repo = Mockery::mock(WorkspaceRepositoryInterface::class);
    $repo->shouldReceive('findById')->once()->andReturnNull();

    $useCase = new ArchiveWorkspaceUseCase($repo);
    $input = new ArchiveWorkspaceInput('01923abc-0000-7000-8000-000000000001', 'user-1');

    expect(fn () => $useCase->execute($input))
        ->toThrow(InvalidArgumentException::class, 'Workspace not found');
});

test('ArchiveWorkspaceUseCase archives workspace and saves within transaction', function () {
    DB::shouldReceive('transaction')->once()->andReturnUsing(fn ($cb) => $cb());

    $wsId = '01923abc-0000-7000-8000-000000000001';
    $workspace = Workspace::create(new WorkspaceId($wsId), 'group-1', 'Active WS', 'user-1');

    $repo = Mockery::mock(WorkspaceRepositoryInterface::class);
    $repo->shouldReceive('findById')->once()->andReturn($workspace);
    $repo->shouldReceive('save')->once()->with(Mockery::on(fn (Workspace $ws) => $ws->getStatus() === 'ARCHIVED'));

    $useCase = new ArchiveWorkspaceUseCase($repo);
    $useCase->execute(new ArchiveWorkspaceInput($wsId, 'user-1'));

    expect($workspace->getStatus())->toBe('ARCHIVED');
});

test('AddWorkspaceMemberUseCase throws exception for invalid role', function () {
    $useCase = new AddWorkspaceMemberUseCase;

    expect(fn () => $useCase->execute('ws-1', 10, 'superadmin'))
        ->toThrow(InvalidArgumentException::class, 'Invalid role provided.');
});

test('AddWorkspaceMemberUseCase upserts workspace member record', function () {
    $queryMock = Mockery::mock();
    $queryMock->shouldReceive('updateOrInsert')
        ->once()
        ->with(
            ['workspace_id' => 'ws-1', 'user_id' => 10],
            Mockery::on(fn (array $values) => $values['role'] === 'admin' && isset($values['updated_at'], $values['created_at']))
        )
        ->andReturnTrue();

    DB::shouldReceive('table')->once()->with('workspace_members')->andReturn($queryMock);

    $useCase = new AddWorkspaceMemberUseCase;
    $useCase->execute('ws-1', 10, 'admin');

    expect(true)->toBeTrue();
});

test('RemoveWorkspaceMemberUseCase deletes member from workspace_members', function () {
    $queryMock = Mockery::mock();
    $queryMock->shouldReceive('where')->once()->with('workspace_id', 'ws-1')->andReturnSelf();
    $queryMock->shouldReceive('where')->once()->with('user_id', 10)->andReturnSelf();
    $queryMock->shouldReceive('delete')->once()->andReturn(1);

    DB::shouldReceive('table')->once()->with('workspace_members')->andReturn($queryMock);

    $useCase = new RemoveWorkspaceMemberUseCase;
    $useCase->execute('ws-1', 10);

    expect(true)->toBeTrue();
});
