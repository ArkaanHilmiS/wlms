<?php

namespace App\Modules\KnowledgeBase\Presentation\Http\Controllers\Admin;

use App\Modules\KnowledgeBase\Application\UseCases\DocPageAdminService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class AdminDocPageController
{
    public function __construct(
        private readonly DocPageAdminService $docPageAdminService
    ) {}

    public function index(): Response
    {
        return inertia('settings/docs', [
            'pages' => $this->docPageAdminService->listAllPages(),
            'categories' => $this->docPageAdminService->listCategories(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'category_id' => 'nullable|string|exists:doc_categories,id',
            'category_name' => 'nullable|string|max:255',
            'is_published' => 'nullable|boolean',
        ]);

        $page = $this->docPageAdminService->createPage($validated);

        return redirect()->route('admin.docs.edit', $page->id)->with('success', 'Halaman berhasil dibuat.');
    }

    public function edit(string $id): Response
    {
        return inertia('Admin/Docs/Edit', [
            'page' => $this->docPageAdminService->findPageOrFail($id),
            'categories' => $this->docPageAdminService->listCategories(),
        ]);
    }

    public function update(Request $request, string $id): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'category_id' => 'nullable|string|exists:doc_categories,id',
            'is_published' => 'nullable|boolean',
            'content' => 'nullable|array',
        ]);

        $this->docPageAdminService->updatePage($id, array_filter($validated, fn ($val) => $val !== null));

        return back()->with('success', 'Tersimpan');
    }

    public function destroy(string $id): RedirectResponse
    {
        $this->docPageAdminService->deletePage($id);

        return back()->with('success', 'Halaman berhasil dihapus.');
    }

    public function storeCategory(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $this->docPageAdminService->createCategory($validated['name']);

        return back()->with('success', 'Kategori berhasil dibuat.');
    }

    public function destroyCategory(string $id): RedirectResponse
    {
        $this->docPageAdminService->deleteCategory($id);

        return back()->with('success', 'Kategori berhasil dihapus.');
    }
}
