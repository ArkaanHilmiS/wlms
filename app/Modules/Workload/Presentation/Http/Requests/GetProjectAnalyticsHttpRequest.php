<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Requests;

use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

final class GetProjectAnalyticsHttpRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        $projectId = (string) ($this->route('id') ?? $this->route('projectId') ?? $this->route('project_id') ?? '');
        if ($projectId === '') {
            abort(404, 'Project not found.');
        }

        $project = DB::table('projects')
            ->join('workspaces', 'workspaces.id', '=', 'projects.workspace_id')
            ->where('projects.id', $projectId)
            ->whereNull('projects.deleted_at')
            ->whereNull('workspaces.deleted_at')
            ->first([
                'projects.id',
                'projects.workspace_id',
                'projects.lead_id',
                'workspaces.owner_group_id',
                'workspaces.status',
            ]);

        if (! $project) {
            abort(404, 'Project not found.');
        }

        if (WorkloadAccessChecker::canManageWorkspace($user->id, (string) $project->workspace_id, $project) || (string) $project->lead_id === (string) $user->id) {
            return true;
        }

        $workspaceId = (string) $project->workspace_id;
        $hasAnalyticsPerm = $user->hasPermission('analytics:view')
            || $user->hasPermission('projects:manage')
            || $user->hasPermission('analytics:view', 'WORKSPACE', $workspaceId)
            || $user->hasPermission('projects:manage', 'WORKSPACE', $workspaceId)
            || $user->hasPermission('analytics:view', 'PROJECT', $projectId)
            || $user->hasPermission('projects:manage', 'PROJECT', $projectId);

        if (! $hasAnalyticsPerm) {
            abort(403, 'Unauthorized.');
        }

        if (! WorkloadAccessChecker::canViewProject($user->id, $projectId, (string) $project->workspace_id, $project->lead_id)) {
            abort(403, 'Unauthorized.');
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'date_range' => ['nullable', 'string', 'in:7d,30d,quarter,custom,last_7_days,last_30_days,this_quarter'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'sprint_id' => ['nullable', 'string'],
        ];
    }
}
