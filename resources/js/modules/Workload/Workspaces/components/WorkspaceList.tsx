import { Workspace } from '../types';
import { WorkspaceCard } from './WorkspaceCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslate } from '@/hooks/useTranslate';

interface WorkspaceListProps {
    workspaces: Workspace[];
    isLoading: boolean;
    onSelectWorkspace?: (id: string) => void;
    onUpdateWorkspace?: (id: string, name: string) => Promise<void>;
    onArchiveWorkspace?: (id: string) => Promise<void>;
    canManage?: boolean;
}

export function WorkspaceList({
    workspaces,
    isLoading,
    onSelectWorkspace,
    onUpdateWorkspace,
    onArchiveWorkspace,
    canManage = false,
}: WorkspaceListProps) {
    const { t } = useTranslate();
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-48 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    if (workspaces.length === 0) {
        return (
            <div className="bg-muted/20 flex flex-col items-center justify-center rounded-xl border p-12 text-center">
                <h3 className="text-lg font-medium">
                    {t('No Workspaces Found')}
                </h3>
                <p className="text-muted-foreground mt-2">
                    {t(
                        "You don't have any workspaces yet. Create one to get started.",
                    )}
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace) => (
                <WorkspaceCard
                    key={workspace.id}
                    workspace={workspace}
                    onSelect={onSelectWorkspace}
                    onUpdate={onUpdateWorkspace}
                    onArchive={onArchiveWorkspace}
                    canManage={canManage}
                />
            ))}
        </div>
    );
}
