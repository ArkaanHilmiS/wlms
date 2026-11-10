<?php

declare(strict_types=1);

namespace App\Modules\Workload\Infrastructure\Config;

use App\Modules\Workload\Domain\Config\WorkspaceSettingsInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class WorkspaceSettings implements WorkspaceSettingsInterface
{
    /**
     * Mengambil nilai maksimal workspace per group dari tabel org_units/org_levels atau fallback ke settings.
     */
    public function getMaxWorkspacesPerGroup(?string $groupId = null): int
    {
        if ($groupId) {
            $unit = DB::table('org_units')->where('id', $groupId)->first();
            if ($unit !== null) {
                $levelId = $unit->org_level_id ?? $unit->level_id ?? null;
                if ($levelId && Schema::hasTable('org_levels') && Schema::hasColumn('org_levels', 'can_own_workspace')) {
                    $canOwn = DB::table('org_levels')->where('id', $levelId)->value('can_own_workspace');
                    if ($canOwn !== null && ! (bool) $canOwn) {
                        return 0;
                    }
                }

                if (property_exists($unit, 'max_workspaces') && $unit->max_workspaces !== null) {
                    return (int) $unit->max_workspaces;
                }
            }
        }

        $setting = DB::table('settings')->where('key', 'workload.max_workspaces_per_group')->first();

        if (! $setting) {
            return 10;
        }

        $value = json_decode((string) $setting->value, true);

        return is_numeric($value) ? (int) $value : 10;
    }
}
