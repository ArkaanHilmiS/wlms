<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\Queries\GetBacklogIssuesQuery;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class GetBacklogController
{
    public function __construct(private readonly GetBacklogIssuesQuery $query) {}

    public function __invoke(Request $request, string $projectId): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! WorkloadAccessChecker::canViewProject($user->id, $projectId)) {
            abort(403, 'Unauthorized.');
        }

        return response()->json(['data' => $this->query->execute($projectId)]);
    }
}
