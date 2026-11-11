<?php

declare(strict_types=1);

namespace App\Modules\Notification\Infrastructure\Listeners;

use App\Modules\Collaboration\Domain\Events\CommentAdded;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Notification\Domain\Events\NewNotification;
use App\Modules\Notification\Infrastructure\Persistence\Eloquent\Models\NotificationModel;
use App\Modules\Workload\Domain\Events\IssueAssigned;
use App\Modules\Workload\Domain\Events\IssueTransitioned;
use App\Modules\Workload\Domain\Events\SprintStateChanged;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\SprintModel;
use Illuminate\Events\Dispatcher;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class NotificationEventSubscriber
{
    public function handleIssueAssigned(IssueAssigned $event): void
    {
        if ($event->assigneeId === null) {
            return;
        }

        $userId = $this->resolveUserId($event->assigneeId);
        if (! $userId) {
            return;
        }

        $this->createAndBroadcast(
            userId: $userId,
            type: 'issue.assigned',
            data: [
                'issue_id' => $event->issueId,
                'issue_number' => $event->issueNumber,
                'actor_id' => $event->actorId,
            ]
        );
    }

    public function handleCommentAdded(CommentAdded $event): void
    {
        $issue = IssueModel::select('reporter_id')->find($event->issueId);

        // 1. Notify reporter if different from author
        if ($issue !== null && $issue->reporter_id !== null && (string) $issue->reporter_id !== $event->authorId) {
            $reporterUserId = $this->resolveUserId($issue->reporter_id);
            if ($reporterUserId) {
                $this->createAndBroadcast(
                    userId: $reporterUserId,
                    type: 'comment.added',
                    data: [
                        'issue_id' => $event->issueId,
                        'comment_id' => $event->commentId,
                        'author_id' => $event->authorId,
                        'body_preview' => mb_substr($event->body, 0, 50),
                    ]
                );
            }
        }

        // 2. Parse @mentions and notify mentioned users
        preg_match_all('/@([a-zA-Z0-9._-]+)/', $event->body, $matches);
        if (! empty($matches[1])) {
            $handles = array_unique($matches[1]);
            $author = UserModel::find($event->authorId);
            $authorName = $author ? (string) $author->name : 'Someone';

            $mentionedUsers = UserModel::where(function ($query) use ($handles) {
                foreach ($handles as $handle) {
                    $query->orWhere('name', 'LIKE', "%{$handle}%")
                        ->orWhere('email', 'LIKE', "{$handle}@%")
                        ->orWhere('email', '=', $handle)
                        ->orWhere('employee_id', '=', $handle);
                }
            })->get(['id', 'name', 'email']);

            $notifiedUserIds = [];
            foreach ($mentionedUsers as $user) {
                // Do not notify author
                if ((string) $user->id === (string) $event->authorId) {
                    continue;
                }
                // Avoid notifying duplicate user
                if (in_array($user->id, $notifiedUserIds, true)) {
                    continue;
                }
                // Avoid notifying reporter twice if already notified
                if ($issue !== null && $issue->reporter_id !== null && (int) $issue->reporter_id === (int) $user->id) {
                    continue;
                }

                $notifiedUserIds[] = $user->id;

                $this->createAndBroadcast(
                    userId: (int) $user->id,
                    type: 'comment.mentioned',
                    data: [
                        'issue_id' => $event->issueId,
                        'comment_id' => $event->commentId,
                        'author_id' => $event->authorId,
                        'author_name' => $authorName,
                        'body_preview' => mb_substr($event->body, 0, 80),
                    ]
                );
            }
        }
    }

    public function handleIssueTransitioned(IssueTransitioned $event): void
    {
        $issue = IssueModel::select('assignee_id')->find($event->issueId);

        if ($issue === null || $issue->assignee_id === null) {
            return;
        }

        // Don't notify the actor if they are the assignee
        if ((string) $issue->assignee_id === $event->actorId) {
            return;
        }

        $userId = $this->resolveUserId($issue->assignee_id);
        if (! $userId) {
            return;
        }

        $this->createAndBroadcast(
            userId: $userId,
            type: 'issue.transitioned',
            data: [
                'issue_id' => $event->issueId,
                'from_status_id' => $event->fromStatusId,
                'to_status_id' => $event->toStatusId,
                'actor_id' => $event->actorId,
            ]
        );
    }

    public function handleSprintStateChanged(SprintStateChanged $event): void
    {
        // Resolve workspace_id → members via Sprint → Project → Workspace
        $sprint = SprintModel::with('project.workspace.members:id')->find($event->sprintId);

        if ($sprint === null || $sprint->project === null || $sprint->project->workspace === null) {
            return;
        }

        $memberIds = $sprint->project->workspace->members->pluck('id');

        foreach ($memberIds as $userId) {
            // Don't notify the actor
            if ((string) $userId === $event->actorId) {
                continue;
            }

            $resolvedUserId = $this->resolveUserId($userId);
            if (! $resolvedUserId) {
                continue;
            }

            $this->createAndBroadcast(
                userId: $resolvedUserId,
                type: 'sprint.state_changed',
                data: [
                    'sprint_id' => $event->sprintId,
                    'project_id' => $event->projectId,
                    'sprint_name' => $event->sprintName,
                    'new_state' => $event->newState,
                    'actor_id' => $event->actorId,
                ]
            );
        }
    }

    private function resolveUserId(string|int $id): ?int
    {
        if (is_numeric($id)) {
            return (int) $id;
        }
        $user = UserModel::where('uuid', $id)->first(['id']);

        return $user?->id;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function createAndBroadcast(int $userId, string $type, array $data): void
    {
        DB::transaction(function () use ($userId, $type, $data): void {
            $notification = NotificationModel::create([
                'id' => Str::uuid()->toString(),
                'user_id' => $userId,
                'type' => $type,
                'data' => $data,
            ]);

            broadcast(new NewNotification(
                id: $notification->id,
                userId: $userId,
                type: $type,
                data: $data,
                createdAt: $notification->created_at->toIso8601String(),
            ));
        });
    }

    /**
     * @return array<string, string>
     */
    public function subscribe(Dispatcher $events): array
    {
        return [
            IssueAssigned::class => 'handleIssueAssigned',
            CommentAdded::class => 'handleCommentAdded',
            IssueTransitioned::class => 'handleIssueTransitioned',
            SprintStateChanged::class => 'handleSprintStateChanged',
        ];
    }
}
