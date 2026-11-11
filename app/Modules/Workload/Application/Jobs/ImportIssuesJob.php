<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\Jobs;

use App\Modules\Workload\Application\UseCases\ImportIssuesUseCase;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Facades\Excel;

final class ImportIssuesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public readonly string $filePath,
        public readonly string $reporterId,
        public readonly ?string $importLogId = null
    ) {}

    public function handle(ImportIssuesUseCase $useCase): void
    {
        if ($this->importLogId) {
            DB::table('import_logs')->where('id', $this->importLogId)->update([
                'status' => 'PROCESSING',
                'updated_at' => now(),
            ]);
        }

        $import = new class($this->reporterId, $useCase, $this->importLogId) implements ToCollection, WithHeadingRow
        {
            public function __construct(
                private readonly string $reporterId,
                private readonly ImportIssuesUseCase $useCase,
                private readonly ?string $importLogId
            ) {}

            public function collection(Collection $rows): void
            {
                $result = $this->useCase->execute($rows, $this->reporterId);
                if ($this->importLogId) {
                    DB::table('import_logs')->where('id', $this->importLogId)->update([
                        'status' => 'COMPLETED',
                        'total_rows' => $result['total_rows'],
                        'success_count' => $result['success_count'],
                        'skipped_count' => $result['skipped_count'],
                        'errors' => json_encode($result['errors']),
                        'updated_at' => now(),
                    ]);
                }
            }
        };

        if (Storage::disk('local')->exists($this->filePath)) {
            try {
                Excel::import($import, Storage::disk('local')->path($this->filePath));
            } catch (\Throwable $e) {
                if ($this->importLogId) {
                    DB::table('import_logs')->where('id', $this->importLogId)->update([
                        'status' => 'FAILED',
                        'errors' => json_encode([$e->getMessage()]),
                        'updated_at' => now(),
                    ]);
                }
                throw $e;
            } finally {
                Storage::disk('local')->delete($this->filePath);
            }
        } else {
            Log::warning("ImportIssuesJob: File not found {$this->filePath}");
            if ($this->importLogId) {
                DB::table('import_logs')->where('id', $this->importLogId)->update([
                    'status' => 'FAILED',
                    'errors' => json_encode(["File not found {$this->filePath}"]),
                    'updated_at' => now(),
                ]);
            }
        }
    }
}
