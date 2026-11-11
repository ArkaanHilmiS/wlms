<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\UseCases;

use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

final class ImportProjectsUseCase
{
    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return array{total_rows: int, success_count: int, skipped_count: int, errors: list<string>}
     */
    public function execute(Collection $rows, string $workspaceId): array
    {
        return DB::transaction(function () use ($rows, $workspaceId) {
            $defaultPriority = DB::table('priorities')->orderBy('level')->first();
            $priorityId = $defaultPriority ? $defaultPriority->id : null;

            $existingKeys = DB::table('projects')
                ->where('workspace_id', $workspaceId)
                ->pluck('key')
                ->toArray();

            $usedKeys = array_flip($existingKeys);

            $insertData = [];
            $errors = [];
            $now = Carbon::now()->toDateTimeString();

            foreach ($rows as $index => $row) {
                $rowNumber = $index + 2;
                $name = $row['project_name'] ?? $row['project name'] ?? $row['name'] ?? null;
                if (! $name) {
                    $errors[] = "Row {$rowNumber}: Project name is empty or missing.";
                    Log::warning("ImportProjectsJob: Row {$rowNumber} skipped empty project name.");

                    continue;
                }

                $status = $row['project_status'] ?? $row['project status'] ?? $row['status'] ?? 'ACTIVE';
                $description = $row['notes'] ?? $row['description'] ?? null;

                $startDate = $row['start_date'] ?? $row['start date'] ?? null;
                $endDate = $row['end_date'] ?? $row['end date'] ?? null;

                try {
                    $startDate = $startDate ? Carbon::parse($startDate)->toDateString() : null;
                } catch (\Exception $e) {
                    $startDate = null;
                }

                try {
                    $endDate = $endDate ? Carbon::parse($endDate)->toDateString() : null;
                } catch (\Exception $e) {
                    $endDate = null;
                }

                $baseKey = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', (string) $name), 0, 3));
                if (empty($baseKey)) {
                    $baseKey = 'PRJ';
                }

                $key = $baseKey;
                $counter = 1;
                while (isset($usedKeys[$key])) {
                    $key = $baseKey.$counter;
                    $counter++;
                }
                $usedKeys[$key] = true;

                $insertData[] = [
                    'id' => Str::uuid()->toString(),
                    'workspace_id' => $workspaceId,
                    'priority_id' => $priorityId,
                    'key' => $key,
                    'name' => $name,
                    'description' => $description,
                    'status' => strtoupper((string) $status),
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            if (! empty($insertData)) {
                foreach (array_chunk($insertData, 500) as $chunk) {
                    DB::table('projects')->insert($chunk);
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
