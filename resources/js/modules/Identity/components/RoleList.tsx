import React, { useState, useMemo } from 'react';
import { Role } from '../hooks/use-roles';
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
import { Trash2, Shield, ArrowUpDown } from 'lucide-react';
import { ManageRoleAccessDialog } from './Roles/ManageRoleAccessDialog';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { useTranslate } from '@/hooks/useTranslate';

interface RoleListProps {
    roles: Role[];
    onDelete: (id: string) => void;
}

export function RoleList({ roles, onDelete }: RoleListProps) {
    const { t } = useTranslate();
    const [managedRole, setManagedRole] = useState<Role | null>(null);

    const columns = useMemo<ColumnDef<Role>[]>(
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
                            {t('Role Name')}
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    );
                },
                cell: ({ row }) => (
                    <div className="font-medium">{row.getValue('name')}</div>
                ),
            },
            {
                accessorKey: 'scope',
                header: 'Scope',
                cell: ({ row }) => {
                    return (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                            {row.getValue('scope')}
                        </span>
                    );
                },
            },
            {
                id: 'permissionsCount',
                header: 'Permissions Count',
                cell: ({ row }) => {
                    const role = row.original;
                    return (
                        <span className="text-muted-foreground">
                            {role.permissions?.length || 0} {t('permissions')}
                        </span>
                    );
                },
            },
            {
                id: 'actions',
                header: () => <div className="text-right">{t('Actions')}</div>,
                cell: ({ row }) => {
                    const role = row.original;
                    return (
                        <div className="space-x-2 text-right">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setManagedRole(role)}
                                title={t('Manage Access')}
                            >
                                <Shield className="h-4 w-4" />
                                <span className="sr-only">
                                    {t('Manage Access')}
                                </span>
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        title={t('Delete Role')}
                                        disabled={
                                            role.name.toLowerCase() ===
                                            'superadmin'
                                        }
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">
                                            {t('Delete Role')}
                                        </span>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            {t('Are you absolutely sure?')}
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This
                                            will permanently delete the role "
                                            {role.name}" and remove it from any
                                            assigned users.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>
                                            {t('Cancel')}
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => onDelete(role.id)}
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
        [onDelete],
    );

    return (
        <div className="w-full">
            <DataTable columns={columns} data={roles} searchKey="name" />

            <ManageRoleAccessDialog
                role={managedRole}
                open={!!managedRole}
                onOpenChange={(open) => !open && setManagedRole(null)}
            />
        </div>
    );
}
