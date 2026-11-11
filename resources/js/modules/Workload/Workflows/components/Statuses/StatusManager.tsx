import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus } from 'lucide-react';
import { StatusList } from './StatusList';
import { StatusFormDialog } from './StatusFormDialog';
import {
    useStatuses,
    useCreateStatus,
    useUpdateStatus,
    useDeleteStatus,
} from '../../hooks/useStatuses';
import type { Status, CreateStatusDto, UpdateStatusDto } from '../../types';
import { useTranslate } from '@/hooks/useTranslate';

export function StatusManager() {
    const { t } = useTranslate();
    const { data: statuses = [], isLoading } = useStatuses();
    const createStatus = useCreateStatus();
    const updateStatus = useUpdateStatus();
    const deleteStatus = useDeleteStatus();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);
    const [statusToDelete, setStatusToDelete] = useState<Status | null>(null);

    const handleOpenCreate = () => {
        setSelectedStatus(null);
        setIsFormOpen(true);
    };

    const handleOpenEdit = (status: Status) => {
        setSelectedStatus(status);
        setIsFormOpen(true);
    };

    const handleDelete = (status: Status) => {
        setStatusToDelete(status);
    };

    const handleSubmit = (payload: CreateStatusDto | UpdateStatusDto) => {
        if (selectedStatus) {
            updateStatus.mutate(
                { id: selectedStatus.id, payload },
                {
                    onSuccess: () => setIsFormOpen(false),
                },
            );
        } else {
            createStatus.mutate(payload as CreateStatusDto, {
                onSuccess: () => setIsFormOpen(false),
            });
        }
    };

    if (isLoading) {
        return <div className="py-4">{t('Loading statuses...')}</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={handleOpenCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('Create Status')}
                </Button>
            </div>

            <StatusList
                statuses={statuses}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
            />

            <StatusFormDialog
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                status={selectedStatus}
                onSubmit={handleSubmit}
                isLoading={createStatus.isPending || updateStatus.isPending}
            />

            <AlertDialog
                open={!!statusToDelete}
                onOpenChange={(open) => !open && setStatusToDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t('Delete Status')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {`Are you sure you want to delete status "${statusToDelete?.name ?? ''}"?`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (statusToDelete) {
                                    deleteStatus.mutate(statusToDelete.id);
                                    setStatusToDelete(null);
                                }
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {t('Delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
