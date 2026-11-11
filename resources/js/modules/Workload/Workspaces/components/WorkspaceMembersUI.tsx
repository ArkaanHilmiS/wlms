import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Trash2, Shield, User } from 'lucide-react';
import { WorkspaceMember } from '../hooks/useWorkspaceMembers';
import { useTranslate } from '@/hooks/useTranslate';

export interface WorkspaceMembersUIProps {
    workspaceName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;

    // Members Data
    members: WorkspaceMember[];
    isLoadingMembers: boolean;

    // Add Member form state
    userOptions: { value: string; label: string }[];
    selectedUserId: string;
    onSelectedUserIdChange: (id: string) => void;

    // Actions
    onAddMember: () => void;
    isAdding: boolean;
    onRemoveMember: (userId: string) => void;
    isRemoving: boolean;
    onUpdateCapacity?: (userId: string, hours: number) => void;
    onUpdateRole?: (userId: string, role: string) => void;
    isUpdating?: boolean;
}

export function WorkspaceMembersUI({
    workspaceName,
    open,
    onOpenChange,
    members,
    isLoadingMembers,
    userOptions,
    selectedUserId,
    onSelectedUserIdChange,
    onAddMember,
    isAdding,
    onRemoveMember,
    isRemoving,
    onUpdateCapacity,
    onUpdateRole,
    isUpdating,
}: WorkspaceMembersUIProps) {
    const { t } = useTranslate();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>{t('Manage Members')}</DialogTitle>
                    <DialogDescription>
                        {t('Manage members for :name workspace.', {
                            name: workspaceName,
                        })}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="flex items-end gap-3">
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium">
                                {t('Invite User')}
                            </label>
                            <Combobox
                                options={userOptions}
                                value={selectedUserId}
                                onChange={onSelectedUserIdChange}
                                placeholder={t('Select user to invite...')}
                                emptyText={t('No users found.')}
                            />
                        </div>
                        <Button
                            onClick={onAddMember}
                            disabled={!selectedUserId || isAdding}
                        >
                            {isAdding && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {t('Add to Workspace')}
                        </Button>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-sm font-medium">
                            {t('Current Members')} ({members.length})
                        </h4>

                        <div className="divide-y rounded-md border">
                            {isLoadingMembers ? (
                                <div className="text-muted-foreground flex items-center justify-center p-4 text-center text-sm">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('Loading members...')}
                                </div>
                            ) : members.length === 0 ? (
                                <div className="text-muted-foreground p-4 text-center text-sm">
                                    {t('No members found.')}
                                </div>
                            ) : (
                                members.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between gap-4 p-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">
                                                {member.name}
                                            </p>
                                            <p className="text-muted-foreground truncate text-xs">
                                                {member.email}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-3">
                                            <div
                                                className="flex items-center gap-1.5"
                                                title={t(
                                                    'Daily capacity (hours)',
                                                )}
                                            >
                                                <span className="text-muted-foreground hidden text-xs sm:inline">
                                                    {t('Hours')}:
                                                </span>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="24"
                                                    className="h-8 w-14 px-1 text-center text-xs"
                                                    defaultValue={
                                                        member.daily_capacity_hours ??
                                                        8
                                                    }
                                                    onBlur={(e) =>
                                                        onUpdateCapacity?.(
                                                            member.id,
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    disabled={isUpdating}
                                                />
                                            </div>

                                            <div className="w-[120px]">
                                                <Select
                                                    defaultValue={
                                                        member.role || 'member'
                                                    }
                                                    onValueChange={(val) =>
                                                        onUpdateRole?.(
                                                            member.id,
                                                            val,
                                                        )
                                                    }
                                                    disabled={isUpdating}
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="admin">
                                                            <div className="flex items-center">
                                                                <Shield className="mr-2 h-3 w-3" />
                                                                {t('Admin')}
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="member">
                                                            <div className="flex items-center">
                                                                <User className="mr-2 h-3 w-3" />
                                                                {t('Member')}
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="viewer">
                                                            <div className="flex items-center">
                                                                <User className="text-muted-foreground mr-2 h-3 w-3" />
                                                                {t('Viewer')}
                                                            </div>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive h-8 w-8 shrink-0"
                                                onClick={() =>
                                                    onRemoveMember(member.id)
                                                }
                                                disabled={isRemoving}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
