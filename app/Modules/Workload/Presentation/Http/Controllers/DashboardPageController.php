<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\Queries\GetDashboardDataQuery;
use Illuminate\Http\Request;
use Inertia\Response;

final class DashboardPageController
{
    public function __construct(
        private readonly GetDashboardDataQuery $query
    ) {}

    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $data = $this->query->execute(
            $user ? $user->id : 0,
            $user?->org_unit_id ? (string) $user->org_unit_id : null
        );

        return inertia('dashboard', $data);
    }
}
