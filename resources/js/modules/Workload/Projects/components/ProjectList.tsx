import { useState, useMemo } from 'react';
import {
    MoreHorizontal,
    Plus,
    Pencil,
    Trash,
    Search,
    LayoutGrid,
    List,
    Calendar,
} from 'lucide-react';
import { Project } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, usePage } from '@inertiajs/react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Combobox } from '@/components/ui/combobox';
import { PriorityBadge } from '@/components/PriorityBadge';
import { Progress } from '@/components/ui/progress';
import { useTranslate } from '@/hooks/useTranslate';
import { useIconSize, IconSize } from '@/hooks/use-appearance';

const getProjectAvatarColor = (name: string) => {
    const colors = [
        'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

export function ProjectList({
    projects,
    canManageProjects,
    canCreateProjects,
    canEditOwnProjects,
    canDeleteOwnProjects,
    priorities,
    onEdit,
    onDelete,
    onCreate,
}: {
    projects: Project[];
    canManageProjects: boolean;
    canCreateProjects?: boolean;
    canEditOwnProjects?: boolean;
    canDeleteOwnProjects?: boolean;
    priorities?: { id: string; name: string; category: string }[];
    onEdit: (project: Project) => void;
    onDelete: (project: Project) => void;
    onCreate: () => void;
}) {
    const { t } = useTranslate();
    // Kerapatan (S/M/L) kini hanya diatur global di Pengaturan > Tampilan.
    const { iconSize } = useIconSize();
    const pageProps = usePage().props as {
        auth?: { user?: { id?: number | string } };
    };
    const currentUserId = pageProps.auth?.user?.id;

    const allowCreate = canCreateProjects ?? canManageProjects;
    const canEditProjectItem = (project: Project): boolean => {
        if (canManageProjects) return true;
        if (!canEditOwnProjects) return false;
        return (
            project.lead_id !== undefined &&
            project.lead_id !== null &&
            currentUserId !== undefined &&
            String(project.lead_id) === String(currentUserId)
        );
    };
    const canDeleteProjectItem = (project: Project): boolean => {
        if (canManageProjects) return true;
        if (!canDeleteOwnProjects) return false;
        return (
            project.lead_id !== undefined &&
            project.lead_id !== null &&
            currentUserId !== undefined &&
            String(project.lead_id) === String(currentUserId)
        );
    };
    const hasAnyRowAction =
        canManageProjects ||
        Boolean(canEditOwnProjects) ||
        Boolean(canDeleteOwnProjects);
    const [searchQuery, setSearchQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('all');

    const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('wlms_projects_view_mode') as
                | 'grid'
                | 'table';
            if (saved === 'grid' || saved === 'table') return saved;
        }
        return 'grid';
    });

    const handleViewModeChange = (mode: 'grid' | 'table') => {
        setViewMode(mode);
        if (typeof window !== 'undefined') {
            localStorage.setItem('wlms_projects_view_mode', mode);
        }
    };

    const filteredProjects = useMemo(() => {
        return projects.filter((p) => {
            const matchesSearch =
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.key.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesPriority =
                priorityFilter === 'all' ||
                p.priority_id === priorityFilter ||
                (priorityFilter === 'none' && !p.priority_id);
            return matchesSearch && matchesPriority;
        });
    }, [projects, searchQuery, priorityFilter]);

    const priorityOptions = [
        { value: 'all', label: t('All Priorities') },
        { value: 'none', label: t('No Priority') },
        ...(priorities || []).map((p) => ({ value: p.id, label: t(p.name) })),
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-2">
                    <div className="relative w-full sm:w-72">
                        <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                        <Input
                            type="search"
                            placeholder={t('Search projects...')}
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="w-44 shrink-0">
                        <Combobox
                            options={priorityOptions}
                            value={priorityFilter}
                            onChange={setPriorityFilter}
                            placeholder={t('Filter by priority...')}
                        />
                    </div>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-2">
                    <div className="bg-muted/40 flex items-center rounded-md border p-0.5">
                        <Button
                            variant={
                                viewMode === 'grid' ? 'secondary' : 'ghost'
                            }
                            size="sm"
                            className="h-8 px-2.5"
                            onClick={() => handleViewModeChange('grid')}
                            title={t('Grid View')}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={
                                viewMode === 'table' ? 'secondary' : 'ghost'
                            }
                            size="sm"
                            className="h-8 px-2.5"
                            onClick={() => handleViewModeChange('table')}
                            title={t('Table View')}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>

                    {allowCreate && (
                        <Button onClick={onCreate} size="sm" className="h-9">
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Create Project')}
                        </Button>
                    )}
                </div>
            </div>

            {filteredProjects.length === 0 ? (
                <Card>
                    <CardContent className="text-muted-foreground flex h-32 flex-col items-center justify-center">
                        <p>
                            {projects.length === 0
                                ? t('No projects found in this workspace.')
                                : t('No projects match your search.')}
                        </p>
                    </CardContent>
                </Card>
            ) : viewMode === 'grid' ? (
                <div
                    className={`grid items-stretch gap-4 ${
                        iconSize === 'sm'
                            ? 'grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
                            : iconSize === 'lg'
                              ? 'grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'
                              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    }`}
                >
                    {filteredProjects.map((project) => {
                        const total = project.total_issues_count || 0;
                        const completed = project.completed_issues_count || 0;
                        const pct =
                            total > 0
                                ? Math.round((completed / total) * 100)
                                : 0;
                        const avatarColor = getProjectAvatarColor(project.name);

                        const avatarSizeClass =
                            iconSize === 'sm'
                                ? 'h-7 w-7 text-xs rounded-md'
                                : iconSize === 'lg'
                                  ? 'h-12 w-12 text-base rounded-xl font-bold'
                                  : 'h-9 w-9 text-sm rounded-lg';

                        const titleSizeClass =
                            iconSize === 'sm'
                                ? 'text-sm font-semibold'
                                : iconSize === 'lg'
                                  ? 'text-lg font-bold'
                                  : 'text-base font-semibold';

                        const cardHeaderPadding =
                            iconSize === 'sm'
                                ? 'p-3 pb-1.5'
                                : iconSize === 'lg'
                                  ? 'p-6 pb-3'
                                  : 'p-5 pb-2';

                        const cardContentPadding =
                            iconSize === 'sm'
                                ? 'p-3 pt-0 text-xs'
                                : iconSize === 'lg'
                                  ? 'p-6 pt-0 text-sm'
                                  : 'p-5 pt-0 text-sm';

                        return (
                            <Card
                                key={project.id}
                                className="hover:border-primary/50 flex h-full flex-col transition-colors"
                            >
                                <CardHeader
                                    className={`flex flex-row items-start justify-between space-y-0 ${cardHeaderPadding}`}
                                >
                                    <div className="flex min-w-0 flex-1 items-start gap-3">
                                        <div
                                            className={`flex shrink-0 items-center justify-center border font-bold ${avatarSizeClass} ${avatarColor}`}
                                        >
                                            {project.name
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <Link
                                                href={`/projects/${project.id}`}
                                            >
                                                <CardTitle
                                                    className={`${titleSizeClass} hover:text-primary line-clamp-1 cursor-pointer hover:underline`}
                                                    title={project.name}
                                                >
                                                    {project.name}
                                                </CardTitle>
                                            </Link>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <CardDescription className="font-mono text-xs">
                                                    {t('Key')}: {project.key}
                                                </CardDescription>
                                                {project.priority_id &&
                                                    priorities && (
                                                        <PriorityBadge
                                                            name={
                                                                priorities.find(
                                                                    (p) =>
                                                                        p.id ===
                                                                        project.priority_id,
                                                                )?.name ||
                                                                'Unknown'
                                                            }
                                                            category={
                                                                priorities.find(
                                                                    (p) =>
                                                                        p.id ===
                                                                        project.priority_id,
                                                                )?.category
                                                            }
                                                            size={iconSize}
                                                        />
                                                    )}
                                            </div>
                                        </div>
                                    </div>
                                    {(canEditProjectItem(project) ||
                                        canDeleteProjectItem(project)) && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    className="ml-1 h-8 w-8 shrink-0 p-0"
                                                >
                                                    <span className="sr-only">
                                                        {t('Open menu')}
                                                    </span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {canEditProjectItem(
                                                    project,
                                                ) && (
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            onEdit(project)
                                                        }
                                                    >
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        {t('Edit')}
                                                    </DropdownMenuItem>
                                                )}
                                                {canDeleteProjectItem(
                                                    project,
                                                ) && (
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() =>
                                                            onDelete(project)
                                                        }
                                                    >
                                                        <Trash className="mr-2 h-4 w-4" />
                                                        {t('Delete')}
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </CardHeader>
                                <CardContent
                                    className={`mt-1 flex flex-1 flex-col justify-between ${cardContentPadding}`}
                                >
                                    <div>
                                        {project.description && (
                                            <p
                                                className={`text-muted-foreground ${iconSize === 'sm' ? 'line-clamp-1 text-xs' : iconSize === 'lg' ? 'line-clamp-3 text-sm' : 'line-clamp-2 text-sm'}`}
                                                title={project.description}
                                            >
                                                {project.description}
                                            </p>
                                        )}
                                        {(project.start_date ||
                                            project.end_date) && (
                                            <div
                                                className={`text-muted-foreground flex items-center gap-1.5 ${iconSize === 'sm' ? 'mt-1.5 text-[11px]' : 'mt-2.5 text-xs'}`}
                                            >
                                                <Calendar
                                                    className={`${iconSize === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'}`}
                                                />
                                                <span>
                                                    {project.start_date ||
                                                        '...'}{' '}
                                                    →{' '}
                                                    {project.end_date || '...'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {project.total_issues_count !==
                                        undefined && (
                                        <div
                                            className={`border-border/50 space-y-1 border-t ${iconSize === 'sm' ? 'mt-2 pt-1.5' : iconSize === 'lg' ? 'mt-4 pt-3' : 'mt-3 pt-2'}`}
                                        >
                                            <div className="text-muted-foreground flex items-center justify-between text-xs">
                                                <span>{t('Progress')}</span>
                                                <span className="font-medium">
                                                    {completed} / {total} ({pct}
                                                    %)
                                                </span>
                                            </div>
                                            <Progress
                                                value={pct}
                                                className={
                                                    iconSize === 'sm'
                                                        ? 'h-1'
                                                        : iconSize === 'lg'
                                                          ? 'h-2'
                                                          : 'h-1.5'
                                                }
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-card overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Project')}</TableHead>
                                <TableHead className="w-[100px]">
                                    {t('Key')}
                                </TableHead>
                                <TableHead className="w-[140px]">
                                    {t('Priority')}
                                </TableHead>
                                <TableHead className="w-[200px]">
                                    {t('Progress')}
                                </TableHead>
                                <TableHead className="w-[180px]">
                                    {t('Timeline')}
                                </TableHead>
                                {hasAnyRowAction && (
                                    <TableHead className="w-[70px] text-right">
                                        {t('Actions')}
                                    </TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProjects.map((project) => {
                                const total = project.total_issues_count || 0;
                                const completed =
                                    project.completed_issues_count || 0;
                                const pct =
                                    total > 0
                                        ? Math.round((completed / total) * 100)
                                        : 0;
                                const avatarColor = getProjectAvatarColor(
                                    project.name,
                                );
                                const priority = priorities?.find(
                                    (p) => p.id === project.priority_id,
                                );

                                const tableAvatarSizeClass =
                                    iconSize === 'sm'
                                        ? 'h-6 w-6 text-[10px] rounded'
                                        : iconSize === 'lg'
                                          ? 'h-10 w-10 text-sm rounded-lg'
                                          : 'h-8 w-8 text-xs rounded-md';

                                return (
                                    <TableRow
                                        key={project.id}
                                        className={`hover:bg-muted/50 ${iconSize === 'sm' ? 'h-11' : iconSize === 'lg' ? 'h-16' : 'h-14'}`}
                                    >
                                        <TableCell>
                                            <Link
                                                href={`/projects/${project.id}`}
                                                className="group flex items-center gap-3"
                                            >
                                                <div
                                                    className={`flex shrink-0 items-center justify-center border font-semibold ${tableAvatarSizeClass} ${avatarColor}`}
                                                >
                                                    {project.name
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <span
                                                        className={`text-foreground group-hover:text-primary font-medium group-hover:underline ${iconSize === 'sm' ? 'text-xs' : 'text-sm'}`}
                                                    >
                                                        {project.name}
                                                    </span>
                                                    {project.description && (
                                                        <p className="text-muted-foreground line-clamp-1 text-xs">
                                                            {
                                                                project.description
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs font-semibold">
                                            {project.key}
                                        </TableCell>
                                        <TableCell>
                                            {project.priority_id && priority ? (
                                                <PriorityBadge
                                                    name={priority.name}
                                                    category={priority.category}
                                                    size={iconSize}
                                                />
                                            ) : (
                                                <span className="text-muted-foreground text-xs">
                                                    -
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="text-muted-foreground flex justify-between text-xs">
                                                    <span>
                                                        {completed}/{total}
                                                    </span>
                                                    <span className="font-medium">
                                                        {pct}%
                                                    </span>
                                                </div>
                                                <Progress
                                                    value={pct}
                                                    className="h-1.5"
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {project.start_date ||
                                            project.end_date ? (
                                                <span>
                                                    {project.start_date ||
                                                        '...'}{' '}
                                                    →{' '}
                                                    {project.end_date || '...'}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground/60">
                                                    -
                                                </span>
                                            )}
                                        </TableCell>
                                        {hasAnyRowAction && (
                                            <TableCell className="text-right">
                                                {(canEditProjectItem(project) ||
                                                    canDeleteProjectItem(
                                                        project,
                                                    )) && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger
                                                            asChild
                                                        >
                                                            <Button
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {canEditProjectItem(
                                                                project,
                                                            ) && (
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        onEdit(
                                                                            project,
                                                                        )
                                                                    }
                                                                >
                                                                    <Pencil className="mr-2 h-4 w-4" />
                                                                    {t('Edit')}
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canDeleteProjectItem(
                                                                project,
                                                            ) && (
                                                                <DropdownMenuItem
                                                                    className="text-destructive focus:text-destructive"
                                                                    onClick={() =>
                                                                        onDelete(
                                                                            project,
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash className="mr-2 h-4 w-4" />
                                                                    {t(
                                                                        'Delete',
                                                                    )}
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
