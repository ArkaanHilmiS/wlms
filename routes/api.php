<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

require base_path('app/Modules/Collaboration/Presentation/Http/routes.php');
require base_path('app/Modules/Workload/Presentation/Http/routes.php');
require base_path('app/Modules/Notification/Presentation/Http/routes.php');
