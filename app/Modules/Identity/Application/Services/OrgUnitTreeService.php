<?php

namespace App\Modules\Identity\Application\Services;

use Illuminate\Support\Facades\DB;

class OrgUnitTreeService
{
    /**
     * Register a newly created organization unit into the closure table.
     */
    public function registerUnit(string $unitId, ?string $parentId = null): void
    {
        // 1. Self reference (depth 0)
        DB::table('org_unit_closures')->insert([
            'ancestor_id' => $unitId,
            'descendant_id' => $unitId,
            'depth' => 0,
        ]);

        // 2. Ancestor paths
        if (! empty($parentId)) {
            $ancestors = DB::table('org_unit_closures')
                ->where('descendant_id', $parentId)
                ->get();

            $inserts = [];
            foreach ($ancestors as $ancestor) {
                $inserts[] = [
                    'ancestor_id' => $ancestor->ancestor_id,
                    'descendant_id' => $unitId,
                    'depth' => $ancestor->depth + 1,
                ];
            }

            if (! empty($inserts)) {
                DB::table('org_unit_closures')->insert($inserts);
            }
        }
    }

    /**
     * Move an existing organization unit (and its entire subtree) to a new parent in the closure table.
     */
    public function moveSubtree(string $unitId, ?string $newParentId): void
    {
        // Prevent circular references (cannot move unit under one of its own descendants)
        if ($newParentId) {
            $isDescendant = DB::table('org_unit_closures')
                ->where('ancestor_id', $unitId)
                ->where('descendant_id', $newParentId)
                ->exists();

            if ($isDescendant) {
                abort(422, 'Cannot move unit under its own descendant.');
            }
        }

        // 1. Delete paths that disconnect the subtree from its old ancestors
        DB::statement('
            DELETE FROM org_unit_closures 
            WHERE descendant_id IN (SELECT descendant_id FROM (SELECT descendant_id FROM org_unit_closures WHERE ancestor_id = ?) AS tmpsub)
            AND ancestor_id IN (SELECT ancestor_id FROM (SELECT ancestor_id FROM org_unit_closures WHERE descendant_id = ? AND ancestor_id != ?) AS tmpanc)
        ', [$unitId, $unitId, $unitId]);

        // 2. Insert new paths connecting the new ancestors to the subtree
        if ($newParentId) {
            DB::statement('
                INSERT INTO org_unit_closures (ancestor_id, descendant_id, depth)
                SELECT supertree.ancestor_id, subtree.descendant_id, supertree.depth + subtree.depth + 1
                FROM org_unit_closures AS supertree
                CROSS JOIN org_unit_closures AS subtree
                WHERE supertree.descendant_id = ?
                AND subtree.ancestor_id = ?
            ', [$newParentId, $unitId]);
        }
    }
}

