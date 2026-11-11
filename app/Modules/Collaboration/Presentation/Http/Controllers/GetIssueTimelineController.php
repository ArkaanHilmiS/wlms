<?php

declare(strict_types=1);

namespace App\Modules\Collaboration\Presentation\Http\Controllers;

use App\Modules\Collaboration\Application\UseCases\GetIssueTimelineQuery;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class GetIssueTimelineController extends Controller
{
    public function __construct(
        private readonly GetIssueTimelineQuery $query
    ) {}

    public function __invoke(Request $request, string $issueId): JsonResponse
    {
        $user = $request->user();
        $projectId = DB::table('issues')->where('id', $issueId)->value('project_id');
        if (! $user || ! $projectId || ! WorkloadAccessChecker::canViewProject($user->id, (string) $projectId)) {
            abort(403, 'Unauthorized.');
        }

        $timeline = $this->query->execute($issueId);

        return response()->json([
            'data' => $timeline,
        ]);
    }
}
