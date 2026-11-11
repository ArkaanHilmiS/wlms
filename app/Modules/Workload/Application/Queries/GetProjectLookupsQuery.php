<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\Queries;

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Workload\Infrastructure\Config\WorkloadSettings;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueTypeModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\PriorityModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\StatusModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\WorkflowModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\WorkflowTransitionModel;
use Illuminate\Database\Eloquent\Collection;

/**
 * Pragmatic CQRS: Query khusus untuk mengambil master data (lookups)
 * yang dibutuhkan oleh halaman Project.
 */
final class GetProjectLookupsQuery
{
    /**
     * @return array<string, mixed>
     */
    public function getLookupsForProject(string $workspaceId, ?string $workflowId, ?string $projectId = null): array
    {
        $issueTypes = IssueTypeModel::select('id', 'name', 'slug', 'icon', 'color')->get();
        $priorities = PriorityModel::select('id', 'name', 'slug', 'level', 'icon', 'color')->get();

        if (! $workflowId) {
            $defaultWorkflow = WorkflowModel::where('is_default', true)->first();
            $workflowId = $defaultWorkflow?->id;
        }

        $statusIds = [];
        if ($workflowId) {
            $transitions = WorkflowTransitionModel::where('workflow_id', $workflowId)->get();
            foreach ($transitions as $t) {
                if ($t->from_status_id) {
                    $statusIds[] = $t->from_status_id;
                }
                if ($t->to_status_id) {
                    $statusIds[] = $t->to_status_id;
                }
            }
            $statusIds = array_unique($statusIds);
        }

        if (! empty($statusIds)) {
            $statuses = StatusModel::select('id', 'name', 'category', 'slug', 'color')->whereIn('id', $statusIds)->get();
        } else {
            $statuses = StatusModel::select('id', 'name', 'category', 'slug', 'color')->get();
        }

        $users = UserModel::select('users.id', 'users.name')
            ->join('workspace_members', 'users.id', '=', 'workspace_members.user_id')
            ->where('workspace_members.workspace_id', $workspaceId)
            ->where('users.status', 'ACTIVE')
            ->distinct()
            ->get();

        return [
            'issueTypes' => $issueTypes,
            'priorities' => $priorities,
            'statuses' => $statuses,
            'users' => $users,
            'settings' => [
                ...WorkloadSettings::all(),
                'enable_sprints' => WorkloadSettings::isSprintsEnabled($workspaceId),
            ],
        ];
    }

    /**
     * @return array{priorities: Collection<int, PriorityModel>}
     */
    public function getPrioritiesOnly(): array
    {
        return [
            'priorities' => PriorityModel::select('id', 'name', 'slug', 'level', 'icon', 'color')->get(),
        ];
    }
}
