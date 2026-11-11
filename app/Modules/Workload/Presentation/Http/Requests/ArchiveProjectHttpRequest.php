<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Requests;

use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use Illuminate\Foundation\Http\FormRequest;

final class ArchiveProjectHttpRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        $projectId = (string) $this->route('id');
        if ($projectId !== '') {
            return WorkloadAccessChecker::canDeleteProject($user->id, $projectId);
        }

        return $user->hasPermission('projects:manage') || $user->hasPermission('projects:delete');
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
        return (string) $this->user()->id;
    }
}
