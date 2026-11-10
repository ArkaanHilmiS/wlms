<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class CreateWorkspaceHttpRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = auth()->user();
        if (! $user) {
            return false;
        }

        if (empty($user->org_unit_id)) {
            abort(422, 'User belum terdaftar pada unit organisasi. Hubungi Administrator.');
        }

        $hasCreatePermission = $user->hasPermission('workspaces:create') || $user->hasPermission('workspaces:manage');

        if (! $hasCreatePermission) {
            $user->loadMissing('userRoles.role.permissions');
            foreach ($user->userRoles as $userRole) {
                if ($userRole->role) {
                    if (strtolower($userRole->role->name) === 'superadmin') {
                        $hasCreatePermission = true;
                        break;
                    }
                    foreach ($userRole->role->permissions as $perm) {
                        if (in_array($perm->name, ['workspaces:manage', 'workspaces:create'], true)) {
                            $hasCreatePermission = true;
                            break 2;
                        }
                    }
                }
            }
        }

        if (! $hasCreatePermission) {
            return false;
        }

        $requestedGroupId = $this->input('target_org_unit_id') ?? $this->input('owner_group_id');
        if (is_string($requestedGroupId) && $requestedGroupId !== '' && $requestedGroupId !== (string) $user->org_unit_id) {
            if (Schema::hasTable('org_units') && DB::table('org_units')->where('id', $requestedGroupId)->exists()) {
                $isDescendant = Schema::hasTable('org_unit_closures') && DB::table('org_unit_closures')
                    ->where('ancestor_id', (string) $user->org_unit_id)
                    ->where('descendant_id', $requestedGroupId)
                    ->exists();

                if (! $isDescendant && ! $user->hasRole('Superadmin')) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:500'],
            'target_org_unit_id' => ['nullable', 'string'],
        ];
    }

    /**
     * Mendapatkan Idempotency Key dari header, atau generate otomatis.
     */
    public function getIdempotencyKey(): string
    {
        return $this->header('X-Idempotency-Key', Str::uuid()->toString());
    }

    /**
     * Mengambil ID actor secara aman dari session/token, BUKAN dari body request.
     */
    public function getActorId(): string
    {
        return (string) auth()->id();
    }

    /**
     * Mengambil ID group pemilik workspace:
     * Default ke org_unit_id milik user, atau sub-divisi turunan yang valid di bawah org_unit_id user.
     */
    public function getOwnerGroupId(): string
    {
        $user = auth()->user();
        $userOrgUnitId = (string) $user->org_unit_id;
        $requestedGroupId = $this->input('target_org_unit_id') ?? $this->input('owner_group_id');

        if (is_string($requestedGroupId) && $requestedGroupId !== '' && $requestedGroupId !== $userOrgUnitId) {
            if (Schema::hasTable('org_units') && DB::table('org_units')->where('id', $requestedGroupId)->exists()) {
                $isDescendant = Schema::hasTable('org_unit_closures') && DB::table('org_unit_closures')
                    ->where('ancestor_id', $userOrgUnitId)
                    ->where('descendant_id', $requestedGroupId)
                    ->exists();

                if ($isDescendant || $user->hasRole('Superadmin')) {
                    return $requestedGroupId;
                }
            }
        }

        return $userOrgUnitId;
    }
}
