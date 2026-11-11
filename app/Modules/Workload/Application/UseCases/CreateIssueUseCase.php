<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\UseCases;

use App\Modules\Workload\Application\DTOs\CreateIssueInput;
use App\Modules\Workload\Application\DTOs\IssueOutput;
use App\Modules\Workload\Domain\Entities\Issue;
use App\Modules\Workload\Domain\Repositories\IssueRepositoryInterface;
use App\Modules\Workload\Domain\Repositories\ProjectRepositoryInterface;
use App\Modules\Workload\Domain\Repositories\WorkflowRepositoryInterface;
use App\Modules\Workload\Domain\ValueObjects\AssigneeId;
use App\Modules\Workload\Domain\ValueObjects\IssueId;
use App\Modules\Workload\Domain\ValueObjects\IssueNumber;
use App\Modules\Workload\Domain\ValueObjects\IssueTypeId;
use App\Modules\Workload\Domain\ValueObjects\PriorityId;
use App\Modules\Workload\Domain\ValueObjects\ProjectId;
use App\Modules\Workload\Domain\ValueObjects\SprintId;
use App\Modules\Workload\Domain\ValueObjects\StatusId;
use Exception;
use Illuminate\Support\Facades\DB;

final class CreateIssueUseCase
{
    public function __construct(
        private readonly IssueRepositoryInterface $issueRepository,
        private readonly ProjectRepositoryInterface $projectRepository,
        private readonly WorkflowRepositoryInterface $workflowRepository,
    ) {}

    public function execute(CreateIssueInput $input): IssueOutput
    {
        return DB::transaction(function () use ($input) {
            $projectId = new ProjectId($input->projectId);

            $project = $this->projectRepository->findById($projectId);
            if (! $project) {
                throw new Exception('Project not found.');
            }
            if ($project->getStatus() === 'ARCHIVED') {
                throw new Exception('Cannot create issue in an archived project.');
            }

            // Auto-generate sequential number
            $nextNumber = $this->issueRepository->nextNumberForProject($projectId);
            $issueNumber = new IssueNumber($project->getKey()->value, $nextNumber);

            // Get initial status from the project's workflow
            $initialStatusId = $this->workflowRepository->getInitialStatusId($projectId);

            $issue = Issue::create(
                new IssueId($input->issueId),
                $projectId,
                $issueNumber,
                $input->title,
                $input->description,
                new IssueTypeId($input->issueTypeId),
                new PriorityId($input->priorityId),
                new StatusId($initialStatusId),
                $input->sprintId ? new SprintId($input->sprintId) : null,
                $input->reporterUserId,
                $input->originalEstimateSeconds,
                $input->startDate,
                $input->dueDate,
                $input->parentId,
            );

            if ($input->assigneeId !== null && $input->assigneeId !== '') {
                $issue->assign(new AssigneeId($input->assigneeId), $input->reporterUserId);
            }

            $this->issueRepository->save($issue);

            return IssueOutput::fromDomain($issue);
        });
    }
}
