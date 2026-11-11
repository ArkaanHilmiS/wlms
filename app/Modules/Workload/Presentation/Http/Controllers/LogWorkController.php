<?php

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\DTOs\LogWorkInput;
use App\Modules\Workload\Application\UseCases\LogWorkUseCase;
use App\Modules\Workload\Infrastructure\Config\WorkloadSettings;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueModel;
use App\Modules\Workload\Presentation\Http\Requests\LogWorkHttpRequest;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LogWorkController
{
    public function __construct(
        private LogWorkUseCase $useCase
    ) {}

    public function __invoke(string $id, LogWorkHttpRequest $request): JsonResponse
    {
        // Authorization: only the assignee may log work on the issue.
        $issue = IssueModel::find($id);

        if (! $issue) {
            abort(404, 'Issue not found.');
        }

        $currentUser = Auth::user();
        if ((string) $issue->assignee_id !== (string) $currentUser->id) {
            abort(403, 'Only the assignee can log work on this issue.');
        }

        $settings = WorkloadSettings::all();
        $startedAt = CarbonImmutable::parse((string) $request->validated('started_at'));

        if (! $settings['worklog_allow_future_date'] && $startedAt->startOfDay()->gt(now()->startOfDay())) {
            throw ValidationException::withMessages([
                'started_at' => 'Tidak dapat mencatat worklog untuk tanggal di masa depan.',
            ]);
        }

        $workDate = $startedAt->toDateString();
        $existingSeconds = (int) DB::table('worklogs')
            ->where('author_id', (string) Auth::id())
            ->whereRaw('SUBSTR(CAST(started_at AS TEXT), 1, 10) = ?', [$workDate])
            ->sum('time_spent_seconds');

        $newTotalSeconds = $existingSeconds + (int) $request->validated('time_spent_seconds');
        $maxSeconds = (int) round($settings['worklog_max_hours_per_day'] * 3600);

        if ($newTotalSeconds > $maxSeconds) {
            throw ValidationException::withMessages([
                'time_spent_seconds' => "Total jam kerja harian melebihi batas maksimal ({$settings['worklog_max_hours_per_day']} jam/hari).",
            ]);
        }

        $input = new LogWorkInput(
            issueId: $id,
            authorUserId: (string) Auth::id(),
            timeSpentSeconds: $request->validated('time_spent_seconds'),
            description: $request->validated('description'),
            startedAt: $request->validated('started_at')
        );

        $this->useCase->execute($input);

        return response()->json([
            'message' => 'Work logged successfully',
        ], 201);
    }
}
