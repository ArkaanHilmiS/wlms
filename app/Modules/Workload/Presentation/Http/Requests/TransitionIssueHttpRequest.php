<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Requests;

use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

final class TransitionIssueHttpRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        if (WorkloadAccessChecker::isSuperAdmin($user->id)) {
            return true;
        }

        $issueId = (string) $this->route('id');
        if ($issueId === '') {
            return false;
        }

        $issue = DB::table('issues')
            ->where('id', $issueId)
            ->whereNull('deleted_at')
            ->first(['project_id', 'assignee_id']);

        if (! $issue) {
            return false;
        }

        $projectId = (string) $issue->project_id;
        if (! WorkloadAccessChecker::canViewProject($user->id, $projectId)) {
            return false;
        }

        if ($issue->assignee_id !== null && (string) $issue->assignee_id === (string) $user->id) {
            return true;
        }

        $workspaceId = (string) DB::table('projects')->where('id', $projectId)->value('workspace_id');
        if ($workspaceId !== '' && WorkloadAccessChecker::canManageWorkspace($user->id, $workspaceId)) {
            return true;
        }

        return WorkloadAccessChecker::hasPermissionInContext(
            $user->id,
            ['issues:transition', 'issues:edit', 'issues:manage'],
            $workspaceId !== '' ? $workspaceId : null,
            $projectId
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return ['to_status_id' => ['required', 'uuid']];
    }

    public function getActorId(): string
    {
        return (string) $this->user()->id;
    }
}
