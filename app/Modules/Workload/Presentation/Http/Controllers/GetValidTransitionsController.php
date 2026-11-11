<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Application\UseCases\GetValidTransitionsQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class GetValidTransitionsController
{
    public function __construct(private readonly GetValidTransitionsQuery $query) {}

    public function __invoke(Request $request, string $issueId): JsonResponse
    {
        $user = $request->user();
        $projectId = DB::table('issues')->where('id', $issueId)->value('project_id');
        if (! $user || ! $projectId || ! WorkloadAccessChecker::canViewProject($user->id, (string) $projectId)) {
            abort(403, 'Unauthorized.');
        }

        return response()->json(['data' => $this->query->execute($issueId)]);
    }
}
