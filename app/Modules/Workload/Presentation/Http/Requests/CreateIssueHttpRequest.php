<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Requests;

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class CreateIssueHttpRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var UserModel|null $user */
        $user = $this->user();
        if (! $user) {
            return false;
        }

        $projectId = (string) ($this->route('project_id') ?? $this->input('project_id') ?? '');
        $workspaceId = $projectId !== ''
            ? (string) DB::table('projects')->where('id', $projectId)->value('workspace_id')
            : '';

        if ($projectId !== '' && ! WorkloadAccessChecker::canViewProject($user->id, $projectId, $workspaceId !== '' ? $workspaceId : null)) {
            return false;
        }

        return WorkloadAccessChecker::hasPermissionInContext(
            $user->id,
            ['issues:create', 'issues:manage'],
            $workspaceId !== '' ? $workspaceId : null,
            $projectId !== '' ? $projectId : null
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'project_id' => ['sometimes', 'required', 'uuid'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'issue_type_id' => ['required', 'uuid'],
            'priority_id' => ['required', 'uuid'],
            'sprint_id' => ['nullable', 'uuid'],
            'assignee_id' => ['nullable'],
            'original_estimate_seconds' => ['nullable', 'integer', 'min:0'],
            'start_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'parent_id' => ['nullable', 'uuid', new ValidParentIssue((string) ($this->route('project_id') ?? $this->input('project_id')), null)],
        ];
    }

    public function getIdempotencyKey(): string
    {
        return (string) ($this->header('Idempotency-Key') ?? Str::uuid());
    }

    public function getActorId(): string
    {
        return (string) $this->user()->id;
    }
}
