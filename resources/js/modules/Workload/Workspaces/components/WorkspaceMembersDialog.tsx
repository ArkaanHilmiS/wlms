import React, { useState } from 'react';
import {
    useGetWorkspaceMembers,
    useGetMemberCandidates,
    useAddWorkspaceMember,
    useRemoveWorkspaceMember,
    useUpdateWorkspaceMember,
} from '../hooks/useWorkspaceMembers';
import { toast } from 'sonner';
import { WorkspaceMembersUI } from './WorkspaceMembersUI';
import { useTranslate } from '@/hooks/useTranslate';

interface WorkspaceMembersDialogProps {
    workspaceId: string;
    workspaceName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function WorkspaceMembersDialog({
    workspaceId,
    workspaceName,
    open,
    onOpenChange,
}: WorkspaceMembersDialogProps) {
    const { t } = useTranslate();

    const [selectedUserId, setSelectedUserId] = useState<string>('');

    const { data: candidates = [] } = useGetMemberCandidates(workspaceId, open);

    const { data: members = [], isLoading: isLoadingMembers } =
        useGetWorkspaceMembers(workspaceId);
    const { mutateAsync: addMember, isPending: isAdding } =
        useAddWorkspaceMember(workspaceId);
    const { mutateAsync: removeMember, isPending: isRemoving } =
        useRemoveWorkspaceMember(workspaceId);
    const { mutateAsync: updateMember, isPending: isUpdating } =
        useUpdateWorkspaceMember(workspaceId);

    const handleUpdateCapacity = async (userId: string, hours: number) => {
        try {
            await updateMember({
                userId,
                payload: { daily_capacity_hours: hours },
            });
            toast.success(t('Capacity updated successfully'));
        } catch (error: any) {
            toast.error(
                error.response?.data?.message || t('Failed to update capacity'),
            );
        }
    };

    const handleUpdateRole = async (userId: string, role: string) => {
        try {
            await updateMember({ userId, payload: { role } });
            toast.success(t('Role updated successfully'));
        } catch (error: any) {
            toast.error(
                error.response?.data?.message || t('Failed to update role'),
            );
        }
    };

    const handleAddMember = async () => {
        if (!selectedUserId) return;

        try {
            await addMember({ user_id: selectedUserId, role: 'member' });
            toast.success(t('Member added successfully'));
            setSelectedUserId('');
        } catch (error: any) {
            toast.error(
                error.response?.data?.message || t('Failed to add member'),
            );
        }
    };

    const handleRemoveMember = async (userId: string) => {
        try {
            await removeMember(userId);
            toast.success(t('Member removed successfully'));
        } catch (error: any) {
            toast.error(
                error.response?.data?.message || t('Failed to remove member'),
            );
        }
    };

    const userOptions = candidates.map((u) => ({
        value: u.id,
        label: `${u.name} (${u.email})`,
    }));

    return (
        <WorkspaceMembersUI
            workspaceName={workspaceName}
            open={open}
            onOpenChange={onOpenChange}
            members={members}
            isLoadingMembers={isLoadingMembers}
            userOptions={userOptions}
            selectedUserId={selectedUserId}
            onSelectedUserIdChange={setSelectedUserId}
            onAddMember={handleAddMember}
            isAdding={isAdding}
            onRemoveMember={handleRemoveMember}
            isRemoving={isRemoving}
            onUpdateCapacity={handleUpdateCapacity}
            onUpdateRole={handleUpdateRole}
            isUpdating={isUpdating}
        />
    );
}
