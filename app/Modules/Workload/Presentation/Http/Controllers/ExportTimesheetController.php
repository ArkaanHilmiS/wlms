<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Infrastructure\Exports\TimesheetsExport;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Excel as ExcelFormat;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

final class ExportTimesheetController extends Controller
{
    public function exportWorkspace(Request $request, string $workspaceId): BinaryFileResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $projectId = $request->input('project_id') ? (string) $request->input('project_id') : null;

        $canAccessScope = $projectId !== null
            ? WorkloadAccessChecker::canViewProject($user->id, $projectId)
            : WorkloadAccessChecker::canViewWorkspace($user->id, $workspaceId);

        $hasPermissionOrMembership = WorkloadAccessChecker::canManageWorkspace($user->id, $workspaceId)
            || DB::table('workspace_members')->where('workspace_id', $workspaceId)->where('user_id', $user->id)->exists()
            || ($projectId !== null && DB::table('projects')->where('id', $projectId)->where('lead_id', $user->id)->exists())
            || $user->hasPermission('issues:view')
            || $user->hasPermission('issues:view', 'WORKSPACE', $workspaceId)
            || ($projectId !== null && $user->hasPermission('issues:view', 'PROJECT', $projectId));

        if (! $canAccessScope || ! $hasPermissionOrMembership) {
            abort(403, 'Unauthorized access to timesheet export.');
        }

        $query = DB::table('worklogs')
            ->join('issues', function ($join): void {
                $join->on('worklogs.issue_id', '=', 'issues.id')
                    ->whereNull('issues.deleted_at');
            })
            ->join('projects', function ($join) use ($workspaceId): void {
                $join->on('issues.project_id', '=', 'projects.id')
                    ->where('projects.workspace_id', '=', $workspaceId)
                    ->whereNull('projects.deleted_at');
            })
            ->join('users', 'worklogs.author_id', '=', 'users.id')
            ->leftJoin('org_units', 'users.org_unit_id', '=', 'org_units.id')
            ->leftJoin('sprints', 'issues.sprint_id', '=', 'sprints.id')
            ->leftJoin('statuses', 'issues.status_id', '=', 'statuses.id')
            ->select([
                'worklogs.id',
                'worklogs.started_at',
                'worklogs.time_spent_seconds',
                'worklogs.description',
                'users.name as user_name',
                'users.email as user_email',
                'org_units.name as org_unit_name',
                'projects.key as project_key',
                'projects.name as project_name',
                'issues.sprint_id',
                'sprints.name as sprint_name',
                'issues.number as issue_number',
                'issues.title as issue_title',
                'statuses.name as status_name',
            ]);

        if ($projectId !== null && $projectId !== '') {
            $query->where('issues.project_id', $projectId);
        }

        $month = $request->query('month') ? (string) $request->query('month') : null;
        if ($month !== null && preg_match('/^\d{4}-\d{2}$/', $month) === 1) {
            $monthStart = CarbonImmutable::createFromFormat('!Y-m', $month);
            if ($monthStart !== false) {
                $query->whereBetween('worklogs.started_at', [
                    $monthStart->startOfMonth()->toDateTimeString(),
                    $monthStart->endOfMonth()->toDateTimeString(),
                ]);
            }
        } else {
            $from = $request->query('from') ? (string) $request->query('from') : null;
            $to = $request->query('to') ? (string) $request->query('to') : null;
            if ($from !== null && $from !== '') {
                $query->where('worklogs.started_at', '>=', CarbonImmutable::parse($from)->startOfDay()->toDateTimeString());
            }
            if ($to !== null && $to !== '') {
                $query->where('worklogs.started_at', '<=', CarbonImmutable::parse($to)->endOfDay()->toDateTimeString());
            }
        }

        $rows = $query
            ->orderBy('worklogs.started_at', 'asc')
            ->orderBy('users.name', 'asc')
            ->get();

        $format = strtolower((string) $request->query('format', 'xlsx'));
        $writerType = $format === 'csv' ? ExcelFormat::CSV : ExcelFormat::XLSX;
        $extension = $format === 'csv' ? 'csv' : 'xlsx';

        $periodSuffix = $month ?? now()->format('Y-m');
        $filename = "timesheet_{$periodSuffix}.{$extension}";

        return Excel::download(new TimesheetsExport($rows), $filename, $writerType);
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

        $workspaceId = (string) DB::table('projects')
            ->where('id', $projectId)
            ->whereNull('deleted_at')
            ->value('workspace_id');

        if ($workspaceId === '') {
            abort(404, 'Project not found.');
        }

        $request->merge(['project_id' => $projectId]);

        return $this->exportWorkspace($request, $workspaceId);
    }
}
