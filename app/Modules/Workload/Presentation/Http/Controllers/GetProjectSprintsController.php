<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\Queries\GetProjectSprintsQuery;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class GetProjectSprintsController
{
    public function __construct(
        private readonly GetProjectSprintsQuery $query
    ) {}

    public function __invoke(string $projectId, Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! WorkloadAccessChecker::canViewProject($user->id, $projectId)) {
            abort(403, 'Unauthorized.');
        }

        $sprints = $this->query->execute($projectId);

        return response()->json([
            'data' => $sprints,
        ]);
    }
}
