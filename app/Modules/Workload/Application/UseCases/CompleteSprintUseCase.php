<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\UseCases;

use App\Modules\Workload\Domain\Repositories\IssueRepositoryInterface;
use App\Modules\Workload\Domain\Repositories\SprintRepositoryInterface;
use App\Modules\Workload\Domain\ValueObjects\IssueId;
use App\Modules\Workload\Domain\ValueObjects\SprintId;
use DateTimeImmutable;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

final class CompleteSprintUseCase
{
    public function __construct(
        private readonly SprintRepositoryInterface $sprintRepository
    ) {}

    public function execute(string $sprintId, string $actorId, ?string $moveToSprintId = null): void
    {
        $sprint = $this->sprintRepository->findById(new SprintId($sprintId));
        if (! $sprint) {
            throw new InvalidArgumentException('Sprint not found');
        }

        $sprint->complete(new DateTimeImmutable);
        $this->sprintRepository->save($sprint);

        $issueIds = DB::table('issues')
            ->join('statuses', 'issues.status_id', '=', 'statuses.id')
            ->where('issues.sprint_id', $sprintId)
            ->whereNull('issues.deleted_at')
            ->where('statuses.category', '!=', 'DONE')
            ->pluck('issues.id');

        /** @var IssueRepositoryInterface $issueRepo */
        $issueRepo = app(IssueRepositoryInterface::class);

        foreach ($issueIds as $issueId) {
            $issueEntity = $issueRepo->findById(new IssueId((string) $issueId));
            if ($issueEntity) {
                $newSprintId = $moveToSprintId ? new SprintId($moveToSprintId) : null;
                $issueEntity->updateDetails(
                    $issueEntity->getTitle(),
                    $issueEntity->getDescription(),
                    $issueEntity->getPriorityId(),
                    $newSprintId,
                    $issueEntity->getOriginalEstimateSeconds()
                );

                // The user wants to retain assignee even if moving to backlog
                // if ($newSprintId === null && $issueEntity->getAssigneeId()) {
                //     $issueEntity->assign(null, $actorId);
                // }

                $issueRepo->save($issueEntity);
            }
        }
    }
}
