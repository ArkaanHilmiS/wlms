<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Workload\Application\DTOs\AssignIssueInput;
use App\Modules\Workload\Application\DTOs\CreateIssueInput;
use App\Modules\Workload\Application\DTOs\TransitionIssueInput;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Application\UseCases\AssignIssueUseCase;
use App\Modules\Workload\Application\UseCases\CreateIssueUseCase;
use App\Modules\Workload\Application\UseCases\DeleteIssueUseCase;
use App\Modules\Workload\Application\UseCases\TransitionIssueStatusUseCase;
use App\Modules\Workload\Domain\Exceptions\InvalidTransitionException;
use App\Modules\Workload\Infrastructure\Config\WorkloadSettings;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\StatusModel;
use App\Modules\Workload\Presentation\Http\Requests\CreateIssueHttpRequest;
use App\Modules\Workload\Presentation\Http\Requests\DeleteIssueHttpRequest;
use App\Modules\Workload\Presentation\Http\Requests\UpdateIssueHttpRequest;
use App\Modules\Workload\Presentation\Http\Resources\IssueResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class IssueController
{
    public function __construct(
        private readonly CreateIssueUseCase $createUseCase,
        private readonly DeleteIssueUseCase $deleteUseCase,
        private readonly TransitionIssueStatusUseCase $transitionUseCase,
        private readonly AssignIssueUseCase $assignUseCase,
    ) {}

    public function index(Request $request, string $projectId): JsonResponse
    {
        /** @var UserModel|null $user */
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $project = DB::table('projects')
            ->where('id', $projectId)
            ->whereNull('deleted_at')
            ->first(['workspace_id', 'lead_id']);

        if (! $project) {
            abort(404, 'Project not found.');
        }

        $workspaceId = (string) $project->workspace_id;

        $hasPermission = $user->hasPermission('issues:view')
            || $user->hasPermission('issues:view', 'WORKSPACE', $workspaceId)
            || $user->hasPermission('issues:view', 'PROJECT', $projectId);

        if (! $hasPermission) {
            abort(403, 'Unauthorized.');
        }

        if (! WorkloadAccessChecker::canViewProject($user->id, $projectId, $workspaceId, $project->lead_id)) {
            abort(403, 'Unauthorized.');
        }

        $query = IssueModel::query()
            ->withLinkStats()
            ->with(['assignee', 'reporter', 'status'])
            ->where('project_id', $projectId);

        if ($request->has('status_id')) {
            $query->where('status_id', $request->query('status_id'));
        }

        if ($request->has('assignee_id')) {
            $query->where('assignee_id', $request->query('assignee_id'));
        }

        if ($request->boolean('exclude_archived_done')) {
            $query->where(function ($q): void {
                $q->whereDoesntHave('status', fn ($s) => $s->where('category', 'DONE'))
                    ->orWhere('updated_at', '>=', now()->subDays(30));
            });
        }

        $perPage = min(500, max(1, (int) $request->query('per_page', $request->query('limit', 15))));
        $issues = $query->paginate($perPage);

        return response()->json(IssueResource::collection($issues)->response()->getData(true));
    }

    public function store(CreateIssueHttpRequest $request, string $projectId): JsonResponse
    {
        $v = $request->validated();

        $dueDate = ! empty($v['due_date'])
            ? (string) $v['due_date']
            : WorkloadSettings::calculateDefaultDueDate(
                (string) $v['priority_id'],
                isset($v['start_date']) && $v['start_date'] !== '' ? (string) $v['start_date'] : null
            );

        $output = $this->createUseCase->execute(new CreateIssueInput(
            issueId: $request->getIdempotencyKey(),
            projectId: $projectId,
            title: $v['title'],
            description: $v['description'] ?? null,
            issueTypeId: $v['issue_type_id'],
            priorityId: $v['priority_id'],
            sprintId: $v['sprint_id'] ?? null,
            reporterUserId: $request->getActorId(),
            originalEstimateSeconds: $v['original_estimate_seconds'] ?? null,
            assigneeId: isset($v['assignee_id']) && $v['assignee_id'] !== '' ? (string) $v['assignee_id'] : null,
            startDate: $v['start_date'] ?? null,
            dueDate: $dueDate,
            parentId: $v['parent_id'] ?? null,
        ));

        // Load eloquent model to return with Resource
        $issue = IssueModel::with(['assignee', 'reporter', 'status'])->find($output->id);

        return response()->json(['data' => new IssueResource($issue)], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        /** @var UserModel|null $user */
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $issue = IssueModel::with(['assignee', 'reporter', 'status'])->findOrFail($id);
        $project = DB::table('projects')
            ->where('id', $issue->project_id)
            ->whereNull('deleted_at')
            ->first(['workspace_id', 'lead_id']);

        $workspaceId = $project ? (string) $project->workspace_id : '';
        $projectId = (string) $issue->project_id;

        $hasPermission = $user->hasPermission('issues:view')
            || ($workspaceId !== '' && $user->hasPermission('issues:view', 'WORKSPACE', $workspaceId))
            || $user->hasPermission('issues:view', 'PROJECT', $projectId);

        if (! $hasPermission) {
            abort(403, 'Unauthorized.');
        }

        if (! WorkloadAccessChecker::canViewProject($user->id, $projectId, $workspaceId, $project?->lead_id)) {
            abort(403, 'Unauthorized.');
        }

        return response()->json(['data' => new IssueResource($issue)]);
    }

    public function update(UpdateIssueHttpRequest $request, string $id): JsonResponse
    {
        $v = $request->validated();
        $actorId = (string) $request->user()?->id;

        $issueModel = IssueModel::findOrFail($id);

        if ((string) $v['status_id'] !== (string) $issueModel->status_id) {
            try {
                $this->transitionUseCase->execute(new TransitionIssueInput(
                    issueId: $id,
                    toStatusId: (string) $v['status_id'],
                    actorUserId: $actorId,
                ));
            } catch (InvalidTransitionException $e) {
                $fromName = $e->fromStatusId ? (StatusModel::find($e->fromStatusId)->name ?? 'Unknown') : 'Start';
                $toName = $e->toStatusId ? (StatusModel::find($e->toStatusId)->name ?? 'Unknown') : 'Unknown';

                return response()->json([
                    'message' => "Transisi tiket dari status '$fromName' ke '$toName' tidak diizinkan oleh sistem Workflow Anda.",
                    'code' => 'INVALID_TRANSITION',
                ], 422);
            }
        }

        if (array_key_exists('assignee_id', $v) && (string) ($v['assignee_id'] ?? '') !== (string) ($issueModel->assignee_id ?? '')) {
            $this->assignUseCase->execute(new AssignIssueInput(
                issueId: $id,
                assigneeId: $v['assignee_id'] !== null ? (string) $v['assignee_id'] : null,
                actorUserId: $actorId,
            ));
        }

        $issueModel->update([
            'title' => $v['title'],
            'description' => $v['description'] ?? null,
            'issue_type_id' => $v['issue_type_id'],
            'priority_id' => $v['priority_id'],
            'sprint_id' => $v['sprint_id'] ?? null,
            'original_estimate_seconds' => $v['original_estimate_seconds'] ?? null,
            'remaining_estimate_seconds' => array_key_exists('remaining_estimate_seconds', $v) ? $v['remaining_estimate_seconds'] : $issueModel->remaining_estimate_seconds,
            'start_date' => array_key_exists('start_date', $v) ? $v['start_date'] : $issueModel->start_date,
            'due_date' => array_key_exists('due_date', $v) ? $v['due_date'] : $issueModel->due_date,
            'parent_id' => array_key_exists('parent_id', $v) ? $v['parent_id'] : $issueModel->parent_id,
        ]);

        // Refresh model with relations
        $issue = IssueModel::with(['assignee', 'reporter', 'status'])->findOrFail($id);

        return response()->json(['data' => new IssueResource($issue)]);
    }

    public function destroy(DeleteIssueHttpRequest $request, string $id): JsonResponse
    {
        $this->deleteUseCase->execute($id);

        return response()->json(null, 204);
    }
}
