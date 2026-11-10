<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Application\UseCases\StartSprintUseCase;
use App\Modules\Workload\Domain\Events\SprintStateChanged;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\SprintModel;
use DateTimeImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

final class StartSprintController
{
    public function __construct(
        private readonly StartSprintUseCase $useCase
    ) {}

    public function __invoke(string $id, Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $targetSprint = SprintModel::select('id', 'project_id', 'name')->find($id);
        if ($targetSprint && ! WorkloadAccessChecker::canManageSprint($user->id, (string) $targetSprint->project_id, 'sprints:start')) {
            return response()->json(['error' => 'Forbidden'], 403);
        }
        if (! $targetSprint && ! WorkloadAccessChecker::isSuperAdmin($user->id)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        try {
            $this->useCase->execute($id);

            $sprint = SprintModel::select('id', 'project_id', 'name')->find($id);
            if ($sprint) {
                event(new SprintStateChanged(
                    sprintId: $sprint->id,
                    projectId: $sprint->project_id,
                    sprintName: $sprint->name,
                    newState: 'active',
                    actorId: (string) $request->user()->id,
                    occurredAt: new DateTimeImmutable,
                ));
            }

            return response()->json(['message' => 'Sprint started successfully']);
        } catch (InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
}
