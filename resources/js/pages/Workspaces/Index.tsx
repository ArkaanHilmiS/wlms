import { Head, router } from '@inertiajs/react';
import {
    useGetWorkspaces,
    useUpdateWorkspace,
    useArchiveWorkspace,
} from '@/modules/Workload/Workspaces/hooks/useWorkspaces';
import { WorkspaceList } from '@/modules/Workload/Workspaces/components/WorkspaceList';
import { CreateWorkspaceModal } from '@/modules/Workload/Workspaces/components/CreateWorkspaceModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { index as projectsIndex } from '@/routes/projects';
import { toast } from 'sonner';
import { useTranslate } from '@/hooks/useTranslate';
import { usePermission } from '@/hooks/usePermission';

export default function WorkspacesIndex() {
    const { t } = useTranslate();
    const { data: workspaces = [], isLoading, error } = useGetWorkspaces();
    const { mutateAsync: updateWorkspace } = useUpdateWorkspace();
    const { mutateAsync: archiveWorkspace } = useArchiveWorkspace();
    const { can } = usePermission();

    const hasManagePermission = can('workspaces:manage');

    const handleUpdate = async (id: string, name: string) => {
        try {
            await updateWorkspace({ id, payload: { name } });
            toast.success(t('Workspace updated successfully'));
        } catch (err: any) {
            toast.error(
                err.response?.data?.message || t('Failed to update workspace'),
            );
            throw err;
        }
    };

    const handleArchive = async (id: string) => {
        try {
            await archiveWorkspace(id);
            toast.success(t('Workspace archived successfully'));
        } catch (err: any) {
            toast.error(
                err.response?.data?.message || t('Failed to archive workspace'),
            );
            throw err;
        }
    };

    return (
        <>
            <Head title={t('Workspaces')} />

            <div className="flex h-full w-full flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {t('Workspaces')}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {t(
                                "Manage your team's work environments and projects.",
                            )}
                        </p>
                    </div>

                    {hasManagePermission && (
                        <CreateWorkspaceModal>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                {t('New Workspace')}
                            </Button>
                        </CreateWorkspaceModal>
                    )}
                </div>

                {error ? (
                    <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border p-4">
                        {t(
                            'Failed to load workspaces. Please try again later.',
                        )}
                    </div>
                ) : (
                    <WorkspaceList
                        workspaces={workspaces}
                        isLoading={isLoading}
                        onSelectWorkspace={(id) =>
                            router.visit(
                                projectsIndex({ query: { workspace_id: id } })
                                    .url,
                            )
                        }
                        onUpdateWorkspace={handleUpdate}
                        onArchiveWorkspace={handleArchive}
                        canManage={hasManagePermission}
                    />
                )}
            </div>
        </>
    );
}
