import React, { useMemo } from 'react';
import { OrgLevel } from '../../hooks/use-org-levels';
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
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Edit2, Trash2, ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { useTranslate } from '@/hooks/useTranslate';

interface OrgLevelListProps {
    levels: OrgLevel[];
    onEdit: (level: OrgLevel) => void;
    onDelete: (level: OrgLevel) => void;
}

export function OrgLevelList({ levels, onEdit, onDelete }: OrgLevelListProps) {
    const { t } = useTranslate();
    const columns = useMemo<ColumnDef<OrgLevel>[]>(
        () => [
            {
                accessorKey: 'name',
                header: ({ column }) => {
                    return (
                        <Button
                            variant="ghost"
                            onClick={() =>
                                column.toggleSorting(
                                    column.getIsSorted() === 'asc',
                                )
                            }
                            className="-ml-4"
                        >
                            {t('Level Name')}
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    );
                },
                cell: ({ row }) => (
                    <div className="font-medium">{row.getValue('name')}</div>
                ),
            },
            {
                accessorKey: 'slug',
                header: 'Slug',
            },
            {
                accessorKey: 'depth',
                header: 'Depth',
            },
            {
                accessorKey: 'is_active',
                header: 'Status',
                cell: ({ row }) => {
                    const isActive = row.getValue('is_active') as boolean;
                    return (
                        <Badge variant={isActive ? 'default' : 'secondary'}>
                            {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                    );
                },
            },
            {
                id: 'properties',
                header: 'Properties',
                cell: ({ row }) => {
                    const level = row.original;
                    return (
                        <div className="flex space-x-1">
                            {level.is_leaf && (
                                <Badge variant="outline">{t('Leaf')}</Badge>
                            )}
                            {level.can_own_workspace && (
                                <Badge variant="outline">
                                    {t('Workspace Owner')}
                                </Badge>
                            )}
                        </div>
                    );
                },
            },
            {
                id: 'actions',
                header: () => <div className="text-right">{t('Actions')}</div>,
                cell: ({ row }) => {
                    const level = row.original;
                    return (
                        <div className="space-x-2 text-right">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit(level)}
                                title={t('Edit Level')}
                            >
                                <Edit2 className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        title={t('Delete Level')}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            {t('Are you absolutely sure?')}
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This
                                            will permanently delete the level "
                                            {level.name}".
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>
                                            {t('Cancel')}
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => onDelete(level)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            {t('Delete')}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    );
                },
            },
        ],
        [onEdit, onDelete],
    );

    return (
        <div className="w-full">
            <DataTable columns={columns} data={levels} searchKey="name" />
        </div>
    );
}
