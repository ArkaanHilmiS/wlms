import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Plus } from 'lucide-react';
import {
    useGetWorkflow,
    useCreateTransition,
    useDeleteTransition,
} from '../../hooks/useWorkflows';
import { useStatuses } from '../../hooks/useStatuses';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Trash } from 'lucide-react';
import type { Workflow } from '../../types';
import { useTranslate } from '@/hooks/useTranslate';

interface WorkflowBuilderDialogProps {
    workflow: Workflow | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function WorkflowBuilderDialog({
    workflow,
    open,
    onOpenChange,
}: WorkflowBuilderDialogProps) {
    const { t } = useTranslate();
    const { data: fullWorkflow, isLoading } = useGetWorkflow(
        workflow?.id || '',
    );
    const { data: statuses = [] } = useStatuses();
    const createTransition = useCreateTransition();
    const deleteTransition = useDeleteTransition();

    const [name, setName] = useState('');
    const [fromStatusId, setFromStatusId] = useState('');
    const [toStatusId, setToStatusId] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!workflow || !name || !fromStatusId || !toStatusId) return;
        const actualFromStatus = fromStatusId === 'none' ? null : fromStatusId;

        createTransition.mutate(
            {
                workflowId: workflow.id,
                payload: {
                    name,
                    from_status_id: actualFromStatus,
                    to_status_id: toStatusId,
                },
            },
            {
                onSuccess: () => {
                    setName('');
                    setFromStatusId('');
                    setToStatusId('');
                },
            },
        );
    };

    const handleDelete = (transitionId: string) => {
        if (!workflow) return;
        deleteTransition.mutate({ workflowId: workflow.id, transitionId });
    };

    const statusOptions = statuses.map((s) => ({ value: s.id, label: s.name }));
    const fromStatusOptions = [
        { value: 'none', label: '(Initial Step)' },
        ...statusOptions,
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>
                        {t('Workflow Builder -')} {workflow?.name}
                    </DialogTitle>
                    <DialogDescription>
                        {t(
                            'Manage transitions between statuses for this workflow.',
                        )}
                    </DialogDescription>
                </DialogHeader>

                {isLoading && <div>{t('Loading workflow details...')}</div>}

                {fullWorkflow && (
                    <div className="space-y-6">
                        <div className="bg-muted/20 rounded-md border p-4">
                            <h4 className="mb-4 font-medium">
                                {t('Add New Transition')}
                            </h4>
                            <form
                                onSubmit={handleSubmit}
                                className="flex flex-col items-end gap-3 md:flex-row"
                            >
                                <div className="flex-1 space-y-1.5">
                                    <Label htmlFor="transitionName">
                                        {t('Name')}
                                    </Label>
                                    <Input
                                        id="transitionName"
                                        value={name}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                        placeholder="e.g. Start Progress"
                                    />
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    <Label>{t('From Status')}</Label>
                                    <Combobox
                                        options={fromStatusOptions}
                                        value={fromStatusId}
                                        onChange={setFromStatusId}
                                        placeholder={t('Select status...')}
                                    />
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    <Label>{t('To Status')}</Label>
                                    <Combobox
                                        options={statusOptions}
                                        value={toStatusId}
                                        onChange={setToStatusId}
                                        placeholder={t('Select status...')}
                                    />
                                </div>
                                <div>
                                    <Button
                                        type="submit"
                                        disabled={
                                            createTransition.isPending ||
                                            !name ||
                                            !fromStatusId ||
                                            !toStatusId
                                        }
                                        size="icon"
                                        title={t('Add Transition')}
                                        className="shrink-0"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </form>
                        </div>

                        <div>
                            <h4 className="mb-3 font-medium">
                                {t('Transitions')}
                            </h4>
                            {!fullWorkflow.transitions ||
                            fullWorkflow.transitions.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    {t(
                                        'No transitions found for this workflow.',
                                    )}
                                </p>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    {t('Name')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('From Status')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('To Status')}
                                                </TableHead>
                                                <TableHead className="w-16"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fullWorkflow.transitions.map(
                                                (t) => {
                                                    const fromStatus =
                                                        statuses.find(
                                                            (s) =>
                                                                s.id ===
                                                                t.from_status_id,
                                                        );
                                                    const toStatus =
                                                        statuses.find(
                                                            (s) =>
                                                                s.id ===
                                                                t.to_status_id,
                                                        );
                                                    return (
                                                        <TableRow key={t.id}>
                                                            <TableCell className="font-medium">
                                                                {t.name}
                                                            </TableCell>
                                                            <TableCell>
                                                                {fromStatus?.name || (
                                                                    <span className="text-muted-foreground italic">
                                                                        (Initial
                                                                        Step)
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                {toStatus?.name ||
                                                                    'Unknown'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() =>
                                                                        handleDelete(
                                                                            t.id,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        deleteTransition.isPending
                                                                    }
                                                                >
                                                                    <Trash className="text-destructive h-4 w-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                },
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
