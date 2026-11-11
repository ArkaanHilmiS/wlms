<?php

declare(strict_types=1);

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Notification\Domain\Events\NewNotification;
use App\Modules\Notification\Infrastructure\Persistence\Eloquent\Models\NotificationModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->author = UserModel::factory()->create(['name' => 'Bob Builder', 'email' => 'bob@wlms.com']);
    $this->colleague = UserModel::factory()->create(['name' => 'Alice Wonder', 'email' => 'alice@wlms.com']);

    $this->workspaceId = (string) Str::uuid();
    DB::table('workspaces')->insert([
        'id' => $this->workspaceId,
        'owner_group_id' => (string) Str::uuid(),
        'name' => 'Mention WS',
        'status' => 'ACTIVE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    DB::table('workspace_members')->insert([
        ['workspace_id' => $this->workspaceId, 'user_id' => $this->author->id, 'role' => 'admin', 'created_at' => now(), 'updated_at' => now()],
        ['workspace_id' => $this->workspaceId, 'user_id' => $this->colleague->id, 'role' => 'member', 'created_at' => now(), 'updated_at' => now()],
    ]);

    $this->projectId = (string) Str::uuid();
    DB::table('projects')->insert([
        'id' => $this->projectId,
        'workspace_id' => $this->workspaceId,
        'key' => 'MEN',
        'name' => 'Mention Project',
        'status' => 'ACTIVE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->statusId = (string) Str::uuid();
    DB::table('statuses')->insert([
        'id' => $this->statusId,
        'name' => 'To Do',
        'slug' => 'todo-men',
        'category' => 'TODO',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->issueTypeId = (string) Str::uuid();
    DB::table('issue_types')->insert([
        'id' => $this->issueTypeId,
        'name' => 'Task',
        'slug' => 'task-men',
        'icon' => 'check',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->priorityId = (string) Str::uuid();
    DB::table('priorities')->insert([
        'id' => $this->priorityId,
        'name' => 'Medium',
        'slug' => 'med-men',
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
        'reporter_id' => $this->author->id,
        'number' => 1,
        'title' => 'Issue for mentions',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
});

test('submitting comment with @mention triggers comment.mentioned notification to colleague', function () {
    Event::fake([NewNotification::class]);

    $response = $this->actingAs($this->author)->postJson("/api/issues/{$this->issueId}/comments", [
        'body' => 'Hello @Alice, please review this task!',
    ]);

    $response->assertStatus(201);

    // Colleague received notification
    $notification = NotificationModel::where('user_id', $this->colleague->id)
        ->where('type', 'comment.mentioned')
        ->first();

    expect($notification)->not->toBeNull()
        ->and($notification->data['author_id'])->toBe((string) $this->author->id)
        ->and($notification->data['author_name'])->toBe('Bob Builder')
        ->and($notification->data['issue_id'])->toBe($this->issueId);

    Event::assertDispatched(NewNotification::class, function ($event) {
        return (int) $event->userId === (int) $this->colleague->id
            && $event->type === 'comment.mentioned';
    });
});

test('self @mention does not notify author', function () {
    Event::fake([NewNotification::class]);

    $response = $this->actingAs($this->author)->postJson("/api/issues/{$this->issueId}/comments", [
        'body' => 'Note to self: @Bob check database migration.',
    ]);

    $response->assertStatus(201);

    $notification = NotificationModel::where('user_id', $this->author->id)
        ->where('type', 'comment.mentioned')
        ->first();

    expect($notification)->toBeNull();
});

