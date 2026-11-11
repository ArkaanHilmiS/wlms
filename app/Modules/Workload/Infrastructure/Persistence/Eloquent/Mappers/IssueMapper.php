<?php

declare(strict_types=1);

namespace App\Modules\Workload\Infrastructure\Persistence\Eloquent\Mappers;

use App\Modules\Workload\Domain\Entities\Issue;
use App\Modules\Workload\Domain\ValueObjects\AssigneeId;
use App\Modules\Workload\Domain\ValueObjects\IssueId;
use App\Modules\Workload\Domain\ValueObjects\IssueNumber;
use App\Modules\Workload\Domain\ValueObjects\IssueTypeId;
use App\Modules\Workload\Domain\ValueObjects\PriorityId;
use App\Modules\Workload\Domain\ValueObjects\ProjectId;
use App\Modules\Workload\Domain\ValueObjects\SprintId;
use App\Modules\Workload\Domain\ValueObjects\StatusId;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\ProjectModel;
use DateTimeImmutable;
use ReflectionClass;

final class IssueMapper
{
    public static function toDomain(IssueModel $model, ProjectModel $projectModel): Issue
    {
        $reflection = new ReflectionClass(Issue::class);
        $issue = $reflection->newInstanceWithoutConstructor();

        $set = fn (string $prop, mixed $val) => $reflection->getProperty($prop)->setValue($issue, $val);

        $set('id', new IssueId($model->id));
        $set('projectId', new ProjectId($model->project_id));
        $set('number', new IssueNumber($projectModel->key, (int) $model->number));
        $set('title', $model->title);
        $set('description', $model->description);
        $set('issueTypeId', new IssueTypeId($model->issue_type_id));
        $set('priorityId', new PriorityId($model->priority_id));
        $set('statusId', new StatusId($model->status_id));
        $set('sprintId', $model->sprint_id ? new SprintId($model->sprint_id) : null);
        $set('reporterId', $model->reporter_id);
        $set('assigneeId', $model->assignee_id ? new AssigneeId($model->assignee_id) : null);
        $set('storyPoints', $model->story_points ? (int) $model->story_points : null);
        $set('originalEstimateSeconds', $model->original_estimate_seconds ? (int) $model->original_estimate_seconds : null);
        $set('remainingEstimateSeconds', $model->remaining_estimate_seconds !== null ? (int) $model->remaining_estimate_seconds : null);
        $set('createdAt', new DateTimeImmutable($model->created_at->toDateTimeString()));
        $set('startDate', $model->start_date?->format('Y-m-d'));
        $set('dueDate', $model->due_date?->format('Y-m-d'));
        $set('parentId', $model->parent_id);

        return $issue;
    }

    /**
     * @return array<string, mixed>
     */
    public static function toPersistence(Issue $issue): array
    {
        return [
            'id' => $issue->getId()->value,
            'project_id' => $issue->getProjectId()->value,
            'sprint_id' => $issue->getSprintId()?->value,
            'status_id' => $issue->getStatusId()->value,
            'parent_id' => $issue->getParentId(),
            'number' => $issue->getNumber()->getValue(),
            'title' => $issue->getTitle(),
            'description' => $issue->getDescription(),
            'issue_type_id' => $issue->getIssueTypeId()->value,
            'priority_id' => $issue->getPriorityId()->value,
            'story_points' => $issue->getStoryPoints(),
            'original_estimate_seconds' => $issue->getOriginalEstimateSeconds(),
            'remaining_estimate_seconds' => $issue->getRemainingEstimateSeconds(),
            'reporter_id' => $issue->getReporterId(),
            'assignee_id' => $issue->getAssigneeId()?->value,
            'start_date' => $issue->getStartDate(),
            'due_date' => $issue->getDueDate(),
        ];
    }
}
