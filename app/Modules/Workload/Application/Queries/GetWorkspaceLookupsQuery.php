<?php

declare(strict_types=1);

namespace App\Modules\Workload\Application\Queries;

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Workload\Infrastructure\Config\WorkloadSettings;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueTypeModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\PriorityModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\ProjectModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\StatusModel;

final class GetWorkspaceLookupsQuery
{
    /**
     * @return array<string, mixed>
     */
    public function execute(string $workspaceId): array
    {
        $projects = ProjectModel::select('id', 'name', 'key')
            ->where('workspace_id', $workspaceId)
            ->get();

        $issueTypes = IssueTypeModel::select('id', 'name', 'icon')->get();
        $priorities = PriorityModel::select('id', 'name', 'icon', 'color')->get();
        $statuses = StatusModel::select('id', 'name', 'category', 'slug', 'color')->get();

        $users = UserModel::select('users.id', 'users.name')
            ->join('workspace_members', 'users.id', '=', 'workspace_members.user_id')
            ->where('workspace_members.workspace_id', $workspaceId)
            ->where('users.status', 'ACTIVE')
            ->distinct()
            ->get();

        return [
            'projects' => $projects,
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
}
