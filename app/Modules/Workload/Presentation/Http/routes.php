<?php

use App\Modules\Workload\Presentation\Http\Controllers\ArchiveProjectController;
use App\Modules\Workload\Presentation\Http\Controllers\ArchiveWorkspaceController;
use App\Modules\Workload\Presentation\Http\Controllers\AssignIssueController;
use App\Modules\Workload\Presentation\Http\Controllers\AttachmentController;
use App\Modules\Workload\Presentation\Http\Controllers\BulkUpdateIssuesController;
use App\Modules\Workload\Presentation\Http\Controllers\CompleteSprintController;
use App\Modules\Workload\Presentation\Http\Controllers\CreateIssueController;
use App\Modules\Workload\Presentation\Http\Controllers\CreateProjectController;
use App\Modules\Workload\Presentation\Http\Controllers\CreateSprintController;
use App\Modules\Workload\Presentation\Http\Controllers\CreateWorkspaceController;
use App\Modules\Workload\Presentation\Http\Controllers\ExportIssuesController;
use App\Modules\Workload\Presentation\Http\Controllers\ExportTimesheetController;
use App\Modules\Workload\Presentation\Http\Controllers\GetBacklogController;
use App\Modules\Workload\Presentation\Http\Controllers\GetBoardController;
use App\Modules\Workload\Presentation\Http\Controllers\GetIssueWorklogsController;
use App\Modules\Workload\Presentation\Http\Controllers\GetProjectAnalyticsController;
use App\Modules\Workload\Presentation\Http\Controllers\GetProjectLookupsController;
use App\Modules\Workload\Presentation\Http\Controllers\GetProjectsController;
use App\Modules\Workload\Presentation\Http\Controllers\GetProjectSprintsController;
use App\Modules\Workload\Presentation\Http\Controllers\GetSprintWorkloadController;
use App\Modules\Workload\Presentation\Http\Controllers\GetValidTransitionsController;
use App\Modules\Workload\Presentation\Http\Controllers\GetWorkspaceAnalyticsController;
use App\Modules\Workload\Presentation\Http\Controllers\GetWorkspaceIssuesController;
use App\Modules\Workload\Presentation\Http\Controllers\GetWorkspacesController;
use App\Modules\Workload\Presentation\Http\Controllers\IssueController;
use App\Modules\Workload\Presentation\Http\Controllers\IssueLinkController;
use App\Modules\Workload\Presentation\Http\Controllers\LogWorkController;
use App\Modules\Workload\Presentation\Http\Controllers\ProjectActivityController;
use App\Modules\Workload\Presentation\Http\Controllers\StartSprintController;
use App\Modules\Workload\Presentation\Http\Controllers\StatusController;
use App\Modules\Workload\Presentation\Http\Controllers\TransitionIssueController;
use App\Modules\Workload\Presentation\Http\Controllers\UpdateProjectController;
use App\Modules\Workload\Presentation\Http\Controllers\UpdateSprintController;
use App\Modules\Workload\Presentation\Http\Controllers\UpdateWorkspaceController;
use App\Modules\Workload\Presentation\Http\Controllers\WorkflowController;
use App\Modules\Workload\Presentation\Http\Controllers\WorkflowTransitionController;
use App\Modules\Workload\Presentation\Http\Controllers\WorkloadSettingsController;
use App\Modules\Workload\Presentation\Http\Controllers\WorkspaceMemberController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->prefix('settings')->group(function () {
    Route::get('/workload', [WorkloadSettingsController::class, 'index']);
    Route::put('/workload', [WorkloadSettingsController::class, 'update']);
});

Route::middleware(['auth:sanctum'])->prefix('workspaces')->group(function () {
    Route::post('/', CreateWorkspaceController::class);
    Route::get('/', GetWorkspacesController::class);
    Route::put('/{id}', UpdateWorkspaceController::class);
    Route::delete('/{id}', ArchiveWorkspaceController::class);
    Route::get('/{workspaceId}/projects', GetProjectsController::class);
    Route::get('/{workspaceId}/issues', GetWorkspaceIssuesController::class);
    Route::get('/{workspaceId}/issues/export', [ExportIssuesController::class, 'exportWorkspace']);
    Route::get('/{workspaceId}/timesheets/export', [ExportTimesheetController::class, 'exportWorkspace']);
    Route::get('/{id}/analytics', GetWorkspaceAnalyticsController::class);
    Route::get('/{id}/settings', [WorkloadSettingsController::class, 'showWorkspace']);
    Route::put('/{id}/settings', [WorkloadSettingsController::class, 'updateWorkspace']);

    // Workspace Members
    Route::get('/{workspace_id}/members', [WorkspaceMemberController::class, 'index']);
    Route::post('/{workspace_id}/members', [WorkspaceMemberController::class, 'store']);
    Route::put('/{workspace_id}/members/{user_id}', [WorkspaceMemberController::class, 'update']);
    Route::delete('/{workspace_id}/members/{user_id}', [WorkspaceMemberController::class, 'destroy']);
});

