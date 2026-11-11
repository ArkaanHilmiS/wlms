<?php

use App\Modules\Identity\Presentation\Http\Controllers\Settings\ProfileController;
use App\Modules\Identity\Presentation\Http\Controllers\Settings\SecurityController;
use App\Modules\KnowledgeBase\Presentation\Http\Controllers\Admin\AdminDocPageController;
use Illuminate\Auth\Middleware\RequirePassword;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/security', [SecurityController::class, 'edit'])
        ->middleware(RequirePassword::class)
        ->name('security.edit');

    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::inertia('settings/appearance', 'settings/appearance')->name('appearance.edit');

    // RBAC Frontend UI (Khusus Superadmin)
    Route::get('settings/rbac', fn () => inertia('settings/rbac'))->middleware('can:manage-rbac')->name('rbac.index');

    Route::get('settings/organization', fn () => inertia('settings/organization'))->middleware('can:manage-rbac')->name('organization.index');
    Route::get('settings/workflows', fn () => inertia('settings/workflows'))->middleware('can:manage-rbac')->name('workflows.index');

    // Knowledge Base / Documentation CMS (Khusus Superadmin)
    Route::get('settings/docs', [AdminDocPageController::class, 'index'])->middleware('can:manage-rbac')->name('admin.docs.index');
    Route::post('settings/docs', [AdminDocPageController::class, 'store'])->middleware('can:manage-rbac')->name('admin.docs.store');
    Route::get('settings/docs/{id}/edit', [AdminDocPageController::class, 'edit'])->middleware('can:manage-rbac')->name('admin.docs.edit');
    Route::put('settings/docs/{id}', [AdminDocPageController::class, 'update'])->middleware('can:manage-rbac')->name('admin.docs.update');
    Route::delete('settings/docs/{id}', [AdminDocPageController::class, 'destroy'])->middleware('can:manage-rbac')->name('admin.docs.destroy');

    Route::post('settings/doc-categories', [AdminDocPageController::class, 'storeCategory'])->middleware('can:manage-rbac')->name('admin.doc-categories.store');
    Route::delete('settings/doc-categories/{id}', [AdminDocPageController::class, 'destroyCategory'])->middleware('can:manage-rbac')->name('admin.doc-categories.destroy');
});

Route::get('.well-known/passkey-endpoints', function () {
    return response()->json([
        'enroll' => route('security.edit'),
        'manage' => route('security.edit'),
    ]);
})->name('well-known.passkeys');
