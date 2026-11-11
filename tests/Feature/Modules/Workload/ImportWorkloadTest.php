<?php

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\RoleModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserRoleModel;
use App\Modules\Workload\Application\Jobs\ImportIssuesJob;
use App\Modules\Workload\Application\Jobs\ImportProjectsJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('local');
    $this->user = UserModel::factory()->create();

    // Create Superadmin role to bypass 'manage-rbac' gate
    $this->adminRole = RoleModel::firstOrCreate(
        ['name' => 'Superadmin'],
        ['id' => Str::uuid(), 'scope' => 'GLOBAL']
    );
});

test('normal user cannot access import-workload page', function () {
    $response = $this->actingAs($this->user)->get('/admin/import-workload');
    $response->assertStatus(403);
});

test('normal user cannot submit import-workload form', function () {
    $response = $this->actingAs($this->user)->post('/admin/import-workload', []);
    $response->assertStatus(403);
});

test('superadmin can access import-workload page', function () {
    UserRoleModel::create([
        'id' => Str::uuid(),
        'user_id' => $this->user->id,
        'role_id' => $this->adminRole->id,
    ]);

    $response = $this->actingAs($this->user)->get('/admin/import-workload');
    $response->assertStatus(200);
});

test('validates required fields', function () {
    UserRoleModel::create([
        'id' => Str::uuid(),
        'user_id' => $this->user->id,
        'role_id' => $this->adminRole->id,
    ]);

    $response = $this->actingAs($this->user)->post('/admin/import-workload', []);
    $response->assertSessionHasErrors(['type', 'file']);
});

test('validates file type', function () {
    UserRoleModel::create([
        'id' => Str::uuid(),
        'user_id' => $this->user->id,
        'role_id' => $this->adminRole->id,
    ]);

    $file = UploadedFile::fake()->create('image.png', 100, 'image/png');

    $response = $this->actingAs($this->user)->post('/admin/import-workload', [
        'type' => 'issues',
        'file' => $file,
    ]);

    $response->assertSessionHasErrors(['file']);
});

test('validates workspace_id is required for projects', function () {
    UserRoleModel::create([
        'id' => Str::uuid(),
        'user_id' => $this->user->id,
        'role_id' => $this->adminRole->id,
    ]);

    $file = UploadedFile::fake()->create('projects.csv', 100, 'text/csv');

    $response = $this->actingAs($this->user)->post('/admin/import-workload', [
        'type' => 'projects',
        'file' => $file,
    ]);

    $response->assertSessionHasErrors(['workspace_id']);
});

