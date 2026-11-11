<?php

declare(strict_types=1);

namespace App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models;

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * @property string $id
 * @property string $project_id
 * @property string|null $sprint_id
 * @property string $status_id
 * @property int $number
 * @property string $title
 * @property string|null $description
 * @property string $issue_type_id
 * @property string $priority_id
 * @property int|null $story_points
 * @property int|null $original_estimate_seconds
 * @property int|null $remaining_estimate_seconds
 * @property string|null $reporter_id
 * @property string|null $assignee_id
 * @property array<string, mixed>|null $custom_fields
 * @property string|null $parent_id
 * @property Carbon|null $start_date
 * @property Carbon|null $due_date
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
final class IssueModel extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'issues';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['id', 'project_id', 'sprint_id', 'status_id', 'parent_id', 'number', 'title', 'description', 'issue_type_id', 'priority_id', 'story_points', 'original_estimate_seconds', 'remaining_estimate_seconds', 'reporter_id', 'assignee_id', 'custom_fields', 'start_date', 'due_date'];

    protected $casts = ['number' => 'integer', 'story_points' => 'integer', 'original_estimate_seconds' => 'integer', 'custom_fields' => 'array', 'start_date' => 'date:Y-m-d', 'due_date' => 'date:Y-m-d'];

    /**
     * @return BelongsTo<ProjectModel, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(ProjectModel::class, 'project_id');
    }

    /**
     * @return BelongsTo<SprintModel, $this>
     */
    public function sprint(): BelongsTo
    {
        return $this->belongsTo(SprintModel::class, 'sprint_id');
    }

    /**
     * @return BelongsTo<StatusModel, $this>
     */
    public function status(): BelongsTo
    {
        return $this->belongsTo(StatusModel::class, 'status_id');
    }

    /**
     * @return BelongsTo<IssueTypeModel, $this>
     */
    public function type(): BelongsTo
    {
        return $this->belongsTo(IssueTypeModel::class, 'issue_type_id');
    }

    /**
     * @return BelongsTo<PriorityModel, $this>
     */
    public function priority(): BelongsTo
    {
        return $this->belongsTo(PriorityModel::class, 'priority_id');
    }

    /**
     * @return BelongsTo<UserModel, $this>
     */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(UserModel::class, 'reporter_id');
    }

    /**
     * @return BelongsTo<UserModel, $this>
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(UserModel::class, 'assignee_id');
    }

    /**
     * @return HasMany<WorklogModel, $this>
     */
    public function worklogs(): HasMany
    {
        return $this->hasMany(WorklogModel::class, 'issue_id');
    }

    /**
     * @return HasMany<IssueHistoryModel, $this>
     */
    public function history(): HasMany
    {
        return $this->hasMany(IssueHistoryModel::class, 'issue_id');
    }

    /**
     * @return HasMany<IssueLinkModel, $this>
     */
    public function linksAsSource(): HasMany
    {
        return $this->hasMany(IssueLinkModel::class, 'source_issue_id');
    }

    /**
     * @return HasMany<IssueLinkModel, $this>
     */
    public function linksAsTarget(): HasMany
    {
        return $this->hasMany(IssueLinkModel::class, 'target_issue_id');
    }

    /**
     * @return HasMany<IssueModel, $this>
     */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    /**
     * Batch subtask counts + blocked flag as subqueries (no N+1).
     *
     * @param  Builder<IssueModel>  $query
     * @return Builder<IssueModel>
     */
    public function scopeWithLinkStats(Builder $query): Builder
    {
        $type = fn ($l, string $slug) => $l->whereIn('link_type_id', DB::table('issue_link_types')->select('id')->where('slug', $slug));
        $notDone = fn ($s) => $s->where('category', '!=', 'DONE');

        return $query->withCount([
            'children as subtasks_count',
            'children as completed_subtasks_count' => fn ($c) => $c->whereHas('status', fn ($s) => $s->where('category', 'DONE')),
        ])->withExists([
            'linksAsTarget as blocked_incoming' => fn ($l) => $type($l, 'blocks')->whereHas('sourceIssue.status', $notDone),
            'linksAsSource as blocked_outgoing' => fn ($l) => $type($l, 'is-blocked-by')->whereHas('targetIssue.status', $notDone),
        ]);
    }

    /**
     * @return array{parent_id: string|null, subtasks_count: int, completed_subtasks_count: int, is_blocked: bool}
     */
    public function linkStats(): array
    {
        $m = array_key_exists('subtasks_count', $this->getAttributes())
            ? $this
            : (self::query()->withLinkStats()->whereKey($this->id)->first() ?? $this);

        return [
            'parent_id' => $this->parent_id,
            'subtasks_count' => (int) $m->getAttribute('subtasks_count'),
            'completed_subtasks_count' => (int) $m->getAttribute('completed_subtasks_count'),
            'is_blocked' => (bool) ($m->getAttribute('blocked_incoming') || $m->getAttribute('blocked_outgoing')),
        ];
    }
}
