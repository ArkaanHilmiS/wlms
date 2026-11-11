import { Head, router, usePage } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslate } from '@/hooks/useTranslate';
import {
    FolderKanban,
    CheckCircle2,
    ListTodo,
    AlertTriangle,
    Calendar,
    Activity,
    ArrowRight,
} from 'lucide-react';

interface DashboardStats {
    active_projects: number;
    total_issues: number;
    completed_issues: number;
    completion_rate: number;
    my_open_tasks: number;
    overdue_tasks: number;
}

interface DashboardTask {
    id: string;
    key: string;
    title: string;
    due_date: string | null;
    urgency: 'overdue' | 'today' | 'upcoming';
    project: {
        id: string;
        name: string;
        key: string;
        workspace_id: string;
    };
    status: {
        name: string;
        category: string;
        color?: string;
    };
    priority: {
        name: string;
        color?: string;
    };
}

interface DashboardActivity {
    id: string;
    action_type: string;
    old_value: string | null;
    new_value: string | null;
    created_at: string;
    issue_title: string;
    issue_number: number;
    project_id: string;
    project_key: string;
    project_name: string;
    actor_name: string | null;
}

export default function Dashboard() {
    const { t } = useTranslate();
    const { props } = usePage<any>();

    const stats: DashboardStats = {
        active_projects: props.stats?.active_projects ?? 0,
        total_issues: props.stats?.total_issues ?? 0,
        completed_issues: props.stats?.completed_issues ?? 0,
        completion_rate: props.stats?.completion_rate ?? 0,
        my_open_tasks: props.stats?.my_open_tasks ?? 0,
        overdue_tasks: props.stats?.overdue_tasks ?? 0,
    };

    const myTasks: DashboardTask[] = props.my_tasks ?? [];
    const recentActivities: DashboardActivity[] = props.recent_activities ?? [];

    const [urgencyFilter, setUrgencyFilter] = useState<
        'all' | 'overdue' | 'today' | 'upcoming'
    >('all');

    const filteredTasks = useMemo(() => {
        if (urgencyFilter === 'all') return myTasks;
        return myTasks.filter((task) => task.urgency === urgencyFilter);
    }, [myTasks, urgencyFilter]);

    return (
        <>
            <Head title={t('Dashboard')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {t('Dashboard')}
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            {t(
                                'Overview of your workspace health, personal tasks, and recent activity.',
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.visit('/issues')}
                        >
                            <ListTodo className="mr-1.5 h-4 w-4" />
                            {t('My Tasks')}
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => router.visit('/projects')}
                        >
                            <FolderKanban className="mr-1.5 h-4 w-4" />
                            {t('Projects')}
                        </Button>
                    </div>
                </div>

                {/* 4 Executive Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t('Active Projects')}
                            </CardTitle>
                            <FolderKanban className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.active_projects}
                            </div>
                            <p className="text-muted-foreground mt-1 text-xs">
                                {t('In accessible workspaces')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t('Completion Rate')}
                            </CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.completion_rate}%
                            </div>
                            <p className="text-muted-foreground mt-1 text-xs">
                                {stats.completed_issues}/{stats.total_issues}{' '}
                                {t('completed')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t('My Open Tasks')}
                            </CardTitle>
                            <ListTodo className="text-primary h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.my_open_tasks}
                            </div>
                            <p className="text-muted-foreground mt-1 text-xs">
                                {t('Assigned to you')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card
                        className={
                            stats.overdue_tasks > 0
                                ? 'border-destructive/50 bg-destructive/5'
                                : ''
                        }
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t('Overdue Tasks')}
                            </CardTitle>
                            <AlertTriangle
                                className={`h-4 w-4 ${stats.overdue_tasks > 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                            />
                        </CardHeader>
                        <CardContent>
                            <div
                                className={`text-2xl font-bold ${stats.overdue_tasks > 0 ? 'text-destructive' : ''}`}
                            >
                                {stats.overdue_tasks}
                            </div>
                            <p className="text-muted-foreground mt-1 text-xs">
                                {t('Require immediate attention')}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main 2-Column Grid */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left 2 Columns: My Assigned Tasks */}
                    <Card className="flex flex-col lg:col-span-2">
                        <CardHeader className="flex flex-col justify-between gap-3 border-b pb-4 sm:flex-row sm:items-center">
                            <div>
                                <CardTitle className="text-base">
                                    {t('My Assigned Tasks')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Your open tasks ordered by due date')}
                                </CardDescription>
                            </div>
                            <div className="bg-muted/60 flex items-center gap-1 rounded-lg border p-1">
                                {(
                                    [
                                        'all',
                                        'overdue',
                                        'today',
                                        'upcoming',
                                    ] as const
                                ).map((tab) => (
                                    <Button
                                        key={tab}
                                        variant={
                                            urgencyFilter === tab
                                                ? 'default'
                                                : 'ghost'
                                        }
                                        size="sm"
                                        className="h-7 px-2.5 text-xs capitalize"
                                        onClick={() => setUrgencyFilter(tab)}
                                    >
                                        {t(
                                            tab === 'all'
                                                ? 'All'
                                                : tab === 'overdue'
                                                  ? 'Overdue'
                                                  : tab === 'today'
                                                    ? 'Today'
                                                    : 'Upcoming',
                                        )}
                                    </Button>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0">
                            {filteredTasks.length === 0 ? (
                                <div className="text-muted-foreground flex flex-col items-center justify-center px-4 py-12 text-center text-sm">
                                    <CheckCircle2 className="text-muted-foreground/50 mb-2 h-8 w-8" />
                                    <p>
                                        {t(
                                            'No open tasks matching this filter.',
                                        )}
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {filteredTasks.map((task) => (
                                        <div
                                            key={task.id}
                                            onClick={() =>
                                                router.visit(
                                                    `/projects/${task.project.id}`,
                                                )
                                            }
                                            className="hover:bg-muted/40 flex cursor-pointer flex-col justify-between gap-2 p-4 transition-colors sm:flex-row sm:items-center"
                                        >
                                            <div className="min-w-0 space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className="font-mono text-[11px]"
                                                    >
                                                        {task.key}
                                                    </Badge>
                                                    <span className="truncate text-sm font-medium">
                                                        {task.title}
                                                    </span>
                                                </div>
                                                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                                                    <span>
                                                        {task.project.name}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                                                <Badge
                                                    variant="secondary"
                                                    className="text-xs font-normal"
                                                >
                                                    {task.priority.name}
                                                </Badge>
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs font-normal"
                                                >
                                                    {task.status.name}
                                                </Badge>
                                                {task.due_date && (
                                                    <Badge
                                                        variant={
                                                            task.urgency ===
                                                            'overdue'
                                                                ? 'destructive'
                                                                : 'outline'
                                                        }
                                                        className="flex items-center gap-1 text-xs font-normal"
                                                    >
                                                        <Calendar className="h-3 w-3" />
                                                        {task.due_date}
                                                    </Badge>
                                                )}
                                                <ArrowRight className="text-muted-foreground hidden h-4 w-4 sm:inline" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Right 1 Column: Recent Activity */}
                    <Card className="flex flex-col lg:col-span-1">
                        <CardHeader className="border-b pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">
                                    {t('Recent Activity')}
                                </CardTitle>
                                <Activity className="text-muted-foreground h-4 w-4" />
                            </div>
                            <CardDescription>
                                {t('Latest updates across your projects')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 p-0">
                            {recentActivities.length === 0 ? (
                                <div className="text-muted-foreground flex flex-col items-center justify-center px-4 py-12 text-center text-sm">
                                    <Activity className="text-muted-foreground/50 mb-2 h-8 w-8" />
                                    <p>
                                        {t('No recent activity recorded yet.')}
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {recentActivities.map((act) => (
                                        <div
                                            key={act.id}
                                            onClick={() =>
                                                router.visit(
                                                    `/projects/${act.project_id}`,
                                                )
                                            }
                                            className="hover:bg-muted/40 cursor-pointer space-y-1 p-4 transition-colors"
                                        >
                                            <div className="flex items-center justify-between gap-2 text-xs">
                                                <span className="text-foreground font-semibold">
                                                    {act.actor_name ||
                                                        t('System')}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    {new Date(
                                                        act.created_at,
                                                    ).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-muted-foreground text-xs">
                                                <span className="capitalize">
                                                    {act.action_type.replace(
                                                        /_/g,
                                                        ' ',
                                                    )}
                                                </span>
                                                {act.new_value
                                                    ? ` → ${act.new_value}`
                                                    : ''}
                                            </p>
                                            <div className="text-foreground truncate text-xs font-medium">
                                                <span className="text-primary mr-1.5 font-mono">
                                                    {act.project_key}-
                                                    {act.issue_number}
                                                </span>
                                                {act.issue_title}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
    ],
};
