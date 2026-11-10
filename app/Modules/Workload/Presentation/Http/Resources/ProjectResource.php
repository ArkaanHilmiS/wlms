<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Resources;

use App\Modules\Workload\Application\DTOs\ProjectOutput;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property ProjectOutput $resource
 */
final class ProjectResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'workspace_id' => $this->resource->workspaceId,
            'key' => $this->resource->key,
            'name' => $this->resource->name,
            'description' => $this->resource->description,
            'status' => $this->resource->status,
            'lead_id' => $this->resource->leadId !== null
                ? (is_numeric($this->resource->leadId) ? (int) $this->resource->leadId : $this->resource->leadId)
                : null,
            'workflow_id' => null,
            'priority_id' => $this->resource->priorityId,
            'total_issues_count' => $this->resource->totalIssuesCount,
            'completed_issues_count' => $this->resource->completedIssuesCount,
            'start_date' => $this->resource->startDate,
            'end_date' => $this->resource->endDate,
        ];
    }
}
