<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\Queries\GetWorkspaceAvailabilityQuery;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class GetWorkspaceAvailabilityController extends Controller
{
    public function __construct(
        private readonly GetWorkspaceAvailabilityQuery $query
    ) {}

    public function __invoke(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! WorkloadAccessChecker::canViewWorkspace($user->id, $id)) {
            abort(403, 'Unauthorized.');
        }

        return response()->json([
            'data' => $this->query->execute($id),
        ], 200);
    }
}