test('dispatches ImportProjectsJob for projects', function () {
    Bus::fake();

    UserRoleModel::create([
        'id' => Str::uuid(),
        'user_id' => $this->user->id,
        'role_id' => $this->adminRole->id,
    ]);

    $file = UploadedFile::fake()->create('projects.csv', 100, 'text/csv');
    $workspaceId = Str::uuid()->toString();

    $response = $this->actingAs($this->user)->post('/admin/import-workload', [
        'type' => 'projects',
        'file' => $file,
        'workspace_id' => $workspaceId,
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    Bus::assertDispatched(ImportProjectsJob::class, function ($job) use ($workspaceId) {
        return (string) $job->workspaceId === (string) $workspaceId;
    });
});

test('dispatches ImportIssuesJob for issues', function () {
    Bus::fake();

    UserRoleModel::create([
        'id' => Str::uuid(),
        'user_id' => $this->user->id,
        'role_id' => $this->adminRole->id,
    ]);

    $file = UploadedFile::fake()->create('issues.xlsx', 100, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    $response = $this->actingAs($this->user)->post('/admin/import-workload', [
        'type' => 'issues',
        'file' => $file,
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    $userId = $this->user->id;
    Bus::assertDispatched(ImportIssuesJob::class, function ($job) use ($userId) {
        return (string) $job->reporterId === (string) $userId;
    });
});

test('ImportIssuesUseCase prioritizes exact PIC match over partial substring match and ImportProjectsJob deletes file after import', function () {
    $karina = UserModel::factory()->create(['name' => 'Karina Putri']);
    $ari = UserModel::factory()->create(['name' => 'Ari']);

    $workspaceId = Str::uuid()->toString();
    DB::table('workspaces')->insert([
        'id' => $workspaceId,
        'owner_group_id' => Str::uuid()->toString(),
        'name' => 'Import WS',
        'status' => 'ACTIVE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $projectId = Str::uuid()->toString();
    DB::table('projects')->insert([
        'id' => $projectId,
        'workspace_id' => $workspaceId,
        'key' => 'IMP',
        'name' => 'Import Project',
        'status' => 'ACTIVE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('issue_types')->insert([
        'id' => Str::uuid()->toString(),
        'name' => 'Task',
        'slug' => 'task-imp',
        'icon' => 'check',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('priorities')->insert([
        'id' => Str::uuid()->toString(),
        'name' => 'Medium',
        'slug' => 'med-imp',
        'level' => 2,
        'color' => '#fbbf24',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('statuses')->insert([
        'id' => Str::uuid()->toString(),
        'name' => 'To Do',
        'slug' => 'todo-imp',
        'category' => 'TODO',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $useCase = app(\App\Modules\Workload\Application\UseCases\ImportIssuesUseCase::class);
    $useCase->execute(collect([
        [
            'project' => 'Import Project',
            'task' => 'Task for Ari',
            'pic' => 'Ari',
        ],
    ]), (string) $this->user->id);

    $imported = DB::table('issues')->where('title', 'Task for Ari')->first();
    expect($imported)->not->toBeNull()
        ->and((int) $imported->assignee_id)->toBe((int) $ari->id)
        ->and((int) $imported->assignee_id)->not->toBe((int) $karina->id);

    \Illuminate\Support\Facades\Storage::fake('local');
    \Illuminate\Support\Facades\Storage::disk('local')->put('imports/temp-projects.csv', "Project Name,Project Status\nClean Project,ACTIVE\n");
    expect(\Illuminate\Support\Facades\Storage::disk('local')->exists('imports/temp-projects.csv'))->toBeTrue();

    $job = new ImportProjectsJob('imports/temp-projects.csv', $workspaceId);
    $job->handle(app(\App\Modules\Workload\Application\UseCases\ImportProjectsUseCase::class));

    expect(\Illuminate\Support\Facades\Storage::disk('local')->exists('imports/temp-projects.csv'))->toBeFalse();
});

test('tracks import observability in import_logs table with counts and errors', function () {
    Bus::fake();

    UserRoleModel::create([
        'id' => Str::uuid(),
        'user_id' => $this->user->id,
        'role_id' => $this->adminRole->id,
    ]);

    $file = UploadedFile::fake()->create('projects_batch.xlsx', 10);
    $workspaceId = Str::uuid()->toString();
    DB::table('workspaces')->insert([
        'id' => $workspaceId,
        'owner_group_id' => Str::uuid()->toString(),
        'name' => 'Obs WS',
        'status' => 'ACTIVE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->actingAs($this->user)->post('/admin/import-workload', [
        'type' => 'projects',
        'workspace_id' => $workspaceId,
        'file' => $file,
    ]);

    $response->assertSessionHas('success');

    $log = DB::table('import_logs')->where('filename', 'projects_batch.xlsx')->first();
    expect($log)->not->toBeNull()
        ->and($log->type)->toBe('projects')
        ->and($log->status)->toBe('PENDING');

    // Simulate Job execution with valid and invalid rows
    $useCase = app(\App\Modules\Workload\Application\UseCases\ImportProjectsUseCase::class);
    $result = $useCase->execute(collect([
        ['project_name' => 'Project Alpha', 'project_status' => 'ACTIVE'],
        ['project_name' => '', 'project_status' => 'ACTIVE'], // skipped
    ]), $workspaceId);

    expect($result['total_rows'])->toBe(2)
        ->and($result['success_count'])->toBe(1)
        ->and($result['skipped_count'])->toBe(1)
        ->and($result['errors'])->toHaveCount(1);

    // Verify index returns import logs
    $indexResponse = $this->actingAs($this->user)->get('/admin/import-workload');
    $indexResponse->assertStatus(200);
    $indexResponse->assertInertia(fn ($page) => $page->has('importLogs'));
});


