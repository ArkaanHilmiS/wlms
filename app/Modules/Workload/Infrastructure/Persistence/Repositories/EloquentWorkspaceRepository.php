<?php

declare(strict_types=1);

namespace App\Modules\Workload\Infrastructure\Persistence\Repositories;

use App\Modules\Workload\Domain\Entities\Workspace;
use App\Modules\Workload\Domain\Repositories\WorkspaceRepositoryInterface;
use App\Modules\Workload\Domain\ValueObjects\WorkspaceId;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Mappers\WorkspaceMapper;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\WorkspaceModel;
use Illuminate\Support\Facades\DB;

final class EloquentWorkspaceRepository implements WorkspaceRepositoryInterface
{
    public function save(Workspace $workspace): void
    {
        // Zero Data Loss: Semua mutasi dibungkus dalam ACID Transaction
        DB::transaction(function () use ($workspace) {

            $data = WorkspaceMapper::toPersistence($workspace);

            WorkspaceModel::query()->updateOrCreate(
                ['id' => $workspace->getId()->value],
                $data
            );

            // Lepaskan semua Domain Events (Side-Effects) setelah DB sukses
            foreach ($workspace->flushEvents() as $event) {
                event($event);
            }

        });
    }

    public function findById(WorkspaceId $id): ?Workspace
    {
        $model = WorkspaceModel::query()->find($id->value);

        return $model ? WorkspaceMapper::toDomain($model) : null;
    }

    public function countByGroupId(string $groupId): int
    {
        return WorkspaceModel::query()->where('owner_group_id', $groupId)->where('status', 'ACTIVE')->count();
    }

    /**
     * @return Workspace[]
     */
    public function findAllByGroupId(string $groupId, int $limit = 50, int $offset = 0): array
    {
        $models = WorkspaceModel::query()
            ->where('owner_group_id', $groupId)
            ->skip($offset)
            ->take($limit)
            ->get();

        return $models->map(fn (WorkspaceModel $model) => WorkspaceMapper::toDomain($model))->all();
    }
}
