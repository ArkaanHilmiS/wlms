<?php

declare(strict_types=1);

namespace App\Modules\Workload\Infrastructure\Listeners;

use App\Modules\Workload\Domain\Events\IssueAssigned;
use App\Modules\Workload\Infrastructure\Mail\IssueAssignedMail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

final class NotifyAssigneeMailListener
{
    public function handle(IssueAssigned $event): void
    {
        if ($event->assigneeId !== null) {
            $user = DB::table('users')->where('id', $event->assigneeId)->first(['id', 'name', 'email']);
            if ($user && ! empty($user->email)) {
                try {
                    Mail::to($user->email)->queue(new IssueAssignedMail($event->issueNumber, (string) $user->name, $event->issueId));
                } catch (\Throwable $e) {
                    Log::error("Failed to queue assignment mail for issue {$event->issueNumber}: {$e->getMessage()}");
                }
            }
        }

        Log::info("MAIL_NOTIFICATION: Issue {$event->issueNumber} assigned to {$event->assigneeId}");
    }
}
