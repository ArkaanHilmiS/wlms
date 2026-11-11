<?php

namespace Database\Seeders;

use App\Modules\KnowledgeBase\Infrastructure\Persistence\Eloquent\Models\DocCategoryModel;
use App\Modules\KnowledgeBase\Infrastructure\Persistence\Eloquent\Models\DocPageModel;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class KnowledgeBaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $category = DocCategoryModel::create([
            'id' => Str::uuid(),
            'name' => 'Manajemen Proyek',
            'slug' => 'manajemen-proyek',
            'order' => 1,
        ]);

        $filePath = base_path('doc/UserGuide-IssueManagement.md');
        $raw = file_exists($filePath) ? file_get_contents($filePath) : false;
        $content = $raw !== false ? Str::markdown($raw) : 'Content not found.';

        DocPageModel::create([
            'id' => Str::uuid(),
            'category_id' => $category->id,
            'title' => 'Manajemen Tiket & Prioritas Kerja',
            'slug' => 'manajemen-tiket',
            'content' => $content,
            'order' => 1,
            'is_published' => true,
        ]);
    }
}
