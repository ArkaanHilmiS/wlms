<?php

declare(strict_types=1);

namespace App\Modules\Workload\Infrastructure\Persistence\Repositories;

use App\Modules\Workload\Domain\Entities\Issue;
use App\Modules\Workload\Domain\Repositories\IssueRepositoryInterface;
use App\Modules\Workload\Domain\ValueObjects\IssueId;
use App\Modules\Workload\Domain\ValueObjects\ProjectId;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Mappers\IssueMapper;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\ProjectModel;
use Illuminate\Support\Facades\DB;

final class EloquentIssueRepository implements IssueRepositoryInterface
{
    public function save(Issue $issue): void
    {
        DB::transaction(function () use ($issue) {
            IssueModel::query()->updateOrCreate(
                ['id' => $issue->getId()->value],
                IssueMapper::toPersistence($issue)
            );

            foreach ($issue->flushEvents() as $event) {
                event($event);
            }
        });
    }

    public function findById(IssueId $id): ?Issue
    {
        $model = IssueModel::query()->find($id->value);
        if (! $model) {
            return null;
        }

        $project = ProjectModel::query()->find($model->project_id);
        if (! $project) {
            return null;
        }

        return IssueMapper::toDomain($model, $project);
    }

    public function nextNumberForProject(ProjectId $projectId): int
    {
        ProjectModel::query()->where('id', $projectId->value)->lockForUpdate()->value('id');

        $max = IssueModel::query()
            ->where('project_id', $projectId->value)
            ->max('number');

        return ($max ?? 0) + 1;
    }

    public function delete(IssueId $id): void
    {
        IssueModel::query()->where('id', $id->value)->delete();
    }
}
