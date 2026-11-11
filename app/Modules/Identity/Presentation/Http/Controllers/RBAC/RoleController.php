<?php

namespace App\Modules\Identity\Presentation\Http\Controllers\RBAC;

use App\Modules\Identity\Application\UseCases\RBAC\UpdateRoleMenusCommand;
use App\Modules\Identity\Application\UseCases\RBAC\UpdateRolePermissionsCommand;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\RoleModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = RoleModel::with(['permissions', 'menus'])->limit(500)->get();

        return response()->json(['data' => $roles]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50|unique:roles,name',
            'scope' => 'required|string|in:GLOBAL,WORKSPACE,PROJECT',
        ]);

        $role = DB::transaction(function () use ($validated) {
            return RoleModel::create([
                'id' => Str::uuid()->toString(),
                'name' => $validated['name'],
                'scope' => $validated['scope'],
            ]);
        });

        return response()->json(['data' => $role], 201);
    }

    public function show(string $id): JsonResponse
    {
        $role = RoleModel::with(['permissions', 'menus'])->findOrFail($id);

        return response()->json(['data' => $role]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $role = RoleModel::findOrFail($id);

        if (strtolower($role->name) === 'superadmin' && strtolower((string) ($request->input('name') ?? '')) !== 'superadmin') {
            return response()->json(['message' => 'Cannot rename Superadmin system role.'], 422);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:50|unique:roles,name,'.$role->id,
            'scope' => 'required|string|in:GLOBAL,WORKSPACE,PROJECT',
        ]);

        DB::transaction(function () use ($role, $validated) {
            $role->update($validated);
        });

        return response()->json(['data' => $role]);
    }

    public function destroy(string $id): JsonResponse
    {
        $role = RoleModel::findOrFail($id);

        if (strtolower($role->name) === 'superadmin') {
            return response()->json(['message' => 'Cannot delete Superadmin system role.'], 422);
        }

        DB::transaction(function () use ($role) {
            $role->permissions()->detach();
            // User roles might need to be detached as well based on business rules
            DB::table('user_roles')->where('role_id', $role->id)->delete();
            $role->delete();
        });

        return response()->json(null, 204);
    }

    public function syncPermissions(Request $request, string $id, UpdateRolePermissionsCommand $command): JsonResponse
    {
        try {
            $validated = $request->validate([
                'permission_ids' => 'required|array',
                'permission_ids.*' => 'exists:permissions,id',
            ]);

            $command->execute($id, $validated['permission_ids']);

            return response()->json(['message' => 'Permissions synced successfully']);
        } catch (ValidationException $e) {
            return response()->json(['message' => 'Validasi gagal', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error("Failed to sync permissions for role {$id}: ".$e->getMessage());

            return response()->json(['message' => 'Gagal sync permissions.'], 500);
        }
    }

    public function syncMenus(Request $request, string $id, UpdateRoleMenusCommand $command): JsonResponse
    {
        try {
            $validated = $request->validate([
                'menu_ids' => 'required|array',
                'menu_ids.*' => 'exists:menus,id',
            ]);

            $command->execute($id, $validated['menu_ids']);

            return response()->json(['message' => 'Menus synced successfully']);
        } catch (ValidationException $e) {
            return response()->json(['message' => 'Validasi gagal', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error("Failed to sync menus for role {$id}: ".$e->getMessage());

            return response()->json(['message' => 'Gagal sync menus.'], 500);
        }
    }
}
