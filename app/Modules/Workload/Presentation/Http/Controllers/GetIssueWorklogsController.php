<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\WorklogModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class GetIssueWorklogsController
{
    public function __invoke(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $projectId = DB::table('issues')->where('id', $id)->value('project_id');
        if (! $user || ! $projectId || ! WorkloadAccessChecker::canViewProject($user->id, (string) $projectId)) {
            abort(403, 'Unauthorized.');
        }

        $worklogs = WorklogModel::with('author')
            ->where('issue_id', $id)
            ->orderBy('started_at', 'desc')
            ->get();

        return response()->json([
            'data' => $worklogs,
        ]);
    }
}
