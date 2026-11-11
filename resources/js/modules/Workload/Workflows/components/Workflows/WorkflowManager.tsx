import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
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
import { WorkflowList } from './WorkflowList';
import { WorkflowFormDialog } from './WorkflowFormDialog';
import { WorkflowBuilderDialog } from './WorkflowBuilderDialog';
import {
    useWorkflows,
    useCreateWorkflow,
    useDeleteWorkflow,
} from '../../hooks/useWorkflows';
import { useStatuses } from '../../hooks/useStatuses';
import type { CreateWorkflowDto, Workflow } from '../../types';
import { useTranslate } from '@/hooks/useTranslate';

export function WorkflowManager() {
    const { t } = useTranslate();
    const { data: workflows = [], isLoading: isWorkflowsLoading } =
        useWorkflows();
    const { data: statuses = [] } = useStatuses();
    const createWorkflow = useCreateWorkflow();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [builderWorkflow, setBuilderWorkflow] = useState<Workflow | null>(
        null,
    );
    const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(
        null,
    );
    const deleteWorkflow = useDeleteWorkflow();

    const handleOpenCreate = () => {
        setIsFormOpen(true);
    };

    const handleSubmit = (payload: CreateWorkflowDto) => {
        createWorkflow.mutate(payload, {
            onSuccess: () => setIsFormOpen(false),
        });
    };

    const handleDelete = () => {
        if (workflowToDelete) {
            deleteWorkflow.mutate(workflowToDelete.id, {
                onSuccess: () => setWorkflowToDelete(null),
            });
        }
    };

    if (isWorkflowsLoading) {
        return <div className="py-4">{t('Loading workflows...')}</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={handleOpenCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('Create Workflow')}
                </Button>
            </div>

            <WorkflowList
                workflows={workflows}
                onWorkflowClick={(workflow) => setBuilderWorkflow(workflow)}
                onDeleteWorkflow={(workflow) => setWorkflowToDelete(workflow)}
            />

            <WorkflowFormDialog
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                statuses={statuses}
                onSubmit={handleSubmit}
                isLoading={createWorkflow.isPending}
            />

            <WorkflowBuilderDialog
                workflow={builderWorkflow}
                open={!!builderWorkflow}
                onOpenChange={(open) => !open && setBuilderWorkflow(null)}
            />

            <AlertDialog
                open={!!workflowToDelete}
                onOpenChange={(open) => !open && setWorkflowToDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t('Are you absolutely sure?')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('This will')}{' '}
                            {workflowToDelete?.statuses?.length
                                ? 'soft delete'
                                : 'permanently delete'}{' '}
                            {t('the workflow')}{' '}
                            <strong>{workflowToDelete?.name}</strong>.
                            {workflowToDelete?.statuses?.length
                                ? ' Projects using this workflow will still be able to function normally.'
                                : ' This action cannot be undone since this workflow is empty.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteWorkflow.isPending}>
                            {t('Cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDelete();
                            }}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                            disabled={deleteWorkflow.isPending}
                        >
                            {deleteWorkflow.isPending
                                ? 'Deleting...'
                                : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
