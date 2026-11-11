<?php

declare(strict_types=1);

namespace App\Modules\Workload\Infrastructure\Config;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class WorkloadSettings
{
    public const DEFAULTS = [
        'sla_days_by_priority' => [
            'urgent' => 1,
            'critical' => 1,
            'high' => 2,
            'medium' => 5,
            'low' => 10,
        ],
        'working_days' => [1, 2, 3, 4, 5],
        'holidays' => [],
        'enable_sprints_default' => true,
        'worklog_max_hours_per_day' => 12.0,
        'worklog_allow_future_date' => false,
        'attachment_max_mb' => 5,
        'attachment_allowed_extensions' => [
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv',
            'png', 'jpg', 'jpeg', 'gif', 'webp', 'txt', 'zip',
        ],
        'similarity_threshold' => 0.35,
        'sla_warning_days' => 2,
    ];

    /**
     * @return array{
     *     sla_days_by_priority: array<string, int>,
     *     working_days: list<int>,
     *     holidays: list<string>,
     *     enable_sprints_default: bool,
     *     worklog_max_hours_per_day: float,
     *     worklog_allow_future_date: bool,
     *     attachment_max_mb: int,
     *     attachment_allowed_extensions: list<string>,
     *     similarity_threshold: float,
     *     sla_warning_days: int
     * }
     */
    public static function all(): array
    {
        $rows = DB::table('settings')
            ->where('group', 'workload')
            ->pluck('value', 'key');

        $result = self::DEFAULTS;

        foreach (self::DEFAULTS as $shortKey => $defaultValue) {
            $fullKey = "workload.{$shortKey}";
            if (! $rows->has($fullKey)) {
                continue;
            }

            $raw = $rows->get($fullKey);
            $decoded = is_string($raw) ? json_decode($raw, true) : $raw;
            if ($decoded === null && is_string($raw) && $raw !== 'null') {
                continue;
            }

            $result[$shortKey] = match ($shortKey) {
                'sla_days_by_priority' => is_array($decoded) ? array_map('intval', $decoded) : $defaultValue,
                'working_days' => is_array($decoded) ? array_values(array_map('intval', $decoded)) : $defaultValue,
                'holidays' => is_array($decoded) ? array_values(array_map('strval', $decoded)) : $defaultValue,
                'enable_sprints_default', 'worklog_allow_future_date' => (bool) $decoded,
                'worklog_max_hours_per_day', 'similarity_threshold' => (float) $decoded,
                'attachment_max_mb', 'sla_warning_days' => (int) $decoded,
                'attachment_allowed_extensions' => is_array($decoded)
                    ? array_values(array_map(fn ($ext) => strtolower(trim((string) $ext, '. ')), $decoded))
                    : $defaultValue,
                default => $decoded,
            };
        }

        return $result;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function update(array $data): array
    {
        $now = now();

        foreach ($data as $shortKey => $value) {
            if (! array_key_exists($shortKey, self::DEFAULTS)) {
                continue;
            }

            if ($shortKey === 'attachment_allowed_extensions' && is_array($value)) {
                $value = array_values(array_unique(array_filter(array_map(
                    fn ($ext) => strtolower(trim((string) $ext, '. ')),
                    $value
                ))));
            }

            if ($shortKey === 'working_days' && is_array($value)) {
                $value = array_values(array_unique(array_map('intval', $value)));
            }

            if ($shortKey === 'holidays' && is_array($value)) {
                $value = array_values(array_unique(array_map('strval', $value)));
            }

            if ($shortKey === 'sla_days_by_priority' && is_array($value)) {
                $value = array_map('intval', $value);
            }

            $type = match (true) {
                is_bool($value) => 'bool',
                is_int($value) => 'int',
                is_float($value) => 'float',
                is_array($value) => 'json',
                default => 'string',
            };

            $fullKey = "workload.{$shortKey}";
            $exists = DB::table('settings')->where('key', $fullKey)->exists();

            if ($exists) {
                DB::table('settings')->where('key', $fullKey)->update([
                    'value' => json_encode($value),
                    'type' => $type,
                    'group' => 'workload',
                    'updated_at' => $now,
                ]);
            } else {
                DB::table('settings')->insert([
                    'key' => $fullKey,
                    'value' => json_encode($value),
                    'type' => $type,
                    'group' => 'workload',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        return self::all();
    }

    public static function isSprintsEnabled(?string $workspaceId = null): bool
    {
        if ($workspaceId !== null && $workspaceId !== '') {
            $raw = DB::table('settings')
                ->where('key', "workspace.{$workspaceId}.enable_sprints")
                ->value('value');

            if ($raw !== null) {
                $decoded = is_string($raw) ? json_decode($raw, true) : $raw;

                return (bool) $decoded;
            }
        }

        return self::all()['enable_sprints_default'];
    }

    public static function setWorkspaceSprintsEnabled(string $workspaceId, bool $enabled): void
    {
        $now = now();
        $key = "workspace.{$workspaceId}.enable_sprints";
        $exists = DB::table('settings')->where('key', $key)->exists();

        if ($exists) {
            DB::table('settings')->where('key', $key)->update([
                'value' => json_encode($enabled),
                'type' => 'bool',
                'group' => 'workspace',
                'updated_at' => $now,
            ]);
        } else {
            DB::table('settings')->insert([
                'key' => $key,
                'value' => json_encode($enabled),
                'type' => 'bool',
                'group' => 'workspace',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    /**
     * @param  list<int>|null  $workingDays
     * @param  list<string>|null  $holidays
     */
    public static function addBusinessDays(
        CarbonImmutable $startDate,
        int $days,
        ?array $workingDays = null,
        ?array $holidays = null
    ): CarbonImmutable {
        if ($workingDays === null || $holidays === null) {
            $settings = self::all();
            $workingDays ??= $settings['working_days'];
            $holidays ??= $settings['holidays'];
        }

        if ($workingDays === []) {
            $workingDays = [1, 2, 3, 4, 5];
        }

        $current = $startDate->startOfDay();
        $remaining = max(0, $days);

        while ($remaining > 0) {
            $current = $current->addDay();
            if (in_array($current->dayOfWeekIso, $workingDays, true) && ! in_array($current->toDateString(), $holidays, true)) {
                $remaining--;
            }
        }

        return $current;
    }

    public static function calculateDefaultDueDate(string $priorityId, ?string $startDate = null): ?string
    {
        if ($priorityId === '') {
            return null;
        }

        $priority = DB::table('priorities')
            ->where('id', $priorityId)
            ->first(['id', 'slug']);

        if (! $priority) {
            return null;
        }

        $settings = self::all();
        $matrix = $settings['sla_days_by_priority'];
        $slug = strtolower((string) $priority->slug);

        $days = $matrix[(string) $priority->id] ?? $matrix[$slug] ?? null;

        if ($days === null || (int) $days <= 0) {
            return null;
        }

        $start = $startDate
            ? CarbonImmutable::parse($startDate)->startOfDay()
            : CarbonImmutable::now()->startOfDay();

        return self::addBusinessDays(
            $start,
            (int) $days,
            $settings['working_days'],
            $settings['holidays']
        )->toDateString();
    }

    public static function getSimilarityThreshold(): float
    {
        return self::all()['similarity_threshold'];
    }

    public static function getSlaWarningDays(): int
    {
        return self::all()['sla_warning_days'];
    }
}
