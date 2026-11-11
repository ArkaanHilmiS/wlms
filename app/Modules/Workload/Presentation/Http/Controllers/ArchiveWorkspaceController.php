<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\DTOs\ArchiveWorkspaceInput;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Application\UseCases\ArchiveWorkspaceUseCase;
use App\Modules\Workload\Presentation\Http\Requests\ArchiveWorkspaceHttpRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

final class ArchiveWorkspaceController extends Controller
{
    public function __construct(
        private readonly ArchiveWorkspaceUseCase $useCase
    ) {}

    public function __invoke(ArchiveWorkspaceHttpRequest $request, string $id): JsonResponse
    {
        if (! WorkloadAccessChecker::canManageWorkspace($request->user()->id, $id)) {
            abort(403, 'Unauthorized.');
        }

        $input = new ArchiveWorkspaceInput(
            workspaceId: $id,
            actorUserId: $request->getActorId()
        );

        try {
            $this->useCase->execute($input);
        } catch (\InvalidArgumentException $e) {
            abort(404, 'Workspace not found.');
        }

        return response()->json(['message' => 'Workspace archived successfully'], 200);
    }
}
