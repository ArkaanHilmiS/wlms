<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\Queries\GetProjectLookupsQuery;
use App\Modules\Workload\Application\Queries\GetWorkspaceLookupsQuery;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Inertia\Response;

final class ProjectIndexPageController extends Controller
{
    public function __construct(
        private readonly GetProjectLookupsQuery $getProjectLookupsQuery,
        private readonly GetWorkspaceLookupsQuery $getWorkspaceLookupsQuery
    ) {}

    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        if (! $user) {
            abort(403, 'Unauthorized.');
        }

        $workspaceId = $request->query('workspace_id');
        if (is_string($workspaceId) && $workspaceId !== '') {
            if (! WorkloadAccessChecker::canViewWorkspace($user->id, $workspaceId)) {
                abort(403, 'Unauthorized.');
            }
            $lookups = $this->getWorkspaceLookupsQuery->execute($workspaceId);
        } else {
            if (
                ! WorkloadAccessChecker::isSuperAdmin($user->id)
                && ! WorkloadAccessChecker::hasPermissionInContext($user->id, ['projects:view', 'workspaces:view'])
                && DB::table('user_roles')->where('user_id', $user->id)->exists()
            ) {
                abort(403, 'Unauthorized.');
            }
            $lookups = $this->getProjectLookupsQuery->getPrioritiesOnly();
        }

        return inertia('Projects/Index', [
            'lookups' => $lookups,
        ]);
    }
}
