<?php

namespace App\Modules\Identity\Presentation\Http\Controllers;

use App\Modules\Identity\Application\Services\OrgUnitTreeService;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\OrgUnitModel;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class OrgUnitController extends Controller
{
    public function __construct(
        private readonly OrgUnitTreeService $treeService = new OrgUnitTreeService()
    ) {}

    public function index(): JsonResponse
    {
        Gate::authorize('manage-rbac');
        $allUnits = OrgUnitModel::with('level')->limit(500)->get();

        // Group by parent_id. Laravel groupBy maps null to empty string.
        $grouped = $allUnits->groupBy(fn ($unit) => $unit->parent_id ?: '');

        $tree = $this->buildTree($grouped, '');

        return response()->json(['data' => $tree]);
    }

    /**
     * @param  \Illuminate\Support\Collection<string, Collection<int, OrgUnitModel>>  $grouped
     * @return array<int, OrgUnitModel>
     */
    private function buildTree(\Illuminate\Support\Collection $grouped, string $parentId = ''): array
    {
        $branch = [];
        $elements = $grouped->get($parentId) ?? collect();

        foreach ($elements as $element) {
            $children = $this->buildTree($grouped, $element->id);
            $element->setRelation('children', collect($children));
            $branch[] = $element;
        }

        return $branch;
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('manage-rbac');

        $validated = $request->validate([
            'parent_id' => 'nullable|exists:org_units,id',
            'org_level_id' => 'required|exists:org_levels,id',
            'name' => 'required|string|max:150',
            'code' => 'nullable|string|max:30|unique:org_units,code',
            'is_active' => 'boolean',
            'max_workspaces' => 'nullable|integer|min:0',
        ]);

        $unit = DB::transaction(function () use ($validated) {
            $newUnit = OrgUnitModel::create($validated);
            $this->treeService->registerUnit($newUnit->id, $validated['parent_id'] ?? null);

            return $newUnit;
        });

        $unit->load('level');

        return response()->json([
            'message' => 'Org Unit created successfully',
            'data' => $unit,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        Gate::authorize('manage-rbac');

        $unit = OrgUnitModel::findOrFail($id);

        $validated = $request->validate([
            'parent_id' => 'nullable|exists:org_units,id',
            'org_level_id' => 'sometimes|required|exists:org_levels,id',
            'name' => 'sometimes|required|string|max:150',
            'code' => 'sometimes|nullable|string|max:30|unique:org_units,code,'.$id,
            'is_active' => 'boolean',
            'max_workspaces' => 'sometimes|nullable|integer|min:0',
        ]);

        DB::transaction(function () use ($unit, $validated) {
            $oldParentId = $unit->parent_id;
            $newParentId = array_key_exists('parent_id', $validated) ? $validated['parent_id'] : $oldParentId;

            if ($newParentId === $unit->id) {
                abort(422, 'Cannot set an organization unit as its own parent.');
            }

            $unit->update($validated);

            if ($oldParentId !== $newParentId) {
                $this->treeService->moveSubtree($unit->id, $newParentId);
            }
        });

        $unit->load('level');

        return response()->json([
            'message' => 'Org Unit updated successfully',
            'data' => $unit,
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        Gate::authorize('manage-rbac');

        $unit = OrgUnitModel::findOrFail($id);

        if ($unit->children()->exists()) {
            return response()->json([
                'message' => 'Cannot delete unit because it has child units',
            ], 422);
        }

        if ($unit->users()->exists()) {
            return response()->json([
                'message' => 'Cannot delete unit because it has assigned users',
            ], 422);
        }

        // DB Cascade on org_unit_closures should handle the closure table deletions automatically
        // as defined in the migration (onDelete cascade)
        $unit->delete();

        return response()->json([
            'message' => 'Org Unit deleted successfully',
        ]);
    }
}
