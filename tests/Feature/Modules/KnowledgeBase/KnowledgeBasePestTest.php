<?php

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\RoleModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserRoleModel;
use App\Modules\KnowledgeBase\Infrastructure\Persistence\Eloquent\Models\DocCategoryModel;
use App\Modules\KnowledgeBase\Infrastructure\Persistence\Eloquent\Models\DocPageModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = UserModel::factory()->create();
    $this->adminRole = RoleModel::firstOrCreate(['name' => 'Superadmin'], ['id' => Str::uuid(), 'scope' => 'GLOBAL']);

    $this->category = DocCategoryModel::create([
        'id' => Str::uuid()->toString(),
        'name' => 'General',
        'slug' => 'general',
        'description' => 'General docs',
        'order' => 1,
    ]);

    $this->page = DocPageModel::create([
        'id' => Str::uuid()->toString(),
        'category_id' => $this->category->id,
        'title' => 'First Doc',
        'slug' => 'first-doc',
        'content' => ['ops' => [['insert' => 'Hello World\n']]],
        'order' => 1,
        'is_published' => true,
    ]);
});

test('user can view doc page', function () {
    $response = $this->actingAs($this->user)->get("/docs/{$this->page->slug}");
    $response->assertStatus(200);
});

test('admin can access doc index and redirect from /admin/docs', function () {
    UserRoleModel::create(['id' => Str::uuid(), 'user_id' => $this->user->id, 'role_id' => $this->adminRole->id]);

    $response = $this->actingAs($this->user)->get('/settings/docs');
    $response->assertStatus(200);

    $redirectResponse = $this->actingAs($this->user)->get('/admin/docs');
    $redirectResponse->assertRedirect('/settings/docs');
});

test('admin can update doc page content', function () {
    UserRoleModel::create(['id' => Str::uuid(), 'user_id' => $this->user->id, 'role_id' => $this->adminRole->id]);

    $newContent = ['ops' => [['insert' => 'Updated content\n']]];

    $response = $this->actingAs($this->user)->put("/settings/docs/{$this->page->id}", [
        'content' => $newContent,
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success', 'Tersimpan');

    $this->assertDatabaseHas('doc_pages', [
        'id' => $this->page->id,
    ]);

    $updatedPage = DocPageModel::find($this->page->id);
    $this->assertEquals($newContent, $updatedPage->content);
});

test('non-admin cannot update doc page content', function () {
    // Regular user without admin role
    $regularUser = UserModel::factory()->create();

    $newContent = ['ops' => [['insert' => 'Hacked content\n']]];

    $response = $this->actingAs($regularUser)->put("/settings/docs/{$this->page->id}", [
        'content' => $newContent,
    ]);

    $response->assertStatus(403);
});

test('admin can create doc page', function () {
    UserRoleModel::create(['id' => Str::uuid(), 'user_id' => $this->user->id, 'role_id' => $this->adminRole->id]);

    $response = $this->actingAs($this->user)->post('/settings/docs', [
        'title' => 'Panduan Baru TipTap',
        'slug' => 'panduan-baru-tiptap',
        'category_id' => $this->category->id,
        'is_published' => true,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('doc_pages', [
        'slug' => 'panduan-baru-tiptap',
        'title' => 'Panduan Baru TipTap',
    ]);
});

test('duplicate slug is automatically suffixed with number', function () {
    UserRoleModel::create(['id' => Str::uuid(), 'user_id' => $this->user->id, 'role_id' => $this->adminRole->id]);

    $this->actingAs($this->user)->post('/settings/docs', [
        'title' => 'First Doc',
        'slug' => 'first-doc',
        'category_id' => $this->category->id,
    ]);

    $this->assertDatabaseHas('doc_pages', [
        'slug' => 'first-doc-1',
        'title' => 'First Doc',
    ]);
});

test('admin can delete doc page', function () {
    UserRoleModel::create(['id' => Str::uuid(), 'user_id' => $this->user->id, 'role_id' => $this->adminRole->id]);

    $response = $this->actingAs($this->user)->delete("/settings/docs/{$this->page->id}");

    $response->assertRedirect();
    $this->assertDatabaseMissing('doc_pages', [
        'id' => $this->page->id,
    ]);
});

test('non-admin cannot create or delete doc page', function () {
    $regularUser = UserModel::factory()->create();

    $createResponse = $this->actingAs($regularUser)->post('/settings/docs', [
        'title' => 'Unauthorized Doc',
        'slug' => 'unauthorized-doc',
    ]);
    $createResponse->assertStatus(403);

    $deleteResponse = $this->actingAs($regularUser)->delete("/settings/docs/{$this->page->id}");
    $deleteResponse->assertStatus(403);
});

test('admin can create doc category', function () {
    UserRoleModel::create(['id' => Str::uuid(), 'user_id' => $this->user->id, 'role_id' => $this->adminRole->id]);

    $response = $this->actingAs($this->user)->post('/settings/doc-categories', [
        'name' => 'SOP & Tata Tertib',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('doc_categories', [
        'name' => 'SOP & Tata Tertib',
        'slug' => 'sop-tata-tertib',
    ]);
});

test('admin can delete doc category and its pages are safely reassigned to fallback category', function () {
    UserRoleModel::create(['id' => Str::uuid(), 'user_id' => $this->user->id, 'role_id' => $this->adminRole->id]);

    $newCategory = DocCategoryModel::create([
        'id' => Str::uuid()->toString(),
        'name' => 'Kategori Sementara',
        'slug' => 'kategori-sementara',
        'order' => 5,
    ]);

    $page = DocPageModel::create([
        'id' => Str::uuid()->toString(),
        'category_id' => $newCategory->id,
        'title' => 'Page in Temporary Category',
        'slug' => 'temp-page',
        'content' => [],
        'order' => 1,
        'is_published' => true,
    ]);

    $response = $this->actingAs($this->user)->delete("/settings/doc-categories/{$newCategory->id}");

    $response->assertRedirect();
    $this->assertDatabaseMissing('doc_categories', [
        'id' => $newCategory->id,
    ]);

    // Page must not be deleted, reassigned to fallback category
    $this->assertDatabaseHas('doc_pages', [
        'id' => $page->id,
        'category_id' => $this->category->id,
    ]);
});

test('non-admin cannot create or delete doc category', function () {
    $regularUser = UserModel::factory()->create();

    $createResponse = $this->actingAs($regularUser)->post('/settings/doc-categories', [
        'name' => 'Hacked Category',
    ]);
    $createResponse->assertStatus(403);

    $deleteResponse = $this->actingAs($regularUser)->delete("/settings/doc-categories/{$this->category->id}");
    $deleteResponse->assertStatus(403);
});

test('admin can quick-toggle page publication status without sending content', function () {
    UserRoleModel::create(['id' => Str::uuid(), 'user_id' => $this->user->id, 'role_id' => $this->adminRole->id]);

    $response = $this->actingAs($this->user)->put("/settings/docs/{$this->page->id}", [
        'is_published' => false,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('doc_pages', [
        'id' => $this->page->id,
        'is_published' => false,
    ]);

    // Original content remains preserved
    $updated = DocPageModel::find($this->page->id);
    $this->assertEquals(['ops' => [['insert' => 'Hello World\n']]], $updated->content);
});



