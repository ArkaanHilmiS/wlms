<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\Queries\GetBoardIssuesQuery;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class GetBoardController
{
    public function __construct(private readonly GetBoardIssuesQuery $query) {}

    public function __invoke(Request $request, string $projectId): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! WorkloadAccessChecker::canViewProject($user->id, $projectId)) {
            abort(403, 'Unauthorized.');
        }

        $sprintId = $request->query('sprint_id');
        if (! $sprintId) {
            return response()->json(['message' => 'sprint_id is required'], 422);
        }

        return response()->json([
            'data' => $this->query->execute($projectId, (string) $sprintId, $request->boolean('include_archived')),
        ]);
    }
}
