<?php

namespace App\Modules\Identity\Presentation\Http\Controllers\RBAC;

use App\Modules\Identity\Application\UseCases\RBAC\AssignRoleToUserCommand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class UserRoleController extends Controller
{
    public function assign(Request $request, AssignRoleToUserCommand $command): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role_id' => 'required|exists:roles,id',
            'context_type' => 'nullable|string|in:workspace,project,global,WORKSPACE,PROJECT,GLOBAL',
            'context_id' => 'nullable|string',
        ]);

        $contextType = ! empty($validated['context_type']) ? strtoupper((string) $validated['context_type']) : null;

        $command->execute(
            (string) $validated['user_id'],
            (string) $validated['role_id'],
            $contextType,
            $validated['context_id'] ?? null
        );

        return response()->json(['message' => 'Role assigned to user successfully']);
    }

    public function revoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role_id' => 'required|exists:roles,id',
            'context_type' => 'nullable|string',
            'context_id' => 'nullable|string',
        ]);

        $query = DB::table('user_roles')
            ->where('user_id', $validated['user_id'])
            ->where('role_id', $validated['role_id']);

        if (array_key_exists('context_type', $validated) && $validated['context_type'] !== null) {
            $query->where('context_type', strtoupper((string) $validated['context_type']));
            if (array_key_exists('context_id', $validated)) {
                if ($validated['context_id'] === null || $validated['context_id'] === '') {
                    $query->whereNull('context_id');
                } else {
                    $query->where('context_id', $validated['context_id']);
                }
            }
        }

        $query->delete();

        return response()->json(['message' => 'Role revoked successfully'], 204);
    }
}
