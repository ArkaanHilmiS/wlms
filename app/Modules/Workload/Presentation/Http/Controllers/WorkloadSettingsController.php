<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Infrastructure\Config\WorkloadSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class WorkloadSettingsController
{
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => WorkloadSettings::all(),
            'priorities' => DB::table('priorities')
                ->select('id', 'name', 'slug', 'level')
                ->orderBy('level')
                ->get(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        /** @var UserModel|null $user */
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $allowed = $user->hasPermission('*')
            || $user->hasPermission('manage-rbac')
            || $user->hasPermission('workspaces:manage');

        if (! $allowed) {
            abort(403, 'Unauthorized.');
        }

        $validated = $request->validate([
            'sla_days_by_priority' => ['sometimes', 'array'],
            'sla_days_by_priority.*' => ['integer', 'min:0', 'max:365'],
            'working_days' => ['sometimes', 'array', 'min:1'],
            'working_days.*' => ['integer', 'between:1,7'],
            'holidays' => ['sometimes', 'array'],
            'holidays.*' => ['date_format:Y-m-d'],
            'enable_sprints_default' => ['sometimes', 'boolean'],
            'worklog_max_hours_per_day' => ['sometimes', 'numeric', 'between:1,24'],
            'worklog_allow_future_date' => ['sometimes', 'boolean'],
            'attachment_max_mb' => ['sometimes', 'integer', 'between:1,100'],
            'attachment_allowed_extensions' => ['sometimes', 'array', 'min:1'],
            'attachment_allowed_extensions.*' => ['string', 'max:20'],
            'similarity_threshold' => ['sometimes', 'numeric', 'between:0.1,0.95'],
            'sla_warning_days' => ['sometimes', 'integer', 'between:1,30'],
        ]);

        return response()->json([
            'data' => WorkloadSettings::update($validated),
        ]);
    }

    public function showWorkspace(Request $request, string $id): JsonResponse
    {
        /** @var UserModel|null $user */
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        if (! WorkloadAccessChecker::canViewWorkspace($user->id, $id)) {
            abort(403, 'Unauthorized.');
        }

        return response()->json([
            'data' => [
                'workspace_id' => $id,
                'enable_sprints' => WorkloadSettings::isSprintsEnabled($id),
            ],
        ]);
    }

    public function updateWorkspace(Request $request, string $id): JsonResponse
    {
        /** @var UserModel|null $user */
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $workspace = DB::table('workspaces')
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first(['id']);

        if (! $workspace) {
            abort(404, 'Workspace not found.');
        }

        $allowed = $user->hasPermission('*')
            || WorkloadAccessChecker::canManageWorkspace($user->id, $id)
            || $user->hasPermission('workspaces:edit')
            || $user->hasPermission('workspaces:manage')
            || $user->hasPermission('workspaces:edit', 'WORKSPACE', $id)
            || $user->hasPermission('workspaces:manage', 'WORKSPACE', $id);

        if (! $allowed) {
            abort(403, 'Unauthorized.');
        }

        $v = $request->validate([
            'enable_sprints' => ['required', 'boolean'],
        ]);

        WorkloadSettings::setWorkspaceSprintsEnabled($id, (bool) $v['enable_sprints']);

        return response()->json([
            'data' => [
                'workspace_id' => $id,
                'enable_sprints' => WorkloadSettings::isSprintsEnabled($id),
            ],
        ]);
    }
}
