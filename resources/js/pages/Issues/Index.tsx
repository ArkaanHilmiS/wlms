import { Head, router, usePage } from '@inertiajs/react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { index as issuesIndex } from '@/routes/issues';
import { index as workspacesIndex } from '@/routes/workspaces';
import { useGetWorkspaces } from '@/modules/Workload/Workspaces/hooks/useWorkspaces';
import { useGetProjects } from '@/modules/Workload/Projects/hooks/useProjects';
import { WorkspaceTasksTable } from '@/modules/Workload/Workspaces/components/WorkspaceTasksTable';
import { useTranslate } from '@/hooks/useTranslate';
import { usePermission } from '@/hooks/usePermission';

export default function IssuesIndex() {
    const { t } = useTranslate();
    const { can } = usePermission();
    const { url, props } = usePage<any>();

    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    const { data: workspaces = [], isLoading } = useGetWorkspaces();

    const workspaceId =
        urlParams.get('workspace_id') ||
        props.workspace_id ||
        workspaces[0]?.id ||
        '';
    const { data: projects = [] } = useGetProjects(workspaceId || undefined);

    const handleWorkspaceChange = (value: string) => {
        router.visit(`/issues?workspace_id=${value}`, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title={t('My Tasks & Global Issues')} />

            <div className="flex h-full w-full flex-col gap-6 p-6">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {t('My Tasks & Global Issues')}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {t(
                                'View, filter, and update tasks across your workspaces.',
                            )}
                        </p>
                    </div>

                    <div className="flex w-full items-center gap-3 sm:w-auto">
                        <span className="text-muted-foreground text-sm font-medium whitespace-nowrap">
                            {t('Active Workspace')}:
                        </span>
                        <Combobox
                            options={workspaces.map((ws: any) => ({
                                value: ws.id,
                                label: ws.name,
                            }))}
                            value={workspaceId}
                            onChange={handleWorkspaceChange}
                            disabled={isLoading}
                            placeholder={t('Select Workspace...')}
                        />
                    </div>
                </div>

                {!workspaceId ? (
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>{t('No Workspace Selected')}</CardTitle>
                            <CardDescription>
                                {t(
                                    'Please select or create a workspace to view and manage your tasks.',
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
                    <WorkspaceTasksTable
                        workspaceId={workspaceId}
                        projects={projects}
                        lookups={props.lookups}
                        currentUserId={props.auth?.user?.id}
                        canManageIssues={can('issues:manage')}
                        initialAssigneeFilter="assigned_to_me"
                    />
                )}
            </div>
        </>
    );
}

IssuesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Issues',
            href: issuesIndex(),
        },
    ],
};
