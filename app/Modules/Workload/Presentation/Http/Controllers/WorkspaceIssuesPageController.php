<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\Queries\GetWorkspaceLookupsQuery;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use Illuminate\Http\Request;
use Inertia\Response;

final class WorkspaceIssuesPageController
{
    public function __construct(private readonly GetWorkspaceLookupsQuery $query) {}

    public function __invoke(Request $request, string $workspaceId): Response
    {
        $user = $request->user();
        if (! $user || ! WorkloadAccessChecker::canViewWorkspace($user->id, $workspaceId)) {
            abort(403, 'Unauthorized.');
        }

        $lookups = $this->query->execute($workspaceId);

        return inertia('Workspaces/Issues', [
            'workspace_id' => $workspaceId,
            'lookups' => $lookups,
        ]);
    }
}
