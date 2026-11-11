<?php

declare(strict_types=1);

namespace App\Modules\Workload\Infrastructure\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

final class IssueAssignedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $issueNumber,
        public readonly string $assigneeName,
        public readonly string $issueId,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[WorkPulse] Issue Assigned: {$this->issueNumber}",
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: "<p>Hello {$this->assigneeName},</p><p>You have been assigned to issue <strong>{$this->issueNumber}</strong>.</p>",
        );
    }
}
