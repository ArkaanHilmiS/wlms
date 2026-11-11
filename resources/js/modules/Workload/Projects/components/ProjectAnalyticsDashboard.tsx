import React, { useState } from 'react';
import { useProjectAnalytics } from '@/hooks/useProjectAnalytics';
import { DateRangeFilter, DateRangePreset } from '@/components/DateRangeFilter';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { CumulativeFlowChart } from '@/components/charts/CumulativeFlowChart';
import { LeadTimeHistogram } from '@/components/charts/LeadTimeHistogram';
import { DonutDistributionChart } from '@/components/charts/DonutDistributionChart';
import { BurndownVelocityChart } from '@/components/charts/BurndownVelocityChart';
import { ChartCardSkeleton } from '@/components/charts/ChartCardSkeleton';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTranslate } from '@/hooks/useTranslate';
import { useIconSize } from '@/hooks/use-appearance';
import {
    CheckCircle2,
    Clock,
    Layers,
    AlertCircle,
    Flame,
    Sparkles,
    ListFilter,
    Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProjectAnalyticsDashboardProps {
    projectId: string;
    className?: string;
}

export function ProjectAnalyticsDashboard({
    projectId,
    className,
}: ProjectAnalyticsDashboardProps) {
    const { t } = useTranslate();
    const { iconSize } = useIconSize();

    const [dateRange, setDateRange] = useState<DateRangePreset>('30d');
    const [customFrom, setCustomFrom] = useState<string | undefined>();
    const [customTo, setCustomTo] = useState<string | undefined>();
    const [selectedSprintId, setSelectedSprintId] = useState<
        string | undefined
    >();
    const [timeMetricMode, setTimeMetricMode] = useState<'lead' | 'cycle'>(
        'lead',
    );
    const [breakdownMode, setBreakdownMode] = useState<'type' | 'priority'>(
        'type',
    );
    const [timesheetMonth, setTimesheetMonth] = useState<string>(() =>
        new Date().toISOString().slice(0, 7),
    );

    const { data, isLoading, error } = useProjectAnalytics({
        projectId,
        dateRange,
        from: customFrom,
        to: customTo,
        sprintId: selectedSprintId,
    });

    const handleDateRangeChange = (params: {
        dateRange: DateRangePreset;
        from?: string;
        to?: string;
    }) => {
        setDateRange(params.dateRange);
        setCustomFrom(params.from);
        setCustomTo(params.to);
    };

    const cardPadding =
        iconSize === 'sm' ? 'p-3' : iconSize === 'lg' ? 'p-5' : 'p-4';

    const kpiValSize =
        iconSize === 'sm'
            ? 'text-xl'
            : iconSize === 'lg'
              ? 'text-3xl'
              : 'text-2xl';

    const toggleBtnSize =
        iconSize === 'sm'
            ? 'h-6 text-[11px] px-2'
            : iconSize === 'lg'
              ? 'h-8 text-xs px-3'
              : 'h-7 text-xs px-2.5';

    if (isLoading) {
        return (
            <div className={cn('space-y-6', className)}>
                <div className="flex items-center justify-between gap-4">
                    <div className="bg-muted h-8 w-48 animate-pulse rounded" />
                    <div className="bg-muted h-8 w-64 animate-pulse rounded" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="bg-card h-24 animate-pulse rounded-xl border"
                        />
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <ChartCardSkeleton height={280} />
                    <ChartCardSkeleton height={280} />
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <Card className="p-8 text-center">
                <AlertCircle className="text-destructive mx-auto mb-3 h-10 w-10" />
                <h3 className="text-base font-semibold">
                    {t('Failed to load project analytics')}
                </h3>
                <p className="text-muted-foreground mt-1 text-sm">
                    {t(
                        'Could not retrieve analytics metrics for this project.',
                    )}
                </p>
            </Card>
        );
    }

    const {
        summary,
        lead_time,
        cycle_time,
        cumulative_flow,
        issue_types,
        priorities,
        sprint_metrics,
    } = data;

    const timeMetrics = timeMetricMode === 'lead' ? lead_time : cycle_time;

    const donutData =
        breakdownMode === 'type'
            ? issue_types.map((it) => ({
                  label: it.name,
                  value: it.count,
                  color: it.color || 'var(--chart-1)',
              }))
            : priorities.map((p) => ({
                  label: p.name,
                  value: p.count,
                  color: p.color || 'var(--chart-2)',
              }));

    const burndownFormatted = sprint_metrics.burndown.map((b) => ({
        day: b.day,
        ideal_points: b.ideal_points,
        actual_points: b.actual_points ?? 0,
    }));

    const velocityFormatted = sprint_metrics.velocity.map((v) => ({
        sprint_name: v.sprint_name,
        completed_points: v.completed_points,
        target_points: v.committed_points,
    }));

    return (
        <div className={cn('space-y-6', className)}>
            {/* Header Toolbar */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h2 className="text-lg font-bold tracking-tight">
                        {t('Project Deep-Dive Analytics')}
                    </h2>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                        {t(
                            'Cycle time, cumulative flow, distribution, and sprint burndown/velocity.',
                        )}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-1.5">
                        <input
                            type="month"
                            value={timesheetMonth}
                            onChange={(e) => setTimesheetMonth(e.target.value)}
                            className="border-input bg-background ring-offset-background focus-visible:ring-ring h-8 rounded-md border px-2 text-xs focus-visible:ring-1 focus-visible:outline-none"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            asChild
                        >
                            <a
                                href={`/api/projects/${projectId}/timesheets/export?month=${encodeURIComponent(timesheetMonth)}&format=xlsx`}
                                download
                            >
                                <Download className="h-3.5 w-3.5" />
                                {t('Export Timesheet')}
                            </a>
                        </Button>
                    </div>

                    {sprint_metrics.has_sprints && (
                        <Select
                            value={selectedSprintId || 'all'}
                            onValueChange={(val) =>
                                setSelectedSprintId(
                                    val === 'all' ? undefined : val,
                                )
                            }
                        >
                            <SelectTrigger className="h-8 w-44 text-xs">
                                <SelectValue
                                    placeholder={t('All Sprints')}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    {t('Active / Latest Sprint')}
                                </SelectItem>
                                <SelectItem value="non_sprint">
                                    {t('Non-Sprint (Period Flow)')}
                                </SelectItem>
                                {sprint_metrics.mode !== 'non_sprint' &&
                                    sprint_metrics.velocity.map((v) => (
                                        <SelectItem
                                            key={v.sprint_id}
                                            value={v.sprint_id}
                                        >
                                            {v.sprint_name}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    )}

                    <DateRangeFilter
                        dateRange={dateRange}
                        from={customFrom}
                        to={customTo}
                        onChange={handleDateRangeChange}
                    />
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div
                className={cn(
                    'grid grid-cols-1 gap-4 sm:grid-cols-2',
                    summary.overdue_issues !== undefined
                        ? 'lg:grid-cols-5'
                        : 'lg:grid-cols-4',
                )}
            >
                <Card className={cardPadding}>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs font-medium">
                            {t('Total Issues')}
                        </span>
                        <Layers className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className={cn('font-bold', kpiValSize)}>
                            {summary.total_issues}
                        </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-[11px]">
                        {t('All issues in this project')}
                    </p>
                </Card>

                <Card className={cardPadding}>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs font-medium">
                            {t('Completed')}
                        </span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span
                            className={cn(
                                'font-bold text-emerald-600 dark:text-emerald-400',
                                kpiValSize,
                            )}
                        >
                            {summary.completed_issues}
                        </span>
                        <span className="text-muted-foreground font-mono text-xs">
                            ({summary.completion_rate}%)
                        </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-[11px]">
                        {t('Delivered successfully')}
                    </p>
                </Card>

                <Card className={cardPadding}>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs font-medium">
                            {t('In Progress')}
                        </span>
                        <Flame className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span
                            className={cn(
                                'font-bold text-amber-600 dark:text-amber-400',
                                kpiValSize,
                            )}
                        >
                            {summary.in_progress_issues}
                        </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-[11px]">
                        {t('Currently active in workflow')}
                    </p>
                </Card>

                <Card className={cardPadding}>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs font-medium">
                            {t('To Do Backlog')}
                        </span>
                        <Clock className="text-muted-foreground h-4 w-4" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className={cn('font-bold', kpiValSize)}>
                            {summary.todo_issues}
                        </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-[11px]">
                        {t('Waiting to be started')}
                    </p>
                </Card>

                {summary.overdue_issues !== undefined && (
                    <Card
                        className={cn(
                            cardPadding,
                            summary.overdue_issues > 0 &&
                                'border-red-500/30 bg-red-500/5',
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-xs font-medium">
                                {t('Overdue')}
                            </span>
                            <AlertCircle className="h-4 w-4 text-red-500" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span
                                className={cn(
                                    'font-bold text-red-600 dark:text-red-400',
                                    kpiValSize,
                                )}
                            >
                                {summary.overdue_issues}
                            </span>
                        </div>
                        <p className="text-muted-foreground mt-1 text-[11px]">
                            {t('Past due date & unresolved')}
                        </p>
                    </Card>
                )}
            </div>

            {/* Row 2: Delivery Speed Histogram & Cumulative Flow */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Lead / Cycle Time */}
                <Card className="flex flex-col lg:col-span-6">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-semibold">
                                    {timeMetricMode === 'lead'
                                        ? t('Lead Time Distribution')
                                        : t('Cycle Time Distribution')}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {timeMetricMode === 'lead'
                                        ? t(
                                              'Time from issue creation to completion.',
                                          )
                                        : t(
                                              'Time from active work start to completion.',
                                          )}
                                </CardDescription>
                            </div>
                            <div className="bg-muted/40 flex items-center rounded-lg border p-0.5">
                                <Button
                                    variant={
                                        timeMetricMode === 'lead'
                                            ? 'default'
                                            : 'ghost'
                                    }
                                    size="sm"
                                    className={cn(toggleBtnSize, 'rounded-md')}
                                    onClick={() => setTimeMetricMode('lead')}
                                >
                                    {t('Lead Time')}
                                </Button>
                                <Button
                                    variant={
                                        timeMetricMode === 'cycle'
                                            ? 'default'
                                            : 'ghost'
                                    }
                                    size="sm"
                                    className={cn(toggleBtnSize, 'rounded-md')}
                                    onClick={() => setTimeMetricMode('cycle')}
                                >
                                    {t('Cycle Time')}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 pt-2">
                        <LeadTimeHistogram
                            data={timeMetrics.distribution}
                            averageDays={timeMetrics.average_days}
                            medianDays={timeMetrics.median_days}
                            p85Days={timeMetrics.p85_days}
                            metricLabel={
                                timeMetricMode === 'lead'
                                    ? t('Lead Time')
                                    : t('Cycle Time')
                            }
                            barColor={
                                timeMetricMode === 'lead'
                                    ? 'var(--chart-1)'
                                    : 'var(--chart-2)'
                            }
                            emptyTitle={t('No Delivery Time Data')}
                            emptyMessage={t(
                                'Complete issues to see lead time & cycle time statistics.',
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Cumulative Flow Diagram */}
                <Card className="flex flex-col lg:col-span-6">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-semibold">
                                    {t('Cumulative Flow (CFD)')}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {t(
                                        'Work in progress bottlenecks and flow stability over time.',
                                    )}
                                </CardDescription>
                            </div>
                            <Sparkles className="text-muted-foreground h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 pt-2">
                        <CumulativeFlowChart
                            data={cumulative_flow}
                            xKey="date"
                            emptyTitle={t('No Flow Data')}
                            emptyMessage={t(
                                'No issues found in this date range.',
                            )}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Row 3: Breakdowns & Sprint Velocity */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Distribution Breakdown (Type / Priority) */}
                <Card className="flex flex-col lg:col-span-6">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-semibold">
                                    {breakdownMode === 'type'
                                        ? t('Issue Types Breakdown')
                                        : t('Priority Breakdown')}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {t(
                                        'Proportional breakdown of project issues.',
                                    )}
                                </CardDescription>
                            </div>
                            <div className="bg-muted/40 flex items-center rounded-lg border p-0.5">
                                <Button
                                    variant={
                                        breakdownMode === 'type'
                                            ? 'default'
                                            : 'ghost'
                                    }
                                    size="sm"
                                    className={cn(toggleBtnSize, 'rounded-md')}
                                    onClick={() => setBreakdownMode('type')}
                                >
                                    {t('Types')}
                                </Button>
                                <Button
                                    variant={
                                        breakdownMode === 'priority'
                                            ? 'default'
                                            : 'ghost'
                                    }
                                    size="sm"
                                    className={cn(toggleBtnSize, 'rounded-md')}
                                    onClick={() => setBreakdownMode('priority')}
                                >
                                    {t('Priorities')}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 pt-2">
                        <DonutDistributionChart
                            data={donutData}
                            centerLabel={t('Total')}
                            centerValue={summary.total_issues}
                            emptyTitle={t('No Breakdown Data')}
                            emptyMessage={t('No issues available to classify.')}
                        />
                    </CardContent>
                </Card>

                {/* Sprint Burndown & Velocity */}
                <Card className="flex flex-col lg:col-span-6">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-semibold">
                                    {sprint_metrics.has_sprints &&
                                    sprint_metrics.mode !== 'non_sprint'
                                        ? t('Sprint Burndown & Velocity')
                                        : t('Period Progress & Velocity')}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {sprint_metrics.has_sprints &&
                                    sprint_metrics.mode !== 'non_sprint'
                                        ? t(
                                              'Ideal vs actual story points burndown and sprint velocity.',
                                          )
                                        : t(
                                              'Period burndown and weekly delivery velocity (Sprint-Agnostic).',
                                          )}
                                </CardDescription>
                            </div>
                            <ListFilter className="text-muted-foreground h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 pt-2">
                        {burndownFormatted.length > 0 ||
                        velocityFormatted.length > 0 ? (
                            <BurndownVelocityChart
                                burndownData={burndownFormatted}
                                velocityData={velocityFormatted}
                                emptyTitle={t('No Progress Metrics')}
                                emptyMessage={t(
                                    'No progress history available for this project.',
                                )}
                            />
                        ) : (
                            <div className="text-muted-foreground flex h-56 flex-col items-center justify-center p-6 text-center">
                                <CheckCircle2 className="text-primary/40 mb-2 h-8 w-8" />
                                <p className="text-foreground text-sm font-semibold">
                                    {t('Continuous Kanban Flow')}
                                </p>
                                <p className="text-muted-foreground mt-1 max-w-sm text-xs">
                                    {t(
                                        'This project uses continuous flow. Track completion rates and lead times above for team velocity.',
                                    )}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
