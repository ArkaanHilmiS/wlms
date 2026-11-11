<?php

use App\Shared\Presentation\Http\Controllers\LocaleController;
use App\Modules\Identity\Presentation\Http\Controllers\OrgLevelController;
use App\Modules\Identity\Presentation\Http\Controllers\OrgUnitController;
use App\Modules\Identity\Presentation\Http\Controllers\RBAC\MenuController;
use App\Modules\Identity\Presentation\Http\Controllers\RBAC\PermissionController;
use App\Modules\Identity\Presentation\Http\Controllers\RBAC\RoleController;
use App\Modules\Identity\Presentation\Http\Controllers\RBAC\UserController;
use App\Modules\Identity\Presentation\Http\Controllers\RBAC\UserRoleController;
use App\Modules\KnowledgeBase\Presentation\Http\Controllers\Admin\AdminDocPageController;
use App\Modules\KnowledgeBase\Presentation\Http\Controllers\DocumentationController;
use App\Modules\Workload\Presentation\Http\Controllers\DashboardPageController;
use App\Modules\Workload\Presentation\Http\Controllers\GlobalIssuesPageController;
use App\Modules\Workload\Presentation\Http\Controllers\ImportWorkloadController;
use App\Modules\Workload\Presentation\Http\Controllers\ProjectIndexPageController;
use App\Modules\Workload\Presentation\Http\Controllers\ShowProjectPageController;
use App\Modules\Workload\Presentation\Http\Controllers\WorkspaceIssuesPageController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', DashboardPageController::class)->name('dashboard');
    Route::inertia('/workspaces', 'Workspaces/Index')->name('workspaces.index');
    Route::get('/workspaces/{workspace_id}/issues', WorkspaceIssuesPageController::class)->name('workspaces.issues');

    // Placeholder routes untuk fitur yang belum di-build UI-nya (DRY Principle)
    Route::get('/projects', ProjectIndexPageController::class)->name('projects.index');
    Route::get('/projects/{project}', ShowProjectPageController::class)->name('projects.show');
    Route::get('/issues', GlobalIssuesPageController::class)->name('issues.index');
    Route::get('/users', fn () => redirect('/settings/rbac'))->name('users.index');

    // Modul RBAC (Khusus Superadmin)
    Route::middleware('can:manage-rbac')->prefix('api/rbac')->group(function () {
        Route::get('/roles', [RoleController::class, 'index']);
        Route::post('/roles', [RoleController::class, 'store']);
        Route::get('/roles/{id}', [RoleController::class, 'show']);
        Route::put('/roles/{id}', [RoleController::class, 'update']);
        Route::delete('/roles/{id}', [RoleController::class, 'destroy']);
        Route::match(['put', 'post'], '/roles/{id}/permissions', [RoleController::class, 'syncPermissions']);
        Route::match(['put', 'post'], '/roles/{id}/menus', [RoleController::class, 'syncMenus']);

        Route::get('/permissions', [PermissionController::class, 'index']);
        Route::get('/menus', [MenuController::class, 'index']);

        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::post('/users/bulk', [UserController::class, 'bulkStore']);
        Route::put('/users/{id}', [UserController::class, 'update']);

        Route::post('/user-roles/assign', [UserRoleController::class, 'assign']);
        Route::post('/user-roles/revoke', [UserRoleController::class, 'revoke']);
    });
    // Modul Organisasi (Struktur Level & Unit)
    Route::middleware('can:manage-rbac')->group(function () {
        Route::prefix('api/org-levels')->group(function () {
            Route::get('/', [OrgLevelController::class, 'index']);
            Route::post('/', [OrgLevelController::class, 'store']);
            Route::put('/{id}', [OrgLevelController::class, 'update']);
            Route::delete('/{id}', [OrgLevelController::class, 'destroy']);
        });

        Route::prefix('api/org-units')->group(function () {
            Route::get('/', [OrgUnitController::class, 'index']);
            Route::post('/', [OrgUnitController::class, 'store']);
            Route::put('/{id}', [OrgUnitController::class, 'update']);
            Route::delete('/{id}', [OrgUnitController::class, 'destroy']);
        });
    });
});

require __DIR__.'/settings.php';

Route::post('/locale', [LocaleController::class, 'update'])->name('locale.update');

Route::middleware(['auth'])->group(function () {
    Route::get('/docs/{slug?}', [DocumentationController::class, 'show'])->name('docs.show');

    Route::middleware('can:manage-rbac')->group(function () {
        Route::redirect('/admin/docs', '/settings/docs');

        Route::get('/admin/import-workload', [ImportWorkloadController::class, 'index'])->name('admin.import-workload.index');
        Route::post('/admin/import-workload', [ImportWorkloadController::class, 'store'])->name('admin.import-workload.store');
    });
});
