<?php

declare(strict_types=1);

namespace App\Modules\Workload\Domain\Entities;

use App\Modules\Workload\Domain\Events\IssueAssigned;
use App\Modules\Workload\Domain\Events\IssueCreated;
use App\Modules\Workload\Domain\Events\IssueTransitioned;
use App\Modules\Workload\Domain\Services\WorkflowEngine;
use App\Modules\Workload\Domain\ValueObjects\AssigneeId;
use App\Modules\Workload\Domain\ValueObjects\IssueId;
use App\Modules\Workload\Domain\ValueObjects\IssueNumber;
use App\Modules\Workload\Domain\ValueObjects\IssueTypeId;
use App\Modules\Workload\Domain\ValueObjects\PriorityId;
use App\Modules\Workload\Domain\ValueObjects\ProjectId;
use App\Modules\Workload\Domain\ValueObjects\SprintId;
use App\Modules\Workload\Domain\ValueObjects\StatusId;
use App\Shared\Domain\Traits\HasDomainEvents;
use DateTimeImmutable;

final class Issue
{
    use HasDomainEvents;

    private function __construct(
        private readonly IssueId $id,
        private readonly ProjectId $projectId,
        private readonly IssueNumber $number,
        private string $title,
        private ?string $description,
        private readonly IssueTypeId $issueTypeId,
        private PriorityId $priorityId,
        private StatusId $statusId,
        private ?SprintId $sprintId,
        private readonly string $reporterId,
        private ?AssigneeId $assigneeId,
        private ?int $storyPoints,
        private ?int $originalEstimateSeconds,
        private ?int $remainingEstimateSeconds,
        private readonly DateTimeImmutable $createdAt,
        private ?string $startDate = null,
        private ?string $dueDate = null,
        private ?string $parentId = null,
    ) {}

    public static function create(
        IssueId $id,
        ProjectId $projectId,
        IssueNumber $number,
        string $title,
        ?string $description,
        IssueTypeId $issueTypeId,
        PriorityId $priorityId,
        StatusId $initialStatusId,
        ?SprintId $sprintId,
        string $reporterId,
        ?int $originalEstimateSeconds = null,
        ?string $startDate = null,
        ?string $dueDate = null,
        ?string $parentId = null,
    ): self {
        $issue = new self(
            $id,
            $projectId,
            $number,
            $title,
            $description,
            $issueTypeId,
            $priorityId,
            $initialStatusId,
            $sprintId,
            $reporterId,
            null,
            null,
            $originalEstimateSeconds,
            $originalEstimateSeconds,
            new DateTimeImmutable,
            $startDate,
            $dueDate,
            $parentId,
        );

        $issue->recordEvent(new IssueCreated(
            $id->value,
            $projectId->value,
            $number->display,
            $title,
            $reporterId,
            new DateTimeImmutable
        ));

        return $issue;
    }

    public function assign(?AssigneeId $newAssigneeId, string $actorId): void
    {
        $this->assigneeId = $newAssigneeId;

        $this->recordEvent(new IssueAssigned(
            $this->id->value,
            $this->number->display,
            $newAssigneeId ? $newAssigneeId->value : null,
            $actorId,
            new DateTimeImmutable
        ));
    }

    public function transition(StatusId $toStatusId, WorkflowEngine $engine, string $actorId): void
    {
        // Delegate validation to Domain Service — keeps Entity clean
        $engine->assertValidTransition($this->statusId->value, $toStatusId->value);

        $fromStatusId = $this->statusId->value;
        $this->statusId = $toStatusId;

        $this->recordEvent(new IssueTransitioned(
            $this->id->value,
            $actorId,
            $fromStatusId,
            $toStatusId->value,
            new DateTimeImmutable
        ));
    }

    public function estimate(int $storyPoints): void
    {
        $this->storyPoints = $storyPoints;
    }

    public function updateDetails(
        string $title,
        ?string $description,
        PriorityId $priorityId,
        ?SprintId $sprintId,
        ?int $originalEstimateSeconds = null
    ): void {
        $this->title = $title;
        $this->description = $description;
        $this->priorityId = $priorityId;
        $this->sprintId = $sprintId;
        $this->originalEstimateSeconds = $originalEstimateSeconds;
    }

    // Getters
    public function getId(): IssueId
    {
        return $this->id;
    }

    public function getProjectId(): ProjectId
    {
        return $this->projectId;
    }

    public function getNumber(): IssueNumber
    {
        return $this->number;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function getIssueTypeId(): IssueTypeId
    {
        return $this->issueTypeId;
    }

    public function getPriorityId(): PriorityId
    {
        return $this->priorityId;
    }

    public function getStatusId(): StatusId
    {
        return $this->statusId;
    }

    public function getSprintId(): ?SprintId
    {
        return $this->sprintId;
    }

    public function getReporterId(): string
    {
        return $this->reporterId;
    }

    public function getAssigneeId(): ?AssigneeId
    {
        return $this->assigneeId;
    }

    public function getStoryPoints(): ?int
    {
        return $this->storyPoints;
    }

    public function getOriginalEstimateSeconds(): ?int
    {
        return $this->originalEstimateSeconds;
    }

    public function getRemainingEstimateSeconds(): ?int
    {
        return $this->remainingEstimateSeconds;
    }

    public function getCreatedAt(): DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getStartDate(): ?string
    {
        return $this->startDate;
    }

    public function getDueDate(): ?string
    {
        return $this->dueDate;
    }

    public function getParentId(): ?string
    {
        return $this->parentId;
    }
}
