<?php

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;

uses(RefreshDatabase::class);

test('guest cannot access security settings or update password', function () {
    $this->get('/settings/security')->assertRedirect('/login');
    $this->put('/settings/password')->assertRedirect('/login');
});

test('authenticated user can view security settings', function () {
    $user = UserModel::factory()->create();

    $response = $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->get('/settings/security');

    $response->assertOk();
    $response->assertInertia(fn (AssertableInertia $page) => $page->component('settings/security'));
});

test('password update requires correct current password', function () {
    $user = UserModel::factory()->create([
        'password' => Hash::make('CurrentSecret123!'),
    ]);

    $response = $this->actingAs($user)->put('/settings/password', [
        'current_password' => 'wrong',
        'password' => 'NewValidSecret123!',
        'password_confirmation' => 'NewValidSecret123!',
    ]);

    $response->assertSessionHasErrors('current_password');
});

test('password update rejects weak passwords', function () {
    $user = UserModel::factory()->create([
        'password' => Hash::make('CurrentSecret123!'),
    ]);

    $response = $this->actingAs($user)->put('/settings/password', [
        'current_password' => 'CurrentSecret123!',
        'password' => 'short',
        'password_confirmation' => 'short',
    ]);

    $response->assertSessionHasErrors('password');
});

test('password update successfully updates password and invalidates other sessions', function () {
    $user = UserModel::factory()->create([
        'password' => Hash::make('OldPassword123!'),
    ]);

    $otherSessionId = 'other-session-device-id';

    DB::table('sessions')->insert([
        'id' => $otherSessionId,
        'user_id' => $user->id,
        'ip_address' => '127.0.0.1',
        'user_agent' => 'Mozilla/5.0 TestBrowser',
        'payload' => base64_encode(serialize(['_token' => 'dummy-payload'])),
        'last_activity' => time(),
    ]);

    $response = $this->actingAs($user)->put('/settings/password', [
        'current_password' => 'OldPassword123!',
        'password' => 'NewPassword123!',
        'password_confirmation' => 'NewPassword123!',
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    expect(Hash::check('NewPassword123!', $user->fresh()->password))->toBeTrue();
    expect(DB::table('sessions')->where('id', $otherSessionId)->exists())->toBeFalse();
});

test('password update is rate limited', function () {
    $user = UserModel::factory()->create([
        'password' => Hash::make('CurrentSecret123!', ['rounds' => 4]),
    ]);

    for ($i = 0; $i < 6; $i++) {
        $this->actingAs($user)->put('/settings/password', [
            'current_password' => 'wrong-pass',
            'password' => 'NewValidSecret123!',
            'password_confirmation' => 'NewValidSecret123!',
        ]);
    }

    $response = $this->actingAs($user)->put('/settings/password', [
        'current_password' => 'wrong-pass',
        'password' => 'NewValidSecret123!',
        'password_confirmation' => 'NewValidSecret123!',
    ]);

    $response->assertStatus(429);
});

test('passkey confirmation options query passkeys using user_id column without sql error', function () {
    $user = UserModel::factory()->create();

    $response = $this->actingAs($user)->getJson('/passkeys/confirm/options');

    $response->assertOk();
    $response->assertJsonStructure(['options' => ['challenge', 'rpId']]);
});

test('passkeys relationship correctly returns passkeys belonging to user', function () {
    $user = UserModel::factory()->create();

    DB::table('passkeys')->insert([
        'user_id' => $user->id,
        'name' => 'MacBook Pro',
        'credential_id' => \ParagonIE\ConstantTime\Base64UrlSafe::encodeUnpadded('dummy-credential-id'),
        'credential' => json_encode(['aaguid' => '00000000-0000-0000-0000-000000000000']),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    expect($user->passkeys()->count())->toBe(1);
    expect($user->hasPasskeysEnabled())->toBeTrue();

    $response = $this->actingAs($user)->getJson('/passkeys/confirm/options');
    $response->assertOk();
});


