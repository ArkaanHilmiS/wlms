<?php

declare(strict_types=1);

namespace App\Modules\Workload\Infrastructure\Exports;

use App\Modules\Workload\Infrastructure\Persistence\Eloquent\Models\IssueModel;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

final class IssuesExport implements FromQuery, ShouldAutoSize, WithHeadings, WithMapping
{
    /**
     * @param  Builder<IssueModel>  $query
     */
    public function __construct(
        private readonly Builder $query
    ) {}

    public function query(): Builder
    {
        return $this->query->orderBy('created_at', 'desc')->limit(5000);
    }

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return [
            'Issue Key',
            'Title',
            'Project',
            'Type',
            'Priority',
            'Status',
            'Status Category',
            'Assignee',
            'Reporter',
            'Sprint',
            'Original Estimate (Hours)',
            'Remaining Estimate (Hours)',
            'Start Date',
            'Due Date',
            'SLA Status',
            'Created At',
        ];
    }

    /**
     * @param  IssueModel  $issue
     * @return array<int, mixed>
     */
    public function map($issue): array
    {
        $key = $issue->project ? "{$issue->project->key}-{$issue->number}" : (string) $issue->number;
        $origHours = $issue->original_estimate_seconds ? round($issue->original_estimate_seconds / 3600, 2) : 0;
        $remHours = $issue->remaining_estimate_seconds ? round($issue->remaining_estimate_seconds / 3600, 2) : 0;

        $slaStatus = '-';
        if ($issue->due_date) {
            $isDone = strtoupper((string) ($issue->status?->category ?? '')) === 'DONE';
            $isOverdue = ! $isDone && $issue->due_date->copy()->startOfDay()->lt(now()->startOfDay());
            $slaStatus = $isOverdue ? 'Overdue' : 'On Track';
        }

        return [
            $key,
            $issue->title,
            $issue->project->name ?? '-',
            $issue->type->name ?? '-',
            $issue->priority->name ?? '-',
            $issue->status->name ?? '-',
            $issue->status->category ?? '-',
            $issue->assignee->name ?? 'Unassigned',
            $issue->reporter->name ?? '-',
            $issue->sprint->name ?? '-',
            $origHours,
            $remHours,
            $issue->start_date ? $issue->start_date->format('Y-m-d') : '-',
            $issue->due_date ? $issue->due_date->format('Y-m-d') : '-',
            $slaStatus,
            $issue->created_at ? $issue->created_at->format('Y-m-d H:i') : '-',
        ];
    }
}
