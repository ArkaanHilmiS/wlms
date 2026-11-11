<?php

declare(strict_types=1);

namespace App\Modules\Workload\Infrastructure\Providers;

use App\Modules\Workload\Domain\Config\WorkspaceSettingsInterface;
use App\Modules\Workload\Domain\Events\IssueAssigned;
use App\Modules\Workload\Domain\Events\IssueTransitioned;
use App\Modules\Workload\Domain\Events\WorkspaceCreated;
use App\Modules\Workload\Domain\Repositories\IssueRepositoryInterface;
use App\Modules\Workload\Domain\Repositories\ProjectRepositoryInterface;
use App\Modules\Workload\Domain\Repositories\SprintRepositoryInterface;
use App\Modules\Workload\Domain\Repositories\StatusRepositoryInterface;
use App\Modules\Workload\Domain\Repositories\WorkflowRepositoryInterface;
use App\Modules\Workload\Domain\Repositories\WorkspaceRepositoryInterface;
use App\Modules\Workload\Infrastructure\Auth\Policies\WorkspacePolicy;
use App\Modules\Workload\Infrastructure\Config\WorkspaceSettings;
use App\Modules\Workload\Infrastructure\Listeners\AssignWorkspaceCreatorAsOwnerListener;
use App\Modules\Workload\Infrastructure\Listeners\NotifyAssigneeMailListener;
use App\Modules\Workload\Infrastructure\Listeners\WriteIssueAuditLogListener;
use App\Modules\Workload\Infrastructure\Listeners\WriteWorkspaceAuditLogListener;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\WorkspaceModel;
use App\Modules\Workload\Infrastructure\Persistence\Repositories\EloquentIssueRepository;
use App\Modules\Workload\Infrastructure\Persistence\Repositories\EloquentProjectRepository;
use App\Modules\Workload\Infrastructure\Persistence\Repositories\EloquentSprintRepository;
use App\Modules\Workload\Infrastructure\Persistence\Repositories\EloquentStatusRepository;
use App\Modules\Workload\Infrastructure\Persistence\Repositories\EloquentWorkflowRepository;
use App\Modules\Workload\Infrastructure\Persistence\Repositories\EloquentWorkspaceRepository;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class WorkloadServiceProvider extends ServiceProvider
{
    /**
     * Register any module services.
     */
    public function register(): void
    {
        // Bind Repository
        $this->app->bind(WorkspaceRepositoryInterface::class, EloquentWorkspaceRepository::class);
        $this->app->bind(ProjectRepositoryInterface::class, EloquentProjectRepository::class);
        $this->app->bind(SprintRepositoryInterface::class, EloquentSprintRepository::class);
        $this->app->bind(IssueRepositoryInterface::class, EloquentIssueRepository::class);
        $this->app->bind(WorkflowRepositoryInterface::class, EloquentWorkflowRepository::class);
        $this->app->bind(StatusRepositoryInterface::class, EloquentStatusRepository::class);
        $this->app->bind(WorkspaceSettingsInterface::class, WorkspaceSettings::class);
    }

    public function boot(): void
    {
        Gate::policy(
            WorkspaceModel::class,
            WorkspacePolicy::class
        );

        // Workspace Events
        Event::listen(WorkspaceCreated::class, WriteWorkspaceAuditLogListener::class);
        Event::listen(WorkspaceCreated::class, AssignWorkspaceCreatorAsOwnerListener::class);

        // Issue Events
        Event::listen(IssueTransitioned::class, WriteIssueAuditLogListener::class);
        Event::listen(IssueAssigned::class, WriteIssueAuditLogListener::class);
        Event::listen(IssueAssigned::class, NotifyAssigneeMailListener::class);
        // Event::listen(\App\Modules\Workload\Domain\Events\IssueAssigned::class, \App\Modules\Workload\Infrastructure\Listeners\WriteInAppNotificationListener::class);
    }
}
