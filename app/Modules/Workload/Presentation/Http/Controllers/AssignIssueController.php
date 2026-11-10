<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\DTOs\AssignIssueInput;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Application\UseCases\AssignIssueUseCase;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueModel;
use App\Modules\Workload\Presentation\Http\Requests\AssignIssueHttpRequest;
use App\Modules\Workload\Presentation\Http\Resources\IssueResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

final class AssignIssueController
{
    public function __construct(private readonly AssignIssueUseCase $useCase) {}

    public function __invoke(AssignIssueHttpRequest $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(403, 'Unauthorized.');
        }

        if (! WorkloadAccessChecker::isSuperAdmin($user->id)) {
            $issue = DB::table('issues')->where('id', $id)->whereNull('deleted_at')->first(['project_id']);
            if (! $issue || ! WorkloadAccessChecker::canViewProject($user->id, (string) $issue->project_id)) {
                abort(403, 'Unauthorized.');
            }

            $projectId = (string) $issue->project_id;
            $workspaceId = (string) DB::table('projects')->where('id', $projectId)->value('workspace_id');

            $canAssign = ($workspaceId !== '' && WorkloadAccessChecker::canManageWorkspace($user->id, $workspaceId))
                || WorkloadAccessChecker::hasPermissionInContext(
                    $user->id,
                    ['issues:assign', 'issues:manage'],
                    $workspaceId !== '' ? $workspaceId : null,
                    $projectId
                );

            if (! $canAssign) {
                abort(403, 'Unauthorized. Only Workspace Owners or users with issues:assign can assign issues.');
            }
        }

        $output = $this->useCase->execute(new AssignIssueInput(
            issueId: $id,
            assigneeId: $request->validated('assignee_id') !== null ? (string) $request->validated('assignee_id') : null,
            actorUserId: $request->getActorId()
        ));
        $issue = IssueModel::with(['assignee', 'reporter', 'status'])->find($output->id);

        return response()->json(['data' => new IssueResource($issue)]);
    }
}
