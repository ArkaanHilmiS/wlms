<?php

namespace App\Modules\Identity\Presentation\Http\Controllers\RBAC;

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\PermissionModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

class PermissionController extends Controller
{
    public function index(): JsonResponse
    {
        $permissions = PermissionModel::orderBy('name')->get();

        return response()->json(['data' => $permissions]);
    }
}
