<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Requests;

use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\WorkspaceModel;
use Illuminate\Foundation\Http\FormRequest;

final class GetWorkspaceAnalyticsHttpRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        $workspaceId = (string) ($this->route('id') ?? $this->route('workspaceId') ?? $this->route('workspace_id') ?? '');
        if ($workspaceId === '') {
            abort(404, 'Workspace not found.');
        }

        $workspace = WorkspaceModel::where('id', $workspaceId)->whereNull('deleted_at')->first();
        if (! $workspace) {
            abort(404, 'Workspace not found.');
        }

        if (WorkloadAccessChecker::canManageWorkspace($user->id, $workspaceId, $workspace)) {
            return true;
        }

        if (
            $user->hasPermission('analytics:view')
            || $user->hasPermission('workspaces:manage')
            || $user->hasPermission('analytics:view', 'WORKSPACE', $workspaceId)
            || $user->hasPermission('workspaces:manage', 'WORKSPACE', $workspaceId)
        ) {
            return WorkloadAccessChecker::canViewWorkspace($user->id, $workspaceId)
                || $user->can('view', $workspace);
        }

        return false;
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
        ];
    }
}
