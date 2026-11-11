<?php

namespace App\Modules\Workload\Application\UseCases;

use App\Modules\Workload\Application\DTOs\LogWorkInput;
use App\Modules\Workload\Domain\Repositories\IssueRepositoryInterface;
use App\Modules\Workload\Domain\ValueObjects\IssueId;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class LogWorkUseCase
{
    public function __construct(
        private IssueRepositoryInterface $issueRepository
    ) {}

    public function execute(LogWorkInput $input): void
    {
        DB::transaction(function () use ($input) {
            $issue = $this->issueRepository->findById(new IssueId($input->issueId));

            if (! $issue) {
                throw new InvalidArgumentException('Issue not found');
            }

            DB::table('worklogs')->insert([
                'id' => (string) Str::uuid(),
                'issue_id' => $input->issueId,
                'author_id' => $input->authorUserId,
                'time_spent_seconds' => $input->timeSpentSeconds,
                'description' => $input->description,
                'started_at' => $input->startedAt,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Decrement remaining_estimate_seconds
            $issueRow = DB::table('issues')->where('id', $input->issueId)->first(['remaining_estimate_seconds']);
            if ($issueRow && $issueRow->remaining_estimate_seconds !== null) {
                $newRemaining = max(0, (int) $issueRow->remaining_estimate_seconds - $input->timeSpentSeconds);
                DB::table('issues')->where('id', $input->issueId)->update([
                    'remaining_estimate_seconds' => $newRemaining,
                    'updated_at' => now(),
                ]);
            }
        });
    }
}
