<?php

declare(strict_types=1);

namespace App\Modules\Notification\Presentation\Http\Controllers;

use App\Modules\Notification\Infrastructure\Persistence\Eloquent\Models\NotificationModel;
use App\Modules\Workload\Infrastructure\Config\WorkloadSettings;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

final class GetNotificationsController
{
    public function __invoke(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->id;

        $this->triggerLazySlaNotifications($userId);

        /** @var LengthAwarePaginator<int, NotificationModel> $paginator */
        $paginator = NotificationModel::where('user_id', $userId)
            ->orderByDesc('created_at')
            ->paginate(20);

        $unreadCount = NotificationModel::where('user_id', $userId)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Lazy daily SLA evaluation triggered on user activity (zero cronjob / zero cloud worker cost).
     */
    private function triggerLazySlaNotifications(int $userId): void
    {
        $today = now()->toDateString();
        $cacheKey = "sla_lazy_notify:{$userId}:{$today}";

        if (! Cache::add($cacheKey, true, now()->endOfDay())) {
            return;
        }

        $warningLimitDate = now()->addDays(WorkloadSettings::getSlaWarningDays())->toDateString();

        $issues = IssueModel::with(['project:id,key,name', 'status:id,category'])
            ->where('assignee_id', $userId)
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<=', $warningLimitDate)
            ->whereHas('status', fn ($q) => $q->where('category', '!=', 'DONE'))
            ->get();

        foreach ($issues as $issue) {
            $dueDateStr = $issue->due_date?->format('Y-m-d');
            if (! $dueDateStr) {
                continue;
            }

            $type = $dueDateStr < $today ? 'issue.overdue' : 'issue.due_soon';
            $issueKey = $issue->project ? "{$issue->project->key}-{$issue->number}" : (string) $issue->number;

            $alreadyNotifiedToday = NotificationModel::where('user_id', $userId)
                ->where('type', $type)
                ->whereDate('created_at', $today)
                ->where('data->issue_id', (string) $issue->id)
                ->exists();

            if (! $alreadyNotifiedToday) {
                NotificationModel::create([
                    'id' => (string) Str::uuid(),
                    'user_id' => $userId,
                    'type' => $type,
                    'data' => [
                        'issue_id' => (string) $issue->id,
                        'project_id' => (string) $issue->project_id,
                        'issue_number' => $issueKey,
                        'title' => $issue->title,
                        'due_date' => $dueDateStr,
                    ],
                ]);
            }
        }
    }
}
