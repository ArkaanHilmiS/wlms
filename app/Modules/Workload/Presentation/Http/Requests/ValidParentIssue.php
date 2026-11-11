<?php

declare(strict_types=1);

namespace App\Modules\Workload\Presentation\Http\Requests;

use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueModel;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/** Parent must exist, share the project, not be self, and not be a subtask itself (max 1 level). */
final class ValidParentIssue implements ValidationRule
{
    public function __construct(private readonly string $projectId, private readonly ?string $selfId) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $parent = IssueModel::find($value);

        if (! $parent || (string) $parent->project_id !== $this->projectId) {
            $fail('Parent issue tidak ditemukan di project ini.');
        } elseif ($this->selfId !== null && $parent->id === $this->selfId) {
            $fail('Issue tidak boleh menjadi parent dirinya sendiri.');
        } elseif ($parent->parent_id !== null) {
            $fail('Parent issue tidak boleh berupa sub-task.');
        } elseif ($this->selfId !== null && IssueModel::where('parent_id', $this->selfId)->exists()) {
            $fail('Issue yang memiliki sub-task tidak boleh menjadi sub-task.');
        }
    }
}
