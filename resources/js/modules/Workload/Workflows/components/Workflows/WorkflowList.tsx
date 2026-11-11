import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { Workflow } from '../../types';
import { useTranslate } from '@/hooks/useTranslate';

interface WorkflowListProps {
    workflows: Workflow[];
    onWorkflowClick?: (workflow: Workflow) => void;
    onDeleteWorkflow?: (workflow: Workflow) => void;
}

export function WorkflowList({
    workflows,
    onWorkflowClick,
    onDeleteWorkflow,
}: WorkflowListProps) {
    const { t } = useTranslate();
    if (workflows.length === 0) {
        return (
            <div className="text-muted-foreground py-8 text-center">
                {t('No workflows found.')}
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('Name')}</TableHead>
                        <TableHead>{t('Description')}</TableHead>
                        <TableHead>{t('Statuses')}</TableHead>
                        <TableHead>{t('Status')}</TableHead>
                        <TableHead className="text-right">
                            {t('Actions')}
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {workflows.map((workflow) => (
                        <TableRow
                            key={workflow.id}
                            onClick={() =>
                                onWorkflowClick && onWorkflowClick(workflow)
                            }
                            className={
                                onWorkflowClick
                                    ? 'hover:bg-muted/50 cursor-pointer'
                                    : ''
                            }
                        >
                            <TableCell className="font-medium">
                                {workflow.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-xs truncate">
                                {workflow.description || '-'}
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-wrap gap-1">
                                    {workflow.statuses?.map((status) => (
                                        <Badge
                                            key={status.id}
                                            variant="outline"
                                            className="whitespace-nowrap"
                                        >
                                            {status.name}
                                        </Badge>
                                    ))}
                                </div>
                            </TableCell>
                            <TableCell>
                                {workflow.is_active ? (
                                    <Badge
                                        variant="default"
                                        className="bg-green-500 hover:bg-green-600"
                                    >
                                        {t('Active')}
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary">
                                        {t('Inactive')}
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteWorkflow &&
                                            onDeleteWorkflow(workflow);
                                    }}
                                    title={t('Delete Workflow')}
                                >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
