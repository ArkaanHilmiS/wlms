<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Resources;

use App\Modules\Workload\Application\DTOs\WorkspaceOutput;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin WorkspaceOutput
 */
final class WorkspaceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     * ZERO DATA BREACH: Eksplisit mendefinisikan field yang aman diekspos.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Output DTO atau Entity
        return [
            'id' => $this->id,
            'name' => $this->name,
            'status' => $this->status,
            'owner_group_id' => $this->ownerGroupId,
            'owner_group_name' => $this->ownerGroupName ?? null,
            'owner_group_code' => $this->ownerGroupCode ?? null,
        ];
    }
}
