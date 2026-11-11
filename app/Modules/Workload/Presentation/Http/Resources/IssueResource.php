<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Resources;

use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueModel;
use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\StatusModel;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/**
 * @mixin IssueModel
 */
class IssueResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $statusCategory = $this->relationLoaded('status')
            ? $this->status?->category
            : ($this->status_id ? StatusModel::query()->where('id', $this->status_id)->value('category') : null);

        $isOverdue = $this->due_date !== null
            && Carbon::parse($this->due_date)->startOfDay()->lt(now()->startOfDay())
            && strtoupper((string) $statusCategory) !== 'DONE';

        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            ...$this->linkStats(),
            'number' => $this->number,
            'title' => $this->title,
            'description' => $this->description,
            'issue_type_id' => $this->issue_type_id,
            'priority_id' => $this->priority_id,
            'status_id' => $this->status_id,
            'sprint_id' => $this->sprint_id,
            'reporter_id' => $this->reporter_id,
            'assignee_id' => $this->assignee_id,
            'story_points' => $this->story_points,
            'original_estimate_seconds' => $this->original_estimate_seconds,
            'remaining_estimate_seconds' => $this->remaining_estimate_seconds,
            'start_date' => $this->start_date ? Carbon::parse($this->start_date)->format('Y-m-d') : null,
            'due_date' => $this->due_date ? Carbon::parse($this->due_date)->format('Y-m-d') : null,
            'is_overdue' => $isOverdue,
            'created_at' => $this->created_at,

            'assignee' => $this->whenLoaded('assignee', function () {
                return [
                    'id' => $this->assignee->id,
                    'name' => $this->assignee->name,
                ];
            }),
            'reporter' => $this->whenLoaded('reporter', function () {
                return [
                    'id' => $this->reporter->id,
                    'name' => $this->reporter->name,
                ];
            }),
            'status' => $this->whenLoaded('status', function () {
                return [
                    'id' => $this->status->id,
                    'name' => $this->status->name,
                    'slug' => $this->status->slug,
                    'category' => $this->status->category,
                    'color' => $this->status->color,
                ];
            }),
            'issue_type' => $this->whenLoaded('type', function () {
                return [
                    'id' => $this->type->id,
                    'name' => $this->type->name,
                    'icon' => $this->type->icon,
                ];
            }),
            'priority' => $this->whenLoaded('priority', function () {
                return [
                    'id' => $this->priority->id,
                    'name' => $this->priority->name,
                    'icon' => $this->priority->icon,
                    'color' => $this->priority->color,
                ];
            }),
            'project' => $this->whenLoaded('project', function () {
                return [
                    'id' => $this->project->id,
                    'name' => $this->project->name,
                    'key' => $this->project->key,
                ];
            }),
            'sprint' => $this->whenLoaded('sprint', function () {
                return [
                    'id' => $this->sprint->id,
                    'name' => $this->sprint->name,
                    'state' => $this->sprint->state,
                ];
            }),
        ];
    }
}
