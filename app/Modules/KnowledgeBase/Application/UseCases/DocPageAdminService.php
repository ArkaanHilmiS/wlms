<?php

declare(strict_types=1);

namespace App\Modules\KnowledgeBase\Application\UseCases;

use App\Modules\KnowledgeBase\Infrastructure\Persistence\Eloquent\Models\DocCategoryModel;
use App\Modules\KnowledgeBase\Infrastructure\Persistence\Eloquent\Models\DocPageModel;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

class DocPageAdminService
{
    /**
     * @return Collection<int, DocPageModel>
     */
    public function listAllPages(): Collection
    {
        return DocPageModel::with('category')->orderBy('order')->get();
    }

    /**
     * @return Collection<int, DocCategoryModel>
     */
    public function listCategories(): Collection
    {
        return DocCategoryModel::withCount('pages')->orderBy('order')->get();
    }

    public function createCategory(string $name): DocCategoryModel
    {
        $base = Str::slug($name) ?: 'category';
        $slug = $base;
        $counter = 1;

        while (DocCategoryModel::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return DocCategoryModel::create([
            'id' => (string) Str::uuid(),
            'name' => $name,
            'slug' => $slug,
            'order' => (int) (DocCategoryModel::max('order') ?? 0) + 1,
        ]);
    }

    public function deleteCategory(string $id): void
    {
        $category = DocCategoryModel::findOrFail($id);

        $fallback = DocCategoryModel::where('slug', 'general')
            ->where('id', '!=', $id)
            ->first();

        if (! $fallback && DocPageModel::where('category_id', $id)->exists()) {
            $fallback = DocCategoryModel::firstOrCreate(
                ['slug' => 'general'],
                ['name' => 'General', 'order' => 0]
            );
        }

        if ($fallback && $fallback->id !== $id) {
            DocPageModel::where('category_id', $id)->update(['category_id' => $fallback->id]);
        }

        $category->delete();
    }

    public function findPageOrFail(string $id): DocPageModel
    {
        /** @var DocPageModel */
        return DocPageModel::with('category')->findOrFail($id);
    }

    /**
     * @param  array{title: string, slug?: ?string, category_id?: ?string, category_name?: ?string, is_published?: bool, content?: ?array<string, mixed>}  $data
     */
    public function createPage(array $data): DocPageModel
    {
        $categoryId = $data['category_id'] ?? null;
        if (! $categoryId && ! empty($data['category_name'])) {
            $category = DocCategoryModel::firstOrCreate(
                ['slug' => Str::slug($data['category_name'])],
                ['name' => $data['category_name'], 'order' => 0]
            );
            $categoryId = $category->id;
        }

        if (! $categoryId) {
            $category = DocCategoryModel::firstOrCreate(
                ['slug' => 'general'],
                ['name' => 'General', 'order' => 0]
            );
            $categoryId = $category->id;
        }

        $defaultContent = $data['content'] ?? [
            'type' => 'doc',
            'content' => [
                [
                    'type' => 'paragraph',
                    'content' => [
                        [
                            'type' => 'text',
                            'text' => 'Tulis konten panduan di sini...',
                        ],
                    ],
                ],
            ],
        ];

        $slug = $this->generateUniqueSlug($data['title'], $data['slug'] ?? null);

        return DocPageModel::create([
            'id' => (string) Str::uuid(),
            'category_id' => $categoryId,
            'title' => $data['title'],
            'slug' => $slug,
            'content' => $defaultContent,
            'order' => (int) (DocPageModel::where('category_id', $categoryId)->max('order') ?? 0) + 1,
            'is_published' => $data['is_published'] ?? true,
        ]);
    }

    public function generateUniqueSlug(string $title, ?string $preferredSlug = null, ?string $ignoreId = null): string
    {
        $base = Str::slug($preferredSlug ?: $title) ?: 'doc-page';
        $slug = $base;
        $counter = 1;

        while (DocPageModel::where('slug', $slug)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updatePage(string $id, array $data): DocPageModel
    {
        /** @var DocPageModel $page */
        $page = DocPageModel::findOrFail($id);

        if (array_key_exists('slug', $data) || array_key_exists('title', $data)) {
            if (! empty($data['slug']) || ! empty($data['title'])) {
                $data['slug'] = $this->generateUniqueSlug((string) ($data['title'] ?? $page->title), (string) ($data['slug'] ?? $page->slug), $id);
            }
        }

        $page->update($data);

        return $page;
    }

    /**
     * @param  array<string, mixed>  $content
     */
    public function updatePageContent(string $id, array $content): void
    {
        /** @var DocPageModel $page */
        $page = DocPageModel::findOrFail($id);
        $page->update(['content' => $content]);
    }

    public function deletePage(string $id): void
    {
        DocPageModel::findOrFail($id)->delete();
    }
}

