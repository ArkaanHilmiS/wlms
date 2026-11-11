<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            if (! Schema::hasColumn('issues', 'start_date')) {
                $table->date('start_date')->nullable();
            }
            if (! Schema::hasColumn('issues', 'due_date')) {
                $table->date('due_date')->nullable();
            }
            if (! Schema::hasColumn('issues', 'parent_id')) {
                $table->uuid('parent_id')->nullable()->index('issues_parent_id_index');
            }
            $table->index('due_date', 'issues_due_date_index');
        });
    }

    public function down(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->dropIndex('issues_due_date_index');
            if (Schema::hasColumn('issues', 'parent_id')) {
                $table->dropIndex('issues_parent_id_index');
                $table->dropColumn('parent_id');
            }
        });
    }
};
