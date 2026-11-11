import { Head, usePage, router } from '@inertiajs/react';
import { ProjectsManager } from '@/modules/Workload/Projects/components/ProjectsManager';
import { useGetWorkspaces } from '@/modules/Workload/Workspaces/hooks/useWorkspaces';
import { useGetProjects } from '@/modules/Workload/Projects/hooks/useProjects';
import { WorkspaceTasksTable } from '@/modules/Workload/Workspaces/components/WorkspaceTasksTable';
import { WorkspaceAnalyticsView } from '@/modules/Workload/Workspaces/components/WorkspaceAnalyticsView';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { index as projectsIndex } from '@/routes/projects';
import { index as workspacesIndex } from '@/routes/workspaces';
import { Combobox } from '@/components/ui/combobox';
import { WorkspaceMembersDialog } from '@/modules/Workload/Workspaces/components/WorkspaceMembersDialog';
import { Users, FolderKanban, CheckSquare, BarChart2, Layers } from 'lucide-react';
import { useEffect, useState } from 'react';
import axios from '@/lib/axios';
import { toast } from 'sonner';
import { useTranslate } from '@/hooks/useTranslate';
import { usePermission } from '@/hooks/usePermission';

export default function ProjectsIndex() {
    const { t } = useTranslate();
    const { can } = usePermission();
    const { url, props } = usePage<any>();
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    const workspaceId = urlParams.get('workspace_id');
    const tabParam = urlParams.get('tab') as
        | 'overview'
        | 'tasks'
        | 'analytics'
        | null;

    const canViewAnalytics = can('analytics:view');

    const [activeTab, setActiveTab] = useState<
        'overview' | 'tasks' | 'analytics'
    >(
        tabParam === 'tasks'
            ? 'tasks'
            : tabParam === 'analytics' && canViewAnalytics
              ? 'analytics'
              : 'overview',
    );

    const { data: workspaces = [], isLoading } = useGetWorkspaces();
    const { data: projects = [] } = useGetProjects(workspaceId || undefined);

    const { auth, lookups } = props;
    const priorities = lookups?.priorities || [];
    const hasManagePermission = can('workspaces:manage');
    const canManageProjects = can('projects:manage');
    const canManageIssues = can('issues:manage');
    const [membersOpen, setMembersOpen] = useState(false);
    const [enableSprints, setEnableSprints] = useState<boolean>(
        lookups?.settings?.enable_sprints !== false,
    );
    const [isTogglingSprints, setIsTogglingSprints] = useState(false);

    useEffect(() => {
        if (lookups?.settings?.enable_sprints !== undefined) {
            setEnableSprints(lookups.settings.enable_sprints !== false);
        }
    }, [lookups?.settings?.enable_sprints]);

    const activeWorkspace = workspaces.find((w: any) => w.id === workspaceId);

    const handleToggleWorkspaceSprints = async () => {
        if (!workspaceId) return;
        const next = !enableSprints;
        try {
            setIsTogglingSprints(true);
            await axios.put(`/api/workspaces/${workspaceId}/settings`, {
                enable_sprints: next,
            });
            setEnableSprints(next);
            toast.success(
                next
                    ? t('Mode Sprint (Scrum) diaktifkan untuk workspace ini.')
                    : t(
                          'Mode Kanban murni diaktifkan untuk workspace ini (tanpa Sprint/Backlog).',
                      ),
            );
        } catch {
            toast.error(t('Gagal memperbarui pengaturan workspace.'));
        } finally {
            setIsTogglingSprints(false);
        }
    };

    const handleWorkspaceChange = (value: string) => {
        router.visit(
            projectsIndex({ query: { workspace_id: value, tab: activeTab } })
                .url,
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const handleTabChange = (tab: 'overview' | 'tasks' | 'analytics') => {
        if (tab === 'analytics' && !canViewAnalytics) return;
        setActiveTab(tab);
        if (workspaceId) {
            router.visit(
                projectsIndex({ query: { workspace_id: workspaceId, tab } })
                    .url,
                {
                    preserveState: true,
                    preserveScroll: true,
                },
            );
        }
    };

    return (
        <>
            <Head title={t('Projects')} />

            <div className="flex h-full w-full flex-col gap-6 p-6">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {t('Projects')}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {t(
                                'Manage projects and workflow within your workspace.',
                            )}
                        </p>
                    </div>

                    <div className="flex w-full items-center gap-3 sm:w-auto">
                        <span className="text-muted-foreground text-sm font-medium whitespace-nowrap">
                            Active Workspace:
                        </span>
                        <Combobox
                            options={workspaces.map((ws) => ({
                                value: ws.id,
                                label: ws.name,
                            }))}
                            value={workspaceId || ''}
                            onChange={handleWorkspaceChange}
                            disabled={isLoading}
                            placeholder={t('Select Workspace...')}
                        />
                        {workspaceId &&
                            activeWorkspace &&
                            hasManagePermission && (
                                <>
                                    <Button
                                        variant={
                                            enableSprints
                                                ? 'secondary'
                                                : 'outline'
                                        }
                                        className="flex h-9 shrink-0 items-center gap-1.5 px-3"
                                        disabled={isTogglingSprints}
                                        onClick={handleToggleWorkspaceSprints}
                                        title={t(
                                            'Toggle Scrum (Sprint) / Pure Kanban Mode untuk seluruh proyek di Workspace ini',
                                        )}
                                    >
                                        <Layers className="h-4 w-4" />
                                        <span className="sr-only sm:not-sr-only sm:text-xs">
                                            {enableSprints
                                                ? t('Scrum Mode')
                                                : t('Kanban Mode')}
                                        </span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="flex h-9 shrink-0 items-center gap-2 px-3"
                                        onClick={() => setMembersOpen(true)}
                                        title={t('Manage Workspace Members')}
                                    >
                                        <span className="sr-only sm:not-sr-only sm:text-xs">
                                            {t('Members')}
                                        </span>
                                        <Users className="h-4 w-4" />
                                    </Button>
                                    <WorkspaceMembersDialog
                                        workspaceId={activeWorkspace.id}
                                        workspaceName={activeWorkspace.name}
                                        open={membersOpen}
                                        onOpenChange={setMembersOpen}
                                    />
                                </>
                            )}
                    </div>
                </div>

                {!workspaceId ? (
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>{t('No Workspace Selected')}</CardTitle>
                            <CardDescription>
                                {t(
                                    'Please select a workspace from the dropdown above to view its projects.',
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={() =>
                                    router.visit(workspacesIndex().url)
                                }
                                variant="outline"
                            >
                                {t('Go to Workspaces Directory')}
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {/* Segmented Top View Tab Switcher */}
                        <div className="flex items-center gap-2 border-b pb-3">
                            <Button
                                variant={
                                    activeTab === 'overview'
                                        ? 'default'
                                        : 'ghost'
                                }
                                size="sm"
                                className="h-9 gap-2 text-xs font-medium"
                                onClick={() => handleTabChange('overview')}
                            >
                                <FolderKanban className="h-4 w-4" />
                                <span>{t('Overview Projects')}</span>
                                <span className="py-0.2 bg-background/20 ml-1 rounded-full px-1.5 font-mono text-[10px]">
                                    {projects.length}
                                </span>
                            </Button>

                            <Button
                                variant={
                                    activeTab === 'tasks' ? 'default' : 'ghost'
                                }
                                size="sm"
                                className="h-9 gap-2 text-xs font-medium"
                                onClick={() => handleTabChange('tasks')}
                            >
                                <CheckSquare className="h-4 w-4" />
                                <span>{t('All Tasks')}</span>
                            </Button>

                            {canViewAnalytics && (
                                <Button
                                    variant={
                                        activeTab === 'analytics'
                                            ? 'default'
                                            : 'ghost'
                                    }
                                    size="sm"
                                    className="h-9 gap-2 text-xs font-medium"
                                    onClick={() => handleTabChange('analytics')}
                                >
                                    <BarChart2 className="h-4 w-4" />
                                    <span>{t('Analytics')}</span>
                                </Button>
                            )}
                        </div>

                        {/* Active Tab Content */}
                        {activeTab === 'overview' && (
                            <ProjectsManager
                                workspaceId={workspaceId}
                                priorities={priorities}
                                canManage={canManageProjects}
                            />
                        )}

                        {activeTab === 'tasks' && (
                            <WorkspaceTasksTable
                                workspaceId={workspaceId}
                                projects={projects}
                                lookups={lookups}
                                currentUserId={auth?.user?.id}
                                canManageIssues={canManageIssues}
                            />
                        )}

                        {activeTab === 'analytics' && canViewAnalytics && (
                            <WorkspaceAnalyticsView workspaceId={workspaceId} />
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

ProjectsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Projects',
            href: projectsIndex(),
        },
    ],
};
