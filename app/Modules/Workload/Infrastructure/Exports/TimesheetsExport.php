<?php

declare(strict_types=1);

namespace App\Modules\Workload\Infrastructure\Exports;

use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

final class TimesheetsExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping
{
    /**
     * @param  Collection<int, \stdClass>  $rows
     */
    public function __construct(
        private readonly Collection $rows
    ) {}

    /**
     * @return Collection<int, \stdClass>
     */
    public function collection(): Collection
    {
        return $this->rows;
    }

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return [
            'Work Date',
            'Personnel Name',
            'Email',
            'Org Unit',
            'Project Key',
            'Project Name',
            'Sprint',
            'Issue Key',
            'Issue Title',
            'Issue Status',
            'Hours Logged',
            'Minutes Logged',
            'Work Description',
        ];
    }

    /**
     * @param  \stdClass  $row
     * @return array<int, mixed>
     */
    public function map($row): array
    {
        $workDate = '-';
        if (! empty($row->started_at)) {
            $workDate = CarbonImmutable::parse((string) $row->started_at)->format('Y-m-d');
        }

        $projectKey = (string) ($row->project_key ?? '');
        $issueNumber = $row->issue_number ?? null;
        $issueKey = ($projectKey !== '' && $issueNumber !== null)
            ? "{$projectKey}-{$issueNumber}"
            : (string) ($issueNumber ?? '-');

        $sprintName = (! empty($row->sprint_id) && ! empty($row->sprint_name))
            ? (string) $row->sprint_name
            : '-';

        $seconds = (int) ($row->time_spent_seconds ?? 0);
        $hours = round($seconds / 3600, 2);
        $minutes = (int) round($seconds / 60);

        return [
            $workDate,
            (string) ($row->user_name ?? '-'),
            (string) ($row->user_email ?? '-'),
            (string) ($row->org_unit_name ?? '-'),
            $projectKey !== '' ? $projectKey : '-',
            (string) ($row->project_name ?? '-'),
            $sprintName,
            $issueKey,
            (string) ($row->issue_title ?? '-'),
            (string) ($row->status_name ?? '-'),
            $hours,
            $minutes,
            (string) ($row->description ?? '-'),
        ];
    }
}
