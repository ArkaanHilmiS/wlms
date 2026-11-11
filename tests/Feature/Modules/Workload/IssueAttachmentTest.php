<?php

declare(strict_types=1);

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\RoleModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserRoleModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('local');

    $this->user = UserModel::factory()->create();

    $this->workspaceId = (string) Str::uuid();
    DB::table('workspaces')->insert([
        'id' => $this->workspaceId,
        'owner_group_id' => (string) Str::uuid(),
        'name' => 'Attachment WS',
        'status' => 'ACTIVE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // Add user as workspace member
    DB::table('workspace_members')->insert([
        'workspace_id' => $this->workspaceId,
        'user_id' => $this->user->id,
        'role' => 'admin',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->projectId = (string) Str::uuid();
    DB::table('projects')->insert([
        'id' => $this->projectId,
        'workspace_id' => $this->workspaceId,
        'key' => 'ATT',
        'name' => 'Attachment Project',
        'status' => 'ACTIVE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->statusId = (string) Str::uuid();
    DB::table('statuses')->insert([
        'id' => $this->statusId,
        'name' => 'To Do',
        'slug' => 'todo-att',
        'category' => 'TODO',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->issueTypeId = (string) Str::uuid();
    DB::table('issue_types')->insert([
        'id' => $this->issueTypeId,
        'name' => 'Task',
        'slug' => 'task-att',
        'icon' => 'check',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->priorityId = (string) Str::uuid();
    DB::table('priorities')->insert([
        'id' => $this->priorityId,
        'name' => 'Medium',
        'slug' => 'med-att',
        'level' => 2,
        'color' => '#fbbf24',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->issueId = (string) Str::uuid();
    DB::table('issues')->insert([
        'id' => $this->issueId,
        'project_id' => $this->projectId,
        'status_id' => $this->statusId,
        'issue_type_id' => $this->issueTypeId,
        'priority_id' => $this->priorityId,
        'reporter_id' => $this->user->id,
        'number' => 1,
        'title' => 'Issue with attachments',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
});

test('authorized user can upload attachment up to 5MB', function () {
    $file = UploadedFile::fake()->create('document.pdf', 2048, 'application/pdf'); // 2MB

    $response = $this->actingAs($this->user)->postJson("/api/issues/{$this->issueId}/attachments", [
        'file' => $file,
    ]);

    $response->assertStatus(201);
    $response->assertJsonPath('data.filename', 'document.pdf');

    $attachmentId = $response->json('data.id');
    $record = DB::table('issue_attachments')->where('id', $attachmentId)->first();
    expect($record)->not->toBeNull()
        ->and((int) $record->uploader_id)->toBe((int) $this->user->id)
        ->and(Storage::disk('local')->exists($record->file_path))->toBeTrue();
});

test('rejects upload exceeding 5MB limit', function () {
    $largeFile = UploadedFile::fake()->create('huge_video.mp4', 6000, 'video/mp4'); // 6MB > 5120KB

    $response = $this->actingAs($this->user)->postJson("/api/issues/{$this->issueId}/attachments", [
        'file' => $largeFile,
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['file']);
});

test('anti-idor prevents unauthorized user from listing or downloading attachments', function () {
    $stranger = UserModel::factory()->create();

    // Upload attachment first
    $file = UploadedFile::fake()->create('secret.png', 500, 'image/png');
    $uploadRes = $this->actingAs($this->user)->postJson("/api/issues/{$this->issueId}/attachments", [
        'file' => $file,
    ]);
    $attachmentId = $uploadRes->json('data.id');

    // Stranger cannot view list
    $listRes = $this->actingAs($stranger)->getJson("/api/issues/{$this->issueId}/attachments");
    $listRes->assertStatus(403);

    // Stranger cannot download
    $downRes = $this->actingAs($stranger)->get("/api/attachments/{$attachmentId}/download");
    $downRes->assertStatus(403);

    // Authorized user can download
    $authDownRes = $this->actingAs($this->user)->get("/api/attachments/{$attachmentId}/download");
    $authDownRes->assertStatus(200);
    $authDownRes->assertHeader('content-disposition');
});

test('uploader can delete attachment from db and disk', function () {
    $file = UploadedFile::fake()->create('to_delete.txt', 10, 'text/plain');
    $uploadRes = $this->actingAs($this->user)->postJson("/api/issues/{$this->issueId}/attachments", [
        'file' => $file,
    ]);
    $attachmentId = $uploadRes->json('data.id');

    $record = DB::table('issue_attachments')->where('id', $attachmentId)->first();
    expect(Storage::disk('local')->exists($record->file_path))->toBeTrue();

    // Delete
    $delRes = $this->actingAs($this->user)->deleteJson("/api/attachments/{$attachmentId}");
    $delRes->assertStatus(200);

    expect(DB::table('issue_attachments')->where('id', $attachmentId)->exists())->toBeFalse()
        ->and(Storage::disk('local')->exists($record->file_path))->toBeFalse();
});
