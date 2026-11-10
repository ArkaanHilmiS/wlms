<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Requests;

use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

final class ArchiveWorkspaceHttpRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        $workspaceId = (string) ($this->route('id') ?? $this->route('workspaceId') ?? '');
        if ($workspaceId !== '') {
            if (! DB::table('workspaces')->where('id', $workspaceId)->exists()) {
                return WorkloadAccessChecker::isSuperAdmin($user->id) || $user->hasPermission('workspaces:manage') || $user->hasPermission('workspaces:delete');
            }

            return WorkloadAccessChecker::canManageWorkspace($user->id, $workspaceId);
        }

        return $user->hasPermission('workspaces:manage') || $user->hasPermission('workspaces:delete');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }

    public function getActorId(): string
    {
        return (string) auth()->id();
    }
}
