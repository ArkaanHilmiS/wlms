<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Controllers;

use App\Modules\Workload\Application\DTOs\CreateWorkspaceInput;
use App\Modules\Workload\Application\UseCases\CreateWorkspaceUseCase;
use App\Modules\Workload\Domain\Exceptions\WorkspaceCreationException;
use App\Modules\Workload\Presentation\Http\Requests\CreateWorkspaceHttpRequest;
use App\Modules\Workload\Presentation\Http\Resources\WorkspaceResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

final class CreateWorkspaceController extends Controller
{
    public function __construct(
        private readonly CreateWorkspaceUseCase $useCase
    ) {}

    public function __invoke(CreateWorkspaceHttpRequest $request): JsonResponse
    {
        // 1. Validasi Input ketat sudah ditangani oleh CreateWorkspaceHttpRequest
        $validated = $request->validated();

        // 2. Buat ID (UUIDv7 disimulasikan dengan uuid4/uuid7 Laravel)
        // Idempotency: Jika Idempotency-Key dikirimkan dari frontend, bisa digunakan sebagai ID.
        // Jika tidak, generate UUID baru.
        $workspaceId = $request->getIdempotencyKey();

        // 3. Mapping ke DTO (Isolasi HTTP request dari Application Layer)
        $input = new CreateWorkspaceInput(
            workspaceId: $workspaceId,
            ownerGroupId: $request->getOwnerGroupId(), // Anti-IDOR
            name: $validated['name'],
            actorUserId: $request->getActorId() // Anti-IDOR
        );

        // 4. Eksekusi Command
        try {
            $output = $this->useCase->execute($input);
        } catch (WorkspaceCreationException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        // 5. Response API Resource (Zero Data Breach)
        return response()->json(
            WorkspaceResource::make($output)->resolve(),
            201
        );
    }
}
