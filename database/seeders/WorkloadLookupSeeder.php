<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * WorkloadLookupSeeder
 * Data konfigurasi awal untuk semua lookup table dinamis modul Workload.
 * IDEMPOTENT: Aman dijalankan berulang kali (menggunakan upsert via slug).
 */
class WorkloadLookupSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedIssueTypes();
        $this->seedPriorities();
        $this->seedStatuses();
    }

    private function seedIssueTypes(): void
    {
        $types = [
            ['name' => 'Epic',      'slug' => 'epic',      'icon' => 'layers',       'color' => '#9B59B6', 'sort_order' => 1],
            ['name' => 'Story',     'slug' => 'story',     'icon' => 'bookmark',     'color' => '#27AE60', 'sort_order' => 2],
            ['name' => 'Task',      'slug' => 'task',      'icon' => 'check-square', 'color' => '#2980B9', 'sort_order' => 3],
            ['name' => 'Bug',       'slug' => 'bug',       'icon' => 'bug',          'color' => '#E74C3C', 'sort_order' => 4],
            ['name' => 'Subtask',   'slug' => 'subtask',   'icon' => 'corner-down-right', 'color' => '#7F8C8D', 'sort_order' => 5],
        ];

        foreach ($types as $type) {
            DB::table('issue_types')->upsert(
                array_merge($type, ['id' => (string) Str::uuid(), 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]),
                ['slug'],
                ['name', 'icon', 'color', 'sort_order', 'updated_at']
            );
        }
    }

    private function seedPriorities(): void
    {
        // 'Lowest' dinonaktifkan (revisi UX): skala Low → Critical sudah cukup.
        // Data lama yang masih memakai 'lowest' tetap utuh, hanya tidak muncul di pilihan.
        $priorities = [
            ['name' => 'Lowest',   'slug' => 'lowest',   'level' => 1, 'icon' => 'chevrons-down', 'color' => '#BDC3C7', 'is_active' => false],
            ['name' => 'Low',      'slug' => 'low',      'level' => 2, 'icon' => 'chevron-down',  'color' => '#27AE60', 'is_active' => true],
            ['name' => 'Medium',   'slug' => 'medium',   'level' => 3, 'icon' => 'minus',         'color' => '#F39C12', 'is_active' => true],
            ['name' => 'High',     'slug' => 'high',     'level' => 4, 'icon' => 'chevron-up',    'color' => '#E67E22', 'is_active' => true],
            ['name' => 'Critical', 'slug' => 'critical', 'level' => 5, 'icon' => 'chevrons-up',   'color' => '#E74C3C', 'is_active' => true],
        ];

        foreach ($priorities as $priority) {
            DB::table('priorities')->upsert(
                array_merge($priority, ['id' => (string) Str::uuid(), 'created_at' => now(), 'updated_at' => now()]),
                ['slug'],
                ['name', 'level', 'icon', 'color', 'is_active', 'updated_at']
            );
        }
    }

    private function seedStatuses(): void
    {
        $statuses = [
            ['name' => 'To Do',       'slug' => 'to-do',       'category' => 'TODO',        'color' => '#7F8C8D'],
            ['name' => 'In Progress', 'slug' => 'in-progress', 'category' => 'IN_PROGRESS', 'color' => '#2980B9'],
            ['name' => 'In Review',   'slug' => 'in-review',   'category' => 'IN_PROGRESS', 'color' => '#8E44AD'],
            ['name' => 'In QA',       'slug' => 'in-qa',       'category' => 'IN_PROGRESS', 'color' => '#E67E22'],
            ['name' => 'Done',        'slug' => 'done',        'category' => 'DONE',        'color' => '#27AE60'],
        ];

        foreach ($statuses as $status) {
            DB::table('statuses')->upsert(
                array_merge($status, ['id' => (string) Str::uuid(), 'created_at' => now(), 'updated_at' => now()]),
                ['slug'],
                ['name', 'category', 'color', 'updated_at']
            );
        }
    }
}
