import { useState } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Archive, Users } from 'lucide-react';
import { Workspace } from '../types';
import { EditWorkspaceDialog } from './EditWorkspaceDialog';
import { ArchiveWorkspaceDialog } from './ArchiveWorkspaceDialog';
import { WorkspaceMembersDialog } from './WorkspaceMembersDialog';
import { useTranslate } from '@/hooks/useTranslate';

interface WorkspaceCardProps {
    workspace: Workspace;
    onSelect?: (id: string) => void;
    onUpdate?: (id: string, name: string) => Promise<void>;
    onArchive?: (id: string) => Promise<void>;
    canManage?: boolean;
}

export function WorkspaceCard({
    workspace,
    onSelect,
    onUpdate,
    onArchive,
    canManage = false,
}: WorkspaceCardProps) {
    const { t } = useTranslate();
    const [editOpen, setEditOpen] = useState(false);
    const [archiveOpen, setArchiveOpen] = useState(false);
    const [membersOpen, setMembersOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);

    const handleUpdate = async (name: string) => {
        if (!onUpdate) return;
        setIsUpdating(true);
        try {
            await onUpdate(workspace.id, name);
            setEditOpen(false);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleArchive = async () => {
        if (!onArchive) return;
        setIsArchiving(true);
        try {
            await onArchive(workspace.id);
            setArchiveOpen(false);
        } finally {
            setIsArchiving(false);
        }
    };

    return (
        <>
            <Card className="hover:border-primary transition-colors">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1">
                            <CardTitle className="text-xl">
                                {workspace.name}
                            </CardTitle>
                            <Badge
                                variant={
                                    workspace.status === 'ACTIVE'
                                        ? 'default'
                                        : 'secondary'
                                }
                                className="w-fit"
                            >
                                {t(workspace.status)}
                            </Badge>
                        </div>
                        {canManage && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                    >
                                        <span className="sr-only">
                                            {t('Open menu')}
                                        </span>
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onClick={() => setMembersOpen(true)}
                                    >
                                        <Users className="mr-2 h-4 w-4" />
                                        <span>{t('Manage Members')}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => setEditOpen(true)}
                                    >
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>{t('Edit')}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => setArchiveOpen(true)}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Archive className="mr-2 h-4 w-4" />
                                        <span>{t('Archive')}</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                    <CardDescription className="pt-2">
                        {t('ID')}: {(workspace?.id || '').split('-')[0]}...
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-muted-foreground text-sm">
                        {t('Owned by Group')}:{' '}
                        {workspace.owner_group_name
                            ? `${workspace.owner_group_name}${workspace.owner_group_code ? ` (${workspace.owner_group_code})` : ''}`
                            : `${(
                                  workspace.owner_group_id ||
                                  workspace.ownerGroupId ||
                                  ''
                              ).split('-')[0]}...`}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => onSelect?.(workspace.id)}
                    >
                        {t('View Workspace')}
                    </Button>
                </CardFooter>
            </Card>

            <EditWorkspaceDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                workspaceId={workspace.id}
                initialName={workspace.name}
                onSubmit={handleUpdate}
                isPending={isUpdating}
            />

            <ArchiveWorkspaceDialog
                open={archiveOpen}
                onOpenChange={setArchiveOpen}
                workspaceName={workspace.name}
                onConfirm={handleArchive}
                isPending={isArchiving}
            />

            <WorkspaceMembersDialog
                workspaceId={workspace.id}
                workspaceName={workspace.name}
                open={membersOpen}
                onOpenChange={setMembersOpen}
            />
        </>
    );
}
