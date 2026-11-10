<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Requests;

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

final class DeleteIssueHttpRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var UserModel|null $user */
        $user = $this->user();
        if (! $user) {
            return false;
        }

        $issueId = (string) $this->route('id');
        $projectId = $issueId !== ''
            ? (string) DB::table('issues')->where('id', $issueId)->value('project_id')
            : '';
        $workspaceId = $projectId !== ''
            ? (string) DB::table('projects')->where('id', $projectId)->value('workspace_id')
            : '';

        if ($projectId !== '' && ! WorkloadAccessChecker::canViewProject($user->id, $projectId, $workspaceId !== '' ? $workspaceId : null)) {
            return false;
        }

        return WorkloadAccessChecker::hasPermissionInContext(
            $user->id,
            ['issues:delete', 'issues:manage'],
            $workspaceId !== '' ? $workspaceId : null,
            $projectId !== '' ? $projectId : null
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }
}
