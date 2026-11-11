<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\Jobs\ImportIssuesJob;
use App\Modules\Workload\Application\Jobs\ImportProjectsJob;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Response;
use InvalidArgumentException;

final class ImportWorkloadController extends Controller
{
    public function index(): Response
    {
        $logs = DB::table('import_logs')
            ->leftJoin('users', 'import_logs.user_id', '=', 'users.id')
            ->select([
                'import_logs.id',
                'import_logs.filename',
                'import_logs.type',
                'import_logs.status',
                'import_logs.total_rows',
                'import_logs.success_count',
                'import_logs.skipped_count',
                'import_logs.errors',
                'import_logs.created_at',
                'users.name as user_name',
            ])
            ->orderByDesc('import_logs.created_at')
            ->limit(20)
            ->get()
            ->map(fn ($log) => [
                'id' => (string) $log->id,
                'filename' => (string) $log->filename,
                'type' => (string) $log->type,
                'status' => (string) $log->status,
                'total_rows' => (int) $log->total_rows,
                'success_count' => (int) $log->success_count,
                'skipped_count' => (int) $log->skipped_count,
                'errors' => is_string($log->errors) ? json_decode($log->errors, true) : ($log->errors ?? []),
                'created_at' => (string) $log->created_at,
                'user_name' => (string) ($log->user_name ?? 'System'),
            ]);

        return inertia('Admin/Import/Index', [
            'importLogs' => $logs,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string', 'in:projects,issues'],
            'file' => ['required', 'file', 'mimes:csv,txt,xls,xlsx'],
            'workspace_id' => ['required_if:type,projects', 'nullable', 'string', 'uuid'],
        ]);

        $file = $request->file('file');
        if (! $file) {
            throw new InvalidArgumentException('File is required');
        }

        $originalFilename = $file->getClientOriginalName();
        $filePath = $file->store('imports', 'local');
        if (! is_string($filePath)) {
            throw new InvalidArgumentException('Failed to store file');
        }

        $importLogId = (string) Str::uuid();
        DB::table('import_logs')->insert([
            'id' => $importLogId,
            'user_id' => $request->user()?->id,
            'filename' => $originalFilename,
            'type' => $validated['type'],
            'status' => 'PENDING',
            'total_rows' => 0,
            'success_count' => 0,
            'skipped_count' => 0,
            'errors' => json_encode([]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($validated['type'] === 'projects') {
            ImportProjectsJob::dispatch($filePath, (string) $validated['workspace_id'], $importLogId);
        } elseif ($validated['type'] === 'issues') {
            ImportIssuesJob::dispatch($filePath, (string) $request->user()?->id, $importLogId);
        }

        return back()->with('success', 'Import started successfully');
    }
}
