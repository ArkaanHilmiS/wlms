<?php

namespace App\Modules\Identity\Infrastructure\Persistence\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property int|string $user_id
 * @property string $role_id
 * @property string|null $context_type
 * @property string|null $context_id
 * @property-read RoleModel|null $role
 * @property-read UserModel|null $user
 */
class UserRoleModel extends Model
{
    use HasUuids;

    protected $table = 'user_roles';

    protected $fillable = [
        'user_id',
        'role_id',
        'context_type',
        'context_id',
    ];

    /**
     * @return BelongsTo<UserModel, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(UserModel::class, 'user_id');
    }

    /**
     * @return BelongsTo<RoleModel, $this>
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(RoleModel::class, 'role_id');
    }
}
