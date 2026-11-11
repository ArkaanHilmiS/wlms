<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\UseCases;

use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

final class ImportIssuesUseCase
{
    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return array{total_rows: int, success_count: int, skipped_count: int, errors: list<string>}
     */
    public function execute(Collection $rows, string $reporterId): array
    {
        return DB::transaction(function () use ($rows, $reporterId) {
            $defaultIssueType = DB::table('issue_types')->where('name', 'Task')->first()
                                ?? DB::table('issue_types')->first();
            $defaultPriority = DB::table('priorities')->orderBy('level')->first();
            $defaultStatus = DB::table('statuses')->first();

            $projectNames = [];
            $picNames = [];
            foreach ($rows as $row) {
                $pName = $row['project'] ?? null;
                if ($pName) {
                    $projectNames[] = $pName;
                }

                $pic = $row['pic'] ?? $row['assignee'] ?? null;
                if ($pic) {
                    $picNames[] = $pic;
                }
            }
            $projectNames = array_unique($projectNames);
            $picNames = array_unique($picNames);

            $projectsMap = DB::table('projects')
                ->whereIn('name', $projectNames)
                ->pluck('id', 'name')
                ->toArray();

            $usersMap = [];
            if (! empty($picNames)) {
                $usersQuery = DB::table('users');
                foreach ($picNames as $picName) {
                    $trimmedPic = trim((string) $picName);
                    $usersQuery->orWhere('name', 'LIKE', "%{$trimmedPic}%")
                        ->orWhere('email', '=', $trimmedPic)
                        ->orWhere('employee_id', '=', $trimmedPic);
                }
                $matchedUsers = $usersQuery->get(['id', 'name', 'email', 'employee_id']);
                foreach ($picNames as $picName) {
                    $trimmedPic = trim((string) $picName);
                    foreach ($matchedUsers as $u) {
                        if (! empty($u->employee_id) && strcasecmp(trim((string) $u->employee_id), $trimmedPic) === 0) {
                            $usersMap[$picName] = $u->id;
                            break;
                        }
                    }
                    if (! isset($usersMap[$picName])) {
                        foreach ($matchedUsers as $u) {
                            if (! empty($u->email) && strcasecmp(trim((string) $u->email), $trimmedPic) === 0) {
                                $usersMap[$picName] = $u->id;
                                break;
                            }
                        }
                    }
                    if (! isset($usersMap[$picName])) {
                        foreach ($matchedUsers as $u) {
                            if (strcasecmp(trim((string) $u->name), $trimmedPic) === 0) {
                                $usersMap[$picName] = $u->id;
                                break;
                            }
                        }
                    }
                    if (! isset($usersMap[$picName])) {
                        foreach ($matchedUsers as $u) {
                            if (stripos($u->name, $trimmedPic) !== false) {
                                $usersMap[$picName] = $u->id;
                                break;
                            }
                        }
                    }
                }
            }

            $allPriorities = DB::table('priorities')->get();
            $allStatuses = DB::table('statuses')->get();

            $projectIds = array_values($projectsMap);
            $maxNumbers = [];
            if (! empty($projectIds)) {
                $maxNumbersData = DB::table('issues')
                    ->whereIn('project_id', $projectIds)
                    ->select('project_id', DB::raw('MAX(number) as max_number'))
                    ->groupBy('project_id')
                    ->get();
                foreach ($maxNumbersData as $data) {
                    $maxNumbers[$data->project_id] = (int) $data->max_number;
                }
            }

            $insertData = [];
            $errors = [];
            $now = Carbon::now()->toDateTimeString();

            foreach ($rows as $index => $row) {
                $rowNumber = $index + 2;
                $projectName = $row['project'] ?? null;
                if (! $projectName) {
                    $errors[] = "Row {$rowNumber}: Project name is missing.";
                    Log::warning("ImportIssuesJob: Row {$rowNumber} skipped issue, no project name provided.");

                    continue;
                }

                $projectId = $projectsMap[$projectName] ?? null;
                if (! $projectId) {
                    $errors[] = "Row {$rowNumber}: Project '{$projectName}' not found in database.";
                    Log::warning("ImportIssuesJob: Row {$rowNumber} skipped issue, project not found: {$projectName}");

                    continue;
                }

                $title = $row['task'] ?? $row['title'] ?? null;
                if (! $title) {
                    $errors[] = "Row {$rowNumber}: Task title is missing.";
                    Log::warning("ImportIssuesJob: Row {$rowNumber} skipped issue, no title/task provided.");

                    continue;
                }

                $description = $row['description'] ?? null;
                $picName = $row['pic'] ?? $row['assignee'] ?? null;
                $assigneeId = $picName ? ($usersMap[$picName] ?? null) : null;

                $priorityName = $row['priority'] ?? null;
                $priorityId = $defaultPriority?->id;
                if ($priorityName) {
                    foreach ($allPriorities as $p) {
                        if (stripos($p->name, $priorityName) !== false) {
                            $priorityId = $p->id;
                            break;
                        }
                    }
                }

                $statusName = $row['status'] ?? null;
                $statusId = $defaultStatus?->id;
                if ($statusName) {
                    foreach ($allStatuses as $s) {
                        if (stripos($s->name, $statusName) !== false) {
                            $statusId = $s->id;
                            break;
                        }
                    }
                }

                $startDate = $row['start_date'] ?? $row['start date'] ?? null;
                $dueDate = $row['due_date'] ?? $row['due date'] ?? null;

                try {
                    $startDate = $startDate ? Carbon::parse($startDate)->toDateString() : null;
                } catch (\Exception $e) {
                    $startDate = null;
                }

                try {
                    $dueDate = $dueDate ? Carbon::parse($dueDate)->toDateString() : null;
                } catch (\Exception $e) {
                    $dueDate = null;
                }

                $currentMax = $maxNumbers[$projectId] ?? 0;
                $nextNumber = $currentMax + 1;
                $maxNumbers[$projectId] = $nextNumber;

                $insertData[] = [
                    'id' => Str::uuid()->toString(),
                    'project_id' => $projectId,
                    'status_id' => $statusId,
                    'number' => $nextNumber,
                    'title' => $title,
                    'description' => $description,
                    'issue_type_id' => $defaultIssueType?->id,
                    'priority_id' => $priorityId,
                    'reporter_id' => $reporterId,
                    'assignee_id' => $assigneeId,
                    'start_date' => $startDate,
                    'due_date' => $dueDate,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            if (! empty($insertData)) {
                foreach (array_chunk($insertData, 500) as $chunk) {
                    DB::table('issues')->insert($chunk);
                }
            }

            return [
                'total_rows' => $rows->count(),
                'success_count' => count($insertData),
                'skipped_count' => count($errors),
                'errors' => $errors,
            ];
        });
    }
}