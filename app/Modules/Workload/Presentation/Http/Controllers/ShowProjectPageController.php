<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\Queries\GetProjectLookupsQuery;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\ProjectModel;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Response;

final class ShowProjectPageController extends Controller
{
    public function __construct(
        private readonly GetProjectLookupsQuery $getProjectLookupsQuery
    ) {}

    public function __invoke(Request $request, string $id): Response
    {
        // Pragmatic CQRS: Read model bypasses Domain Layer
        $projectModel = ProjectModel::findOrFail($id);

        $user = $request->user();
        if (! $user || ! WorkloadAccessChecker::canViewProject($user->id, (string) $projectModel->id)) {
            abort(403, 'Unauthorized access to this project.');
        }

        $lookups = $this->getProjectLookupsQuery->getLookupsForProject(
            (string) $projectModel->workspace_id,
            $projectModel->workflow_id,
            (string) $projectModel->id
        );

        return inertia('Projects/Show', [
            'project' => [
                'id' => (string) $projectModel->id,
                'workspace_id' => (string) $projectModel->workspace_id,
                'name' => $projectModel->name,
                'key' => $projectModel->key,
                'description' => $projectModel->description,
                'priority_id' => $projectModel->priority_id,
                'created_at' => $projectModel->created_at?->toIso8601String(),
                'updated_at' => $projectModel->updated_at?->toIso8601String(),
            ],
            'lookups' => $lookups,
        ]);
    }
}
