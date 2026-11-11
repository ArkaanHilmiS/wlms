<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\DTOs\AssignIssueInput;
use App\Modules\Workload\Application\DTOs\TransitionIssueInput;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Application\UseCases\AssignIssueUseCase;
use App\Modules\Workload\Application\UseCases\TransitionIssueStatusUseCase;
use App\Modules\Workload\Domain\Exceptions\InvalidTransitionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class BulkUpdateIssuesController
{
    public function __construct(
        private readonly AssignIssueUseCase $assignUseCase,
        private readonly TransitionIssueStatusUseCase $transitionUseCase,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'issue_ids' => ['required', 'array', 'min:1'],
            'issue_ids.*' => ['required', 'string'],
            'status_id' => ['nullable', 'string'],
            'assignee_id' => ['nullable'],
        ]);

        $user = $request->user();
        if (! $user) {
            abort(403, 'Unauthorized.');
        }
        $actorId = (string) $user->id;

        if (! WorkloadAccessChecker::isSuperAdmin($user->id)) {
            foreach ($validated['issue_ids'] as $issueId) {
                $issue = DB::table('issues')
                    ->where('id', (string) $issueId)
                    ->whereNull('deleted_at')
                    ->first(['project_id', 'assignee_id']);

                if (! $issue || ! WorkloadAccessChecker::canViewProject($user->id, (string) $issue->project_id)) {
                    abort(403, 'Unauthorized access to target issue project.');
                }

                $projectId = (string) $issue->project_id;
                $workspaceId = (string) DB::table('projects')->where('id', $projectId)->value('workspace_id');
                $canManageWs = $workspaceId !== '' && WorkloadAccessChecker::canManageWorkspace($user->id, $workspaceId);

                if (! empty($validated['status_id'])) {
                    $isAssignee = $issue->assignee_id !== null && (string) $issue->assignee_id === (string) $user->id;
                    $canTransition = $isAssignee
                        || $canManageWs
                        || WorkloadAccessChecker::hasPermissionInContext(
                            $user->id,
                            ['issues:transition', 'issues:edit', 'issues:manage'],
                            $workspaceId !== '' ? $workspaceId : null,
                            $projectId
                        );

                    if (! $canTransition) {
                        abort(403, 'Unauthorized to transition issue status.');
                    }
                }

                if (array_key_exists('assignee_id', $validated)) {
                    $canAssign = $canManageWs
                        || WorkloadAccessChecker::hasPermissionInContext(
                            $user->id,
                            ['issues:assign', 'issues:manage'],
                            $workspaceId !== '' ? $workspaceId : null,
                            $projectId
                        );

                    if (! $canAssign) {
                        abort(403, 'Unauthorized. Only Workspace Owners can assign issues for now.');
                    }
                }
            }
        }

        try {
            DB::transaction(function () use ($validated, $actorId): void {
                foreach ($validated['issue_ids'] as $issueId) {
                    if (! empty($validated['status_id'])) {
                        $this->transitionUseCase->execute(new TransitionIssueInput(
                            issueId: (string) $issueId,
                            toStatusId: (string) $validated['status_id'],
                            actorUserId: $actorId,
                        ));
                    }

                    if (array_key_exists('assignee_id', $validated)) {
                        $assigneeId = $validated['assignee_id'];
                        $this->assignUseCase->execute(new AssignIssueInput(
                            issueId: (string) $issueId,
                            assigneeId: ($assigneeId !== null && $assigneeId !== 'unassigned') ? (string) $assigneeId : null,
                            actorUserId: $actorId,
                        ));
                    }
                }
            });
        } catch (InvalidTransitionException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'INVALID_TRANSITION',
            ], 422);
        }

        return response()->json(['message' => 'Issues updated successfully']);
    }
}
