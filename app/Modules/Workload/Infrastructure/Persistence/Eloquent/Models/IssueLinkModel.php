<?php

declare(strict_types=1);

namespace App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models;

use App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models\UserModel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class IssueLinkModel extends Model
{
    use HasUuids;

    protected $table = 'issue_links';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'source_issue_id',
        'target_issue_id',
        'link_type_id',
        'created_by',
    ];

    /**
     * @return BelongsTo<IssueModel, $this>
     */
    public function sourceIssue(): BelongsTo
    {
        return $this->belongsTo(IssueModel::class, 'source_issue_id');
    }

    /**
     * @return BelongsTo<IssueModel, $this>
     */
    public function targetIssue(): BelongsTo
    {
        return $this->belongsTo(IssueModel::class, 'target_issue_id');
    }

    /**
     * @return BelongsTo<UserModel, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(UserModel::class, 'created_by');
    }
}
