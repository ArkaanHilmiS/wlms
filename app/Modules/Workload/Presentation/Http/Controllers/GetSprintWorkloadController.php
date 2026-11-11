<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\SprintModel;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class GetSprintWorkloadController
{
    public function __invoke(Request $request, string $sprintId): JsonResponse
    {
        $user = $request->user();
        $projectId = DB::table('sprints')->where('id', $sprintId)->value('project_id');
        if (! $user || ! $projectId || ! WorkloadAccessChecker::canViewProject($user->id, (string) $projectId)) {
            abort(403, 'Unauthorized.');
        }

        $sprint = SprintModel::with(['project.workspace.members'])->findOrFail($sprintId);

        $start = $sprint->start_date ? Carbon::parse($sprint->start_date) : Carbon::now();
        $end = $sprint->end_date ? Carbon::parse($sprint->end_date) : $start->copy()->addDays(14);

        $start = $start->copy()->startOfDay();
        $end = $end->copy()->startOfDay();

        $weekdays = $start->diffInDaysFiltered(fn (Carbon $date) => $date->isWeekday(), $end);
        if ($end->isWeekday()) {
            $weekdays++;
        }

        $workspace = $sprint->project->workspace;

        $members = $workspace->members;

        $allocatedByAssignee = DB::table('issues')
            ->where('sprint_id', $sprintId)
            ->whereNull('deleted_at')
            ->whereNotNull('assignee_id')
            ->groupBy('assignee_id')
            ->select('assignee_id', DB::raw('SUM(COALESCE(original_estimate_seconds, 0)) as total_seconds'))
            ->pluck('total_seconds', 'assignee_id')
            ->all();

        $data = [];

        foreach ($members as $member) {
            /** @var UserModel $member */
            $dailyCapacity = (int) ($member->pivot->daily_capacity_hours ?? 8);
            $capacitySeconds = $weekdays * $dailyCapacity * 3600;
            $allocatedSeconds = (int) ($allocatedByAssignee[$member->id] ?? 0);

            $data[] = [
                'user_id' => $member->id,
                'name' => $member->name,
                'avatar' => $member->avatar_url ?? null,
                'capacity_seconds' => $capacitySeconds,
                'allocated_seconds' => (int) $allocatedSeconds,
            ];
        }

        return response()->json(['data' => $data]);
    }
}
