<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\Queries\GetWorkspaceIssuesQuery;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Infrastructure\Exports\IssuesExport;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Excel as ExcelFormat;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

final class ExportIssuesController extends Controller
{
    public function __construct(
        private readonly GetWorkspaceIssuesQuery $query
    ) {}

    public function exportWorkspace(Request $request, string $workspaceId): BinaryFileResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        if (! WorkloadAccessChecker::canViewWorkspace($user->id, $workspaceId)) {
            abort(403, 'Unauthorized access to workspace.');
        }

        $filters = $request->only([
            'status_category',
            'status_id',
            'assignee_id',
            'sprint_id',
            'project_id',
            'type_id',
            'priority_id',
            'search',
        ]);

        $builder = $this->query->buildQuery($workspaceId, $filters, (string) $user->id);

        $format = strtolower((string) $request->query('format', 'xlsx'));
        $writerType = $format === 'csv' ? ExcelFormat::CSV : ExcelFormat::XLSX;
        $extension = $format === 'csv' ? 'csv' : 'xlsx';

        $timestamp = now()->format('Ymd_His');
        $filename = "issues_export_{$timestamp}.{$extension}";

        return Excel::download(new IssuesExport($builder), $filename, $writerType);
    }

    public function exportProject(Request $request, string $projectId): BinaryFileResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        if (! WorkloadAccessChecker::canViewProject($user->id, $projectId)) {
            abort(403, 'Unauthorized access to project.');
        }

        $workspaceId = (string) DB::table('projects')->where('id', $projectId)->value('workspace_id');
        if (! $workspaceId) {
            abort(404, 'Project not found.');
        }

        $request->merge(['project_id' => $projectId]);

        return $this->exportWorkspace($request, $workspaceId);
    }
}

