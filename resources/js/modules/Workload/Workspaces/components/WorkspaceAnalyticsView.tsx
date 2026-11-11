import React, { useState } from 'react';
import { useWorkspaceAnalytics } from '@/hooks/useWorkspaceAnalytics';
import { DateRangeFilter, DateRangePreset } from '@/components/DateRangeFilter';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { BarChart } from '@/components/charts/BarChart';
import { ChartCardSkeleton } from '@/components/charts/ChartCardSkeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslate } from '@/hooks/useTranslate';
import { useIconSize } from '@/hooks/use-appearance';
import {
    FolderKanban,
    CheckCircle2,
    Clock,
    TrendingUp,
    Users,
    AlertCircle,
    Activity,
    Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WorkspaceAnalyticsViewProps {
    workspaceId: string;
    className?: string;
}

export function WorkspaceAnalyticsView({
    workspaceId,
    className,
}: WorkspaceAnalyticsViewProps) {
    const { t } = useTranslate();
    const { iconSize } = useIconSize();
    const [dateRange, setDateRange] = useState<DateRangePreset>('30d');
    const [customFrom, setCustomFrom] = useState<string | undefined>();
    const [customTo, setCustomTo] = useState<string | undefined>();
    const [timesheetMonth, setTimesheetMonth] = useState<string>(() =>
        new Date().toISOString().slice(0, 7),
    );

    const { data, isLoading, error } = useWorkspaceAnalytics({
        workspaceId,
        dateRange,
        from: customFrom,
        to: customTo,
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
                    <ChartCardSkeleton height={260} />
                    <ChartCardSkeleton height={260} />
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <Card className="p-8 text-center">
                <AlertCircle className="text-destructive mx-auto mb-3 h-10 w-10" />
                <h3 className="text-base font-semibold">
                    {t('Failed to load analytics')}
                </h3>
                <p className="text-muted-foreground mt-1 text-sm">
                    {t('Could not retrieve analytics data for this workspace.')}
                </p>
            </Card>
        );
    }

    const { summary, projects, throughput, member_workload } = data;

    const getHealthBadge = (health: string) => {
        switch (health) {
            case 'completed':
                return (
                    <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        {t('Completed')}
                    </Badge>
                );
            case 'on_track':
                return (
                    <Badge className="border-blue-500/30 bg-blue-500/15 text-blue-600 dark:text-blue-400">
                        {t('On Track')}
                    </Badge>
                );
            case 'delayed':
                return (
                    <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        {t('Delayed')}
                    </Badge>
                );
            case 'at_risk':
                return (
                    <Badge className="border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-400">
                        {t('At Risk')}
                    </Badge>
                );
            default:
                return <Badge variant="outline">{health}</Badge>;
        }
    };

    return (
        <div className={cn('space-y-6', className)}>
            {/* Header Toolbar */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h2 className="text-lg font-bold tracking-tight">
                        {t('Workspace Macro Analytics')}
                    </h2>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                        {t(
                            'Portfolio throughput, cross-project workload, and health performance.',
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
                                href={`/api/workspaces/${workspaceId}/timesheets/export?month=${encodeURIComponent(timesheetMonth)}&format=xlsx`}
                                download
                            >
                                <Download className="h-3.5 w-3.5" />
                                {t('Export Timesheet')}
                            </a>
                        </Button>
                    </div>
                    <DateRangeFilter
                        dateRange={dateRange}
                        from={customFrom}
                        to={customTo}
                        onChange={handleDateRangeChange}
                    />
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className={cardPadding}>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs font-medium">
                            {t('Active Projects')}
                        </span>
                        <FolderKanban className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className={cn('font-bold', kpiValSize)}>
                            {summary.active_projects}
                        </span>
                        <span className="text-muted-foreground text-xs">
                            / {summary.total_projects} {t('total')}
                        </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-[11px]">
                        {t('Across workspace portfolio')}
                    </p>
                </Card>

                <Card className={cardPadding}>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs font-medium">
                            {t('Completion Rate')}
                        </span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className={cn('font-bold', kpiValSize)}>
                            {summary.completion_rate}%
                        </span>
                        <span className="text-muted-foreground text-xs">
                            ({summary.completed_issues}/{summary.total_issues})
                        </span>
                    </div>
                    <div className="mt-2">
                        <Progress
                            value={summary.completion_rate}
                            className="h-1.5"
                        />
                    </div>
                </Card>

                <Card className={cardPadding}>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs font-medium">
                            {t('Estimated Hours')}
                        </span>
                        <Clock className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className={cn('font-bold', kpiValSize)}>
                            {summary.total_estimated_hours}h
                        </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-[11px]">
                        {t('Original estimated workload')}
                    </p>
                </Card>

                <Card className={cardPadding}>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs font-medium">
                            {t('Logged Hours')}
                        </span>
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className={cn('font-bold', kpiValSize)}>
                            {summary.total_logged_hours}h
                        </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-[11px]">
                        {t('Actual time recorded in worklogs')}
                    </p>
                </Card>
            </div>

            {/* Middle Grid: Throughput + Projects Health */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Portfolio Throughput */}
                <Card className="flex flex-col lg:col-span-7">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-semibold">
                                    {t('Portfolio Throughput')}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {t('Completed tasks delivered over time.')}
                                </CardDescription>
                            </div>
                            <Activity className="text-muted-foreground h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 pt-2">
                        <BarChart
                            data={throughput}
                            xKey="period"
                            dataKey="completed_count"
                            barColor="var(--chart-1)"
                            yAxisLabel={t('Tasks')}
                            emptyTitle={t('No Throughput Data')}
                            emptyMessage={t(
                                'No tasks completed within the selected period.',
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Project Progress & Health */}
                <Card className="flex flex-col lg:col-span-5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">
                            {t('Project Progress & Health')}
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {t('Status and issue progress per project.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 pt-2">
                        {projects.length === 0 ? (
                            <div className="text-muted-foreground flex h-48 flex-col items-center justify-center text-xs">
                                {t('No projects in this workspace')}
                            </div>
                        ) : (
                            <div className="max-h-[320px] space-y-3.5 overflow-y-auto pr-1">
                                {projects.map((proj) => (
                                    <div
                                        key={proj.id}
                                        className="bg-card/60 space-y-2 rounded-lg border p-2.5"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <span className="text-foreground block truncate text-xs font-semibold">
                                                    {proj.name}
                                                </span>
                                                <span className="text-muted-foreground font-mono text-[10px]">
                                                    {proj.key}
                                                </span>
                                            </div>
                                            <div className="shrink-0">
                                                {getHealthBadge(
                                                    proj.health_status,
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-muted-foreground flex justify-between text-[11px]">
                                                <span>
                                                    {proj.completed_issues} /{' '}
                                                    {proj.total_issues}{' '}
                                                    {t('Done')}
                                                </span>
                                                <span className="text-foreground font-medium">
                                                    {proj.progress_percent}%
                                                </span>
                                            </div>
                                            <Progress
                                                value={proj.progress_percent}
                                                className="h-1.5"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Section: Cross-Project Member Workload */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <Users className="text-primary h-4 w-4" />
                                <span>
                                    {t('Cross-Project Member Workload')}
                                </span>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {t(
                                    'Task volume, hours distribution, and capacity utilization.',
                                )}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {member_workload.length === 0 ? (
                        <div className="text-muted-foreground py-8 text-center text-xs">
                            {t('No team members assigned in this workspace.')}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-muted/50 text-muted-foreground border-b text-[11px] uppercase">
                                    <tr>
                                        <th className="px-3 py-2.5 font-semibold">
                                            {t('Team Member')}
                                        </th>
                                        <th className="px-3 py-2.5 text-center font-semibold">
                                            {t('Tasks Assigned')}
                                        </th>
                                        <th className="px-3 py-2.5 text-center font-semibold">
                                            {t('Tasks Done')}
                                        </th>
                                        <th className="px-3 py-2.5 text-right font-semibold">
                                            {t('Estimated')}
                                        </th>
                                        <th className="px-3 py-2.5 text-right font-semibold">
                                            {t('Logged')}
                                        </th>
                                        <th className="px-3 py-2.5 text-right font-semibold">
                                            {t('Capacity')}
                                        </th>
                                        <th className="px-3 py-2.5 text-right font-semibold">
                                            {t('Utilization')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-border/60 divide-y">
                                    {member_workload.map((m) => {
                                        const isOverloaded =
                                            m.utilization_rate > 100;
                                        return (
                                            <tr
                                                key={String(m.user_id)}
                                                className="hover:bg-muted/30 transition-colors"
                                            >
                                                <td className="text-foreground px-3 py-2.5 font-medium">
                                                    <div>{m.name}</div>
                                                    <div className="text-muted-foreground text-[10px]">
                                                        {m.email}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 text-center font-mono font-medium">
                                                    {m.task_count}
                                                </td>
                                                <td className="px-3 py-2.5 text-center font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                                    {m.completed_task_count}
                                                </td>
                                                <td className="text-muted-foreground px-3 py-2.5 text-right font-mono">
                                                    {m.estimated_hours}h
                                                </td>
                                                <td className="text-foreground px-3 py-2.5 text-right font-mono font-semibold">
                                                    {m.logged_hours}h
                                                </td>
                                                <td className="text-muted-foreground px-3 py-2.5 text-right font-mono">
                                                    {m.capacity_hours}h
                                                </td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center rounded px-2 py-0.5 font-mono text-[11px] font-semibold',
                                                            isOverloaded
                                                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                                                : m.utilization_rate >=
                                                                    75
                                                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                                                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                                                        )}
                                                    >
                                                        {m.utilization_rate}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
