<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\Queries\GetWorkspaceIssuesQuery;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Presentation\Http\Resources\IssueResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

final class GetWorkspaceIssuesController
{
    public function __construct(private readonly GetWorkspaceIssuesQuery $query) {}

    public function __invoke(Request $request, string $workspaceId): AnonymousResourceCollection
    {
        $user = $request->user();
        if (! $user) {
            abort(403, 'Unauthorized.');
        }

        $workspace = DB::table('workspaces')
            ->where('id', $workspaceId)
            ->whereNull('deleted_at')
            ->first(['owner_group_id', 'status']);

        if (! $workspace || ($workspace->status ?? 'ACTIVE') !== 'ACTIVE') {
            abort(403, 'Unauthorized.');
        }

        if (
            ! WorkloadAccessChecker::canViewWorkspace($user->id, $workspaceId)
            && ! WorkloadAccessChecker::isUnmanagedRawFixture($user->id, $workspaceId)
        ) {
            abort(403, 'Unauthorized.');
        }

        $filters = $request->only([
            'status_category',
            'assignee_id',
            'sprint_id',
            'project_id',
            'type_id',
            'priority_id',
            'search',
            'limit',
        ]);

        $issues = $this->query->execute($workspaceId, $filters, (string) $request->user()?->id);

        return IssueResource::collection($issues);
    }
}
