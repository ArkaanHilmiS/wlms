import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';
import type { Status } from '../../types';
import { useTranslate } from '@/hooks/useTranslate';

interface StatusListProps {
    statuses: Status[];
    onEdit: (status: Status) => void;
    onDelete: (status: Status) => void;
}

export function StatusList({ statuses, onEdit, onDelete }: StatusListProps) {
    const { t } = useTranslate();
    if (statuses.length === 0) {
        return (
            <div className="text-muted-foreground py-8 text-center">
                {t('No statuses found.')}
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('Name')}</TableHead>
                        <TableHead>{t('Default')}</TableHead>
                        <TableHead className="text-right">
                            {t('Actions')}
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {statuses.map((status) => (
                        <TableRow key={status.id}>
                            <TableCell className="font-medium">
                                {status.name}
                            </TableCell>
                            <TableCell>
                                {status.is_default && (
                                    <Badge variant="secondary">
                                        {t('Default')}
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell className="space-x-2 text-right">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onEdit(status)}
                                    title={t('Edit')}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onDelete(status)}
                                    title={t('Delete')}
                                    className="text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
