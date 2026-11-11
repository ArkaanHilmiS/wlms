<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\DTOs\UpdateWorkspaceInput;
use App\Modules\Workload\Application\Services\WorkloadAccessChecker;
use App\Modules\Workload\Application\UseCases\UpdateWorkspaceUseCase;
use App\Modules\Workload\Presentation\Http\Requests\UpdateWorkspaceHttpRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

final class UpdateWorkspaceController extends Controller
{
    public function __construct(
        private readonly UpdateWorkspaceUseCase $useCase
    ) {}

    public function __invoke(UpdateWorkspaceHttpRequest $request, string $id): JsonResponse
    {
        if (! WorkloadAccessChecker::canManageWorkspace($request->user()->id, $id)) {
            abort(403, 'Unauthorized.');
        }

        $validated = $request->validated();

        $input = new UpdateWorkspaceInput(
            workspaceId: $id,
            name: $validated['name'],
            settings: $validated['settings'] ?? null,
            actorUserId: $request->getActorId()
        );

        try {
            $this->useCase->execute($input);
        } catch (\InvalidArgumentException $e) {
            abort(404, 'Workspace not found.');
        }

        return response()->json(['message' => 'Workspace updated successfully'], 200);
    }
}
