<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\Queries\GetProjectLookupsQuery;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\ProjectModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class GetProjectLookupsController extends Controller
{
    public function __construct(
        private readonly GetProjectLookupsQuery $query
    ) {}

    public function __invoke(Request $request, string $projectId): JsonResponse
    {
        // Pragmatic: directly fetch project to get workspaceId and workflowId
        $project = ProjectModel::findOrFail($projectId);

        if (! WorkloadAccessChecker::canViewProject($request->user()->id, $projectId, (string) $project->workspace_id, $project->lead_id)) {
            abort(403, 'Unauthorized.');
        }

        $lookups = $this->query->getLookupsForProject(
            (string) $project->workspace_id,
            $project->workflow_id,
            (string) $project->id
        );

        return response()->json([
            'data' => $lookups,
        ], 200);
    }
}
