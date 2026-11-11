import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Download, FileSpreadsheet, FileText } from 'lucide-react';
import axios from 'axios';
import { IssuesManager } from '@/modules/Workload/Issues/components/IssuesManager';
import { Project } from '@/modules/Workload/Projects/types';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { index as projectsIndex } from '@/routes/projects';
import { PriorityBadge } from '@/components/PriorityBadge';
import { useTranslate } from '@/hooks/useTranslate';
import { useIconSize } from '@/hooks/use-appearance';

interface LookupItem {
    id: string;
    name: string;
    slug?: string;
    category?: string;
}

interface ProjectShowProps {
    project: Project;
    lookups: {
        issueTypes: LookupItem[];
        priorities: LookupItem[];
        statuses: LookupItem[];
        users: LookupItem[];
        settings?: {
            enable_sprints?: boolean;
            sla_days_by_priority?: Record<string, number>;
            working_days?: number[];
            holidays?: string[];
            worklog_max_hours_per_day?: number;
            attachment_max_mb?: number;
        };
    };
}

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

export default function ProjectShow({ project, lookups }: ProjectShowProps) {
    const { t } = useTranslate();
    const { iconSize, updateIconSize } = useIconSize();
    const avatarColor = getProjectAvatarColor(project.name);

    const avatarSizeClass =
        iconSize === 'sm'
            ? 'h-8 w-8 text-sm rounded-md'
            : iconSize === 'lg'
              ? 'h-13 w-13 text-xl rounded-xl'
              : 'h-10 w-10 text-base rounded-lg';

    const titleSizeClass =
        iconSize === 'sm'
            ? 'text-xl font-bold tracking-tight'
            : iconSize === 'lg'
              ? 'text-3xl font-extrabold tracking-tight'
              : 'text-2xl font-bold tracking-tight';

    const handleBack = () => {
        router.visit(
            projectsIndex({ query: { workspace_id: project.workspace_id } })
                .url,
        );
    };

    const currentPriority = lookups.priorities?.find(
        (p) => p.id === project.priority_id,
    );

    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (format: 'xlsx' | 'csv') => {
        try {
            setIsExporting(true);
            const response = await axios.get(
                `/api/projects/${project.id}/issues/export?format=${format}`,
                { responseType: 'blob' },
            );

            const blob = new Blob([response.data], {
                type:
                    format === 'xlsx'
                        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        : 'text/csv',
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute(
                'download',
                `${project.key || 'project'}-issues-${new Date().toISOString().slice(0, 10)}.${format}`,
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            // fail silently or user notification
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            <Head title={`Project: ${project.name}`} />

            <div className="flex h-full w-full flex-col gap-4 p-6">
                <div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBack}
                        className="text-muted-foreground -ml-2"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('Back to Projects')}
                    </Button>
                </div>

                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                        <div
                            className={`flex shrink-0 items-center justify-center border font-bold ${avatarSizeClass} ${avatarColor}`}
                        >
                            {project.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className={titleSizeClass}>{project.name}</h1>
                            <div className="mt-1 flex items-center gap-3">
                                <p className="text-muted-foreground font-mono text-xs">
                                    Key: {project.key}
                                </p>
                                {project.priority_id && currentPriority && (
                                    <PriorityBadge
                                        name={currentPriority.name}
                                        category={currentPriority.category}
                                        size={iconSize}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-muted/60 flex items-center gap-1.5 rounded-lg border p-1">
                        <span className="text-muted-foreground hidden px-1.5 text-[11px] font-medium sm:inline">
                            {t('Density')}:
                        </span>
                        <Button
                            variant={iconSize === 'sm' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-7 px-2.5 text-xs font-semibold"
                            onClick={() => updateIconSize('sm')}
                            title={t('Small density')}
                        >
                            S
                        </Button>
                        <Button
                            variant={iconSize === 'md' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-7 px-2.5 text-xs font-semibold"
                            onClick={() => updateIconSize('md')}
                            title={t('Medium density')}
                        >
                            M
                        </Button>
                        <Button
                            variant={iconSize === 'lg' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-7 px-2.5 text-xs font-semibold"
                            onClick={() => updateIconSize('lg')}
                            title={t('Large density')}
                        >
                            L
                        </Button>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 shrink-0 gap-1.5 text-xs"
                                disabled={isExporting}
                            >
                                <Download className="h-3.5 w-3.5" />
                                <span>
                                    {isExporting
                                        ? t('Exporting...')
                                        : t('Export')}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() => handleExport('xlsx')}
                                className="cursor-pointer gap-2 text-xs"
                            >
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                <span>Excel (.xlsx)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleExport('csv')}
                                className="cursor-pointer gap-2 text-xs"
                            >
                                <FileText className="h-4 w-4 text-blue-600" />
                                <span>CSV (.csv)</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="mt-4">
                    <IssuesManager projectId={project.id} lookups={lookups} />
                </div>
            </div>
        </>
    );
}

ProjectShow.layout = {
    breadcrumbs: [
        {
            title: 'Projects',
            href: projectsIndex(),
        },
        {
            title: 'Project Board',
            href: '',
        },
    ],
};
