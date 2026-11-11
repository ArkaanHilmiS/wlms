import React, { useMemo } from 'react';
import type { User } from '../../hooks/use-users';
import type { Role } from '../../hooks/use-roles';
import { UserAssignRoleDialog } from './UserAssignRoleDialog';
import { UserAssignOrgUnitDialog } from './UserAssignOrgUnitDialog';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, Building2 } from 'lucide-react';
import { useTranslate } from '@/hooks/useTranslate';

interface UserListProps {
    users: User[];
    roles: Role[];
    orgUnits: { id: string; name: string }[];
    isAssigning: boolean;
    isRevoking?: boolean;
    isUpdating?: boolean;
    onAssignRole: (payload: {
        user_id: string;
        role_id: string;
        context_type?: string | null;
        context_id?: string | null;
    }) => Promise<void>;
    onRevokeRole?: (payload: {
        user_id: string;
        role_id: string;
        context_type?: string | null;
        context_id?: string | null;
    }) => Promise<void>;
    onUpdateUser?: (payload: {
        id: string;
        org_unit_id: string | null;
    }) => Promise<void>;
}

export function UserList({
    users,
    roles,
    orgUnits,
    isAssigning,
    isRevoking = false,
    isUpdating = false,
    onAssignRole,
    onRevokeRole,
    onUpdateUser,
}: UserListProps) {
    const { t } = useTranslate();
    const columns = useMemo<ColumnDef<User>[]>(
        () => [
            {
                accessorKey: 'name',
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === 'asc')
                        }
                        className="-ml-4"
                    >
                        {t('Name')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => (
                    <div className="font-medium">{row.getValue('name')}</div>
                ),
            },
            {
                accessorKey: 'email',
                header: 'Email',
                cell: ({ row }) => (
                    <span className="text-muted-foreground">
                        {row.getValue('email')}
                    </span>
                ),
            },
            {
                accessorKey: 'org_unit_name',
                header: 'Org Unit',
                cell: ({ row }) => {
                    const name = row.original.org_unit_name;
                    return name ? (
                        <div className="flex items-center gap-1.5 text-sm">
                            <Building2 className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                            <span>{name}</span>
                        </div>
                    ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                    );
                },
            },
            {
                accessorKey: 'roles',
                header: 'Roles',
                cell: ({ row }) => {
                    if (row.original.user_roles?.length) {
                        return (
                            <div className="flex flex-wrap gap-1">
                                {row.original.user_roles.map((ur, idx) => (
                                    <Badge
                                        key={`${ur.role_id}-${ur.context_type ?? ''}-${ur.context_id ?? idx}`}
                                        variant="secondary"
                                        className="flex items-center gap-1 text-xs"
                                    >
                                        <span>
                                            {ur.role_name}
                                            {ur.context_type &&
                                            ur.context_type !== 'GLOBAL'
                                                ? ` (${ur.context_type})`
                                                : ''}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={isRevoking}
                                            onClick={() =>
                                                onRevokeRole?.({
                                                    user_id: String(
                                                        row.original.id,
                                                    ),
                                                    role_id: ur.role_id,
                                                    context_type:
                                                        ur.context_type,
                                                    context_id: ur.context_id,
                                                })
                                            }
                                            className="hover:text-destructive ml-0.5 focus:outline-none disabled:opacity-50"
                                            title={t('Revoke role')}
                                        >
                                            ×
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        );
                    }
                    const userRoles: string[] = row.original.roles ?? [];
                    if (userRoles.length === 0) {
                        return (
                            <span className="text-muted-foreground text-xs">
                                {t('No role')}
                            </span>
                        );
                    }
                    return (
                        <div className="flex flex-wrap gap-1">
                            {userRoles.map((r) => (
                                <Badge
                                    key={r}
                                    variant="secondary"
                                    className="text-xs"
                                >
                                    {r}
                                </Badge>
                            ))}
                        </div>
                    );
                },
            },
            {
                id: 'actions',
                header: () => <div className="text-right">{t('Actions')}</div>,
                cell: ({ row }) => {
                    const user = row.original;
                    return (
                        <div className="flex items-center justify-end gap-2">
                            {onUpdateUser && (
                                <UserAssignOrgUnitDialog
                                    user={user}
                                    orgUnits={orgUnits}
                                    isSubmitting={isUpdating}
                                    onSubmit={onUpdateUser}
                                />
                            )}
                            <UserAssignRoleDialog
                                user={user}
                                roles={roles}
                                isSubmitting={isAssigning}
                                onSubmit={onAssignRole}
                            />
                        </div>
                    );
                },
            },
        ],
        [
            roles,
            orgUnits,
            isAssigning,
            isRevoking,
            isUpdating,
            onAssignRole,
            onRevokeRole,
            onUpdateUser,
        ],
    );

    return (
        <div className="w-full">
            <DataTable columns={columns} data={users} searchKey="name" />
        </div>
    );
}
