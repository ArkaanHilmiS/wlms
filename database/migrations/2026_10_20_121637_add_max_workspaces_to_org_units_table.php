<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('org_units', function (Blueprint $table) {
            $table->integer('max_workspaces')->nullable()->default(null)->after('is_active');
        });

        // Seed initial production quota for Bank Jatim & MII if units exist
        \Illuminate\Support\Facades\DB::table('org_units')
            ->whereIn('code', ['TMDP', 'MII', 'CISO'])
            ->update(['max_workspaces' => 1]);

        \Illuminate\Support\Facades\DB::table('org_units')
            ->whereIn('code', ['DADS', 'DWH', 'BI', 'IT'])
            ->update(['max_workspaces' => 0]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('org_units', function (Blueprint $table) {
            $table->dropColumn('max_workspaces');
        });
    }
};
