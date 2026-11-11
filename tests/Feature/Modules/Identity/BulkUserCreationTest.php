<?php

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\RoleModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->orgLevelId = Str::uuid()->toString();
    DB::table('org_levels')->insert([
        'id' => $this->orgLevelId,
        'slug' => 'level-1',
        'name' => 'Level 1',
        'depth' => 1,
        'can_own_workspace' => true,
    ]);

    $this->orgUnitId = Str::uuid()->toString();
    DB::table('org_units')->insert([
        'id' => $this->orgUnitId,
        'org_level_id' => $this->orgLevelId,
        'name' => 'Vendor PT ABC',
    ]);

    $this->superAdminRole = RoleModel::create([
        'id' => Str::uuid()->toString(),
        'name' => 'Superadmin',
        'scope' => 'GLOBAL',
    ]);

    $this->vendorRole = RoleModel::create([
        'id' => Str::uuid()->toString(),
        'name' => 'Vendor',
        'scope' => 'GLOBAL',
    ]);

    $this->superAdmin = UserModel::factory()->create([
        'email' => 'admin@wlms.com',
        'org_unit_id' => $this->orgUnitId,
    ]);

    DB::table('user_roles')->insert([
        'id' => Str::uuid()->toString(),
        'user_id' => $this->superAdmin->id,
        'role_id' => $this->superAdminRole->id,
    ]);

    $this->normalUser = UserModel::factory()->create();
});

test('guest cannot bulk create users', function () {
    $response = $this->postJson('/api/rbac/users/bulk', [
        'users' => [
            ['name' => 'Test User', 'email' => 'test@example.com'],
        ],
    ]);

    $response->assertUnauthorized();
});

test('normal user cannot bulk create users', function () {
    $response = $this->actingAs($this->normalUser)->postJson('/api/rbac/users/bulk', [
        'users' => [
            ['name' => 'Test User', 'email' => 'test@example.com'],
        ],
    ]);

    $response->assertForbidden();
});

test('superadmin can bulk create multiple users with default role and org unit', function () {
    $payload = [
        'users' => [
            ['name' => 'Vendor User 1', 'email' => 'vendor1@vendor.com'],
            ['name' => 'Vendor User 2', 'email' => 'vendor2@vendor.com'],
            ['name' => 'Vendor User 3', 'email' => 'vendor3@vendor.com'],
        ],
        'default_role_id' => $this->vendorRole->id,
        'default_org_unit_id' => $this->orgUnitId,
        'default_password' => 'VendorSecret123!',
        'skip_duplicates' => true,
    ];

    $response = $this->actingAs($this->superAdmin)->postJson('/api/rbac/users/bulk', $payload);

    $response->assertCreated();
    $response->assertJsonPath('data.created_count', 3);
    $response->assertJsonPath('data.skipped_count', 0);

    // Verify in database
    $user1 = UserModel::where('email', 'vendor1@vendor.com')->first();
    expect($user1)->not->toBeNull();
    expect($user1->name)->toBe('Vendor User 1');
    expect($user1->org_unit_id)->toBe($this->orgUnitId);
    expect(Hash::check('VendorSecret123!', $user1->password))->toBeTrue();

    // Verify role assignment
    $hasRole = DB::table('user_roles')
        ->where('user_id', $user1->id)
        ->where('role_id', $this->vendorRole->id)
        ->exists();
    expect($hasRole)->toBeTrue();
});

test('bulk create skips duplicate emails when skip_duplicates is true', function () {
    // Pre-create user with same email
    UserModel::factory()->create(['email' => 'existing@vendor.com']);

    $payload = [
        'users' => [
            ['name' => 'New User', 'email' => 'new@vendor.com'],
            ['name' => 'Existing User', 'email' => 'existing@vendor.com'],
            ['name' => 'Duplicate in List', 'email' => 'new@vendor.com'],
        ],
        'skip_duplicates' => true,
    ];

    $response = $this->actingAs($this->superAdmin)->postJson('/api/rbac/users/bulk', $payload);

    $response->assertCreated();
    $response->assertJsonPath('data.created_count', 1);
    $response->assertJsonPath('data.skipped_count', 2);
});

test('bulk create returns 422 validation error when duplicate exists and skip_duplicates is false', function () {
    UserModel::factory()->create(['email' => 'existing@vendor.com']);

    $payload = [
        'users' => [
            ['name' => 'New User', 'email' => 'new@vendor.com'],
            ['name' => 'Existing User', 'email' => 'existing@vendor.com'],
        ],
        'skip_duplicates' => false,
    ];

    $response = $this->actingAs($this->superAdmin)->postJson('/api/rbac/users/bulk', $payload);

    $response->assertStatus(422);
});

test('bulk create validates email format', function () {
    $payload = [
        'users' => [
            ['name' => 'Bad Email', 'email' => 'not-an-email'],
        ],
    ];

    $response = $this->actingAs($this->superAdmin)->postJson('/api/rbac/users/bulk', $payload);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['users.0.email']);
});