Route::middleware(['auth:sanctum'])->prefix('projects')->group(function () {
    Route::post('/', CreateProjectController::class);
    Route::put('/{id}', UpdateProjectController::class);
    Route::delete('/{id}', ArchiveProjectController::class);
    Route::get('/{id}/board', GetBoardController::class);
    Route::get('/{id}/backlog', GetBacklogController::class);
    Route::get('/{project_id}/issues', [IssueController::class, 'index']);
    Route::get('/{projectId}/issues/export', [ExportIssuesController::class, 'exportProject']);
    Route::get('/{projectId}/timesheets/export', [ExportTimesheetController::class, 'exportProject']);
    Route::get('/{projectId}/issues/similar', [IssueLinkController::class, 'similar']);
    Route::post('/{project_id}/issues', [IssueController::class, 'store']);
    Route::get('/{project_id}/activity', [ProjectActivityController::class, 'index']);
    Route::get('/{id}/sprints', GetProjectSprintsController::class);
    Route::get('/{id}/lookups', GetProjectLookupsController::class);
    Route::get('/{id}/analytics', GetProjectAnalyticsController::class);
});

Route::middleware(['auth:sanctum'])->prefix('sprints')->group(function () {
    Route::post('/', CreateSprintController::class);
    Route::put('/{id}', UpdateSprintController::class);
    Route::put('/{id}/start', StartSprintController::class);
    Route::put('/{id}/complete', CompleteSprintController::class);
    Route::get('/{sprint_id}/workload', GetSprintWorkloadController::class);
});

Route::middleware(['auth:sanctum'])->prefix('issues')->group(function () {
    Route::post('/bulk-update', BulkUpdateIssuesController::class);
    Route::get('/{id}', [IssueController::class, 'show']);
    Route::put('/{id}', [IssueController::class, 'update']);
    Route::delete('/{id}', [IssueController::class, 'destroy']);
    Route::post('/', CreateIssueController::class);
    Route::post('/{id}/assign', AssignIssueController::class);
    Route::post('/{id}/transition', TransitionIssueController::class);
    Route::get('/{id}/transitions', GetValidTransitionsController::class);
    Route::post('/{id}/worklogs', LogWorkController::class);
    Route::get('/{id}/worklogs', GetIssueWorklogsController::class);
    Route::get('/{id}/attachments', [AttachmentController::class, 'index']);
    Route::post('/{id}/attachments', [AttachmentController::class, 'store']);
    Route::get('/{id}/links', [IssueLinkController::class, 'index']);
    Route::post('/{id}/links', [IssueLinkController::class, 'store']);
    Route::delete('/{id}/links/{linkId}', [IssueLinkController::class, 'destroy']);
});

Route::middleware(['auth:sanctum'])->prefix('attachments')->group(function () {
    Route::get('/{id}/download', [AttachmentController::class, 'download']);
    Route::delete('/{id}', [AttachmentController::class, 'destroy']);
});

Route::middleware(['auth:sanctum'])->prefix('statuses')->group(function () {
    Route::get('/', [StatusController::class, 'index']);
    Route::post('/', [StatusController::class, 'store']);
    Route::put('/{id}', [StatusController::class, 'update']);
    Route::delete('/{id}', [StatusController::class, 'destroy']);
});

Route::middleware(['auth:sanctum'])->prefix('workflows')->group(function () {
    Route::get('/', [WorkflowController::class, 'index']);
    Route::post('/', [WorkflowController::class, 'store']);
    Route::get('/{id}', [WorkflowController::class, 'show']);
    Route::put('/{id}', [WorkflowController::class, 'update']);
    Route::delete('/{id}', [WorkflowController::class, 'destroy']);

    Route::post('/{workflow_id}/transitions', [WorkflowTransitionController::class, 'store']);
    Route::delete('/{workflow_id}/transitions/{transition_id}', [WorkflowTransitionController::class, 'destroy']);
});
