<?php

declare(strict_types=1);

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Workload\Presentation\Http\Controllers\WorkspaceMemberController;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function candidatesFor(UserModel $actor, string $workspaceId): array
{
    $request = Request::create("/api/workspaces/{$workspaceId}/member-candidates");
    $request->setUserResolver(fn () => $actor);
    $this_ = app(WorkspaceMemberController::class);

    return $this_->candidates($request, $workspaceId)->getData(true)['data'];
}

test('member candidates include active non-members even when workspace has 0 members', function () {
    $unitId = (string) Str::uuid();
    $wsId = (string) Str::uuid();
    DB::table('workspaces')->insert([
        'id' => $wsId, 'name' => 'Gradakan', 'owner_group_id' => $unitId,
        'status' => 'ACTIVE', 'created_at' => now(), 'updated_at' => now(),
    ]);

    $admin = UserModel::factory()->create(['org_unit_id' => $unitId, 'email' => 'superadmin@wlms.com']);
    $active = UserModel::factory()->create(['org_unit_id' => $unitId]);
    $inactive = UserModel::factory()->create(['org_unit_id' => $unitId, 'status' => 'INACTIVE']);

    $ids = collect(candidatesFor($admin, $wsId))->pluck('id');

    expect($ids)->toContain($active->id)->not->toContain($inactive->id);
});

test('member candidates exclude existing members', function () {
    $unitId = (string) Str::uuid();
    $wsId = (string) Str::uuid();
    DB::table('workspaces')->insert([
        'id' => $wsId, 'name' => 'Gradakan', 'owner_group_id' => $unitId,
        'status' => 'ACTIVE', 'created_at' => now(), 'updated_at' => now(),
    ]);

    $admin = UserModel::factory()->create(['org_unit_id' => $unitId, 'email' => 'superadmin@wlms.com']);
    $member = UserModel::factory()->create(['org_unit_id' => $unitId]);
    DB::table('workspace_members')->insert([
        'workspace_id' => $wsId, 'user_id' => $member->id, 'role' => 'member',
        'daily_capacity_hours' => 8, 'created_at' => now(), 'updated_at' => now(),
    ]);

    expect(collect(candidatesFor($admin, $wsId))->pluck('id'))->not->toContain($member->id);
});

test('member candidates are forbidden for users who cannot update the workspace', function () {
    $wsId = (string) Str::uuid();
    DB::table('workspaces')->insert([
        'id' => $wsId, 'name' => 'Gradakan', 'owner_group_id' => (string) Str::uuid(),
        'status' => 'ACTIVE', 'created_at' => now(), 'updated_at' => now(),
    ]);
    $outsider = UserModel::factory()->create(['org_unit_id' => (string) Str::uuid()]);

    expect(fn () => candidatesFor($outsider, $wsId))->toThrow(HttpException::class);
});
