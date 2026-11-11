<?php

namespace App\Modules\Identity\Presentation\Http\Controllers\RBAC;

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserRoleModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = UserModel::select([
            'id',
            'uuid',
            'name',
            'email',
            'org_unit_id',
            'created_at',
            'updated_at',
        ])
            ->with([
                'orgUnit:id,name',
                'userRoles.role:id,name',
            ])
            ->get()
            ->map(fn (UserModel $user) => [
                'id' => $user->id,
                'uuid' => $user->uuid,
                'name' => $user->name,
                'email' => $user->email,
                'org_unit_id' => $user->org_unit_id,
                'org_unit_name' => $user->orgUnit?->name,
                'roles' => $user->userRoles
                    ->map(fn (UserRoleModel $ur) => $ur->role?->name)
                    ->filter()
                    ->values(),
                'user_roles' => $user->userRoles
                    ->toBase()
                    ->filter(fn (UserRoleModel $ur) => $ur->role !== null)
                    ->map(fn (UserRoleModel $ur) => [
                        'role_id' => (string) $ur->role_id,
                        'role_name' => (string) $ur->role?->name,
                        'context_type' => $ur->context_type,
                        'context_id' => $ur->context_id,
                    ])
                    ->values()
                    ->all(),
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
            ]);

        return response()->json(['data' => $users]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
            'org_unit_id' => 'nullable|exists:org_units,id',
        ]);

        $user = DB::transaction(function () use ($validated) {
            return UserModel::create([
                'uuid' => Str::uuid()->toString(),
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'org_unit_id' => $validated['org_unit_id'] ?? null,
            ]);
        });

        return response()->json(['data' => $user], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = UserModel::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,'.$user->id,
            'org_unit_id' => 'nullable|exists:org_units,id',
        ]);

        $user->update($validated);

        return response()->json(['data' => $user]);
    }

    public function bulkStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'users' => 'required|array|min:1|max:200',
            'users.*.name' => 'required|string|max:255',
            'users.*.email' => 'required|string|email|max:255',
            'users.*.password' => 'nullable|string|min:8',
            'users.*.org_unit_id' => 'nullable|exists:org_units,id',
            'users.*.role_id' => 'nullable|exists:roles,id',
            'default_password' => 'nullable|string|min:8',
            'default_org_unit_id' => 'nullable|exists:org_units,id',
            'default_role_id' => 'nullable|exists:roles,id',
            'skip_duplicates' => 'nullable|boolean',
        ]);

        $defaultPassword = $validated['default_password'] ?? 'Password123!';
        $defaultOrgUnitId = $validated['default_org_unit_id'] ?? null;
        $defaultRoleId = $validated['default_role_id'] ?? null;
        $skipDuplicates = (bool) ($validated['skip_duplicates'] ?? true);

        /** @var array<int, array<string, mixed>> $userItems */
        $userItems = is_array($validated['users']) ? $validated['users'] : [];

        $requestedEmails = [];
        foreach ($userItems as $item) {
            if (! empty($item['email']) && is_string($item['email'])) {
                $requestedEmails[] = strtolower(trim($item['email']));
            }
        }

        $existingEmails = UserModel::whereIn('email', $requestedEmails)
            ->pluck('email')
            ->map(fn ($e) => strtolower(trim((string) $e)))
            ->flip()
            ->all();

        $seenInBatch = [];
        $createdUsers = [];
        $skippedUsers = [];

        if (! $skipDuplicates) {
            foreach ($userItems as $idx => $item) {
                $email = strtolower(trim((string) $item['email']));
                if (isset($existingEmails[$email]) || isset($seenInBatch[$email])) {
                    return response()->json([
                        'message' => "Email '{$item['email']}' already exists or is duplicated in list.",
                        'errors' => [
                            "users.{$idx}.email" => ["Email '{$item['email']}' already exists."],
                        ],
                    ], 422);
                }
                $seenInBatch[$email] = true;
            }
            $seenInBatch = [];
        }

        DB::transaction(function () use (
            $userItems,
            $defaultPassword,
            $defaultOrgUnitId,
            $defaultRoleId,
            $skipDuplicates,
            $existingEmails,
            &$seenInBatch,
            &$createdUsers,
            &$skippedUsers
        ) {
            foreach ($userItems as $item) {
                $email = strtolower(trim((string) $item['email']));

                if (isset($existingEmails[$email])) {
                    if ($skipDuplicates) {
                        $skippedUsers[] = [
                            'email' => $item['email'],
                            'reason' => 'Already exists in database',
                        ];
                        continue;
                    }
                }

                if (isset($seenInBatch[$email])) {
                    if ($skipDuplicates) {
                        $skippedUsers[] = [
                            'email' => $item['email'],
                            'reason' => 'Duplicate in input batch',
                        ];
                        continue;
                    }
                }

                $seenInBatch[$email] = true;

                $password = ! empty($item['password']) ? (string) $item['password'] : $defaultPassword;
                $orgUnitId = ! empty($item['org_unit_id']) ? $item['org_unit_id'] : $defaultOrgUnitId;
                $roleId = ! empty($item['role_id']) ? $item['role_id'] : $defaultRoleId;

                $user = UserModel::create([
                    'uuid' => Str::uuid()->toString(),
                    'name' => trim((string) $item['name']),
                    'email' => $email,
                    'password' => Hash::make($password),
                    'org_unit_id' => $orgUnitId,
                ]);

                if ($roleId) {
                    DB::table('user_roles')->insert([
                        'id' => Str::uuid()->toString(),
                        'user_id' => $user->id,
                        'role_id' => $roleId,
                        'context_type' => 'GLOBAL',
                        'context_id' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $createdUsers[] = [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ];
            }
        });

        return response()->json([
            'data' => [
                'total_requested' => count($userItems),
                'created_count' => count($createdUsers),
                'skipped_count' => count($skippedUsers),
                'created_users' => $createdUsers,
                'skipped_users' => $skippedUsers,
            ],
        ], 201);
    }
}
