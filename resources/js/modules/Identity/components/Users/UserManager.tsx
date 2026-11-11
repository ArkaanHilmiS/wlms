import {
    useUsers,
    useCreateUser,
    useAssignRole,
    useRevokeRole,
    useUpdateUser,
} from '../../hooks/use-users';
import { useRoles } from '../../hooks/use-roles';
import { useOrgUnits } from '../../hooks/use-org-units';
import { Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { UserList } from './UserList';
import { UserCreateDialog } from './UserCreateDialog';
import { useTranslate } from '@/hooks/useTranslate';

// This is a Smart Component
// It handles Server State (React Query) and API interaction.
export function UserManager() {
    const { t } = useTranslate();
    const { data: users, isLoading: isLoadingUsers } = useUsers();
    const { data: roles, isLoading: isLoadingRoles } = useRoles();
    const { data: orgUnits, isLoading: isLoadingOrgUnits } = useOrgUnits();

    const createUser = useCreateUser();
    const assignRole = useAssignRole();
    const revokeRole = useRevokeRole();
    const updateUser = useUpdateUser();

    if (isLoadingUsers || isLoadingRoles || isLoadingOrgUnits) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
        );
    }

    const handleCreate = async (payload: {
        name: string;
        email: string;
        password?: string;
    }) => {
        try {
            await createUser.mutateAsync(payload);
            toast.success(t('User created successfully'));
        } catch (error) {
            toast.error(t('Failed to create user'));
            throw error;
        }
    };

    const handleAssignRole = async (payload: {
        user_id: string;
        role_id: string;
        context_type?: string | null;
        context_id?: string | null;
    }) => {
        try {
            await assignRole.mutateAsync(payload);
            toast.success(t('Role assigned to user successfully'));
        } catch (error) {
            toast.error(t('Failed to assign role'));
            throw error;
        }
    };

    const handleRevokeRole = async (payload: {
        user_id: string;
        role_id: string;
        context_type?: string | null;
        context_id?: string | null;
    }) => {
        try {
            await revokeRole.mutateAsync(payload);
            toast.success(t('Role revoked from user successfully'));
        } catch (error) {
            toast.error(t('Failed to revoke role'));
            throw error;
        }
    };

    const handleUpdateUser = async (payload: {
        id: string;
        org_unit_id: string | null;
    }) => {
        try {
            await updateUser.mutateAsync(payload);
            toast.success(t('User updated successfully'));
        } catch (error) {
            toast.error(t('Failed to update user'));
            throw error;
        }
    };

    // Flatten orgUnits tree for the dropdown
    const flattenUnits = (units: any[]): { id: string; name: string }[] => {
        let result: { id: string; name: string }[] = [];
        units.forEach((u) => {
            result.push({ id: u.id, name: u.name });
            if (u.children?.length) {
                result = [...result, ...flattenUnits(u.children)];
            }
        });
        return result;
    };

    const flatOrgUnits = flattenUnits(orgUnits || []);

    return (
        <div className="space-y-4">
            <UserList
                users={users || []}
                roles={roles || []}
                orgUnits={flatOrgUnits}
                isAssigning={assignRole.isPending}
                isRevoking={revokeRole.isPending}
                isUpdating={updateUser.isPending}
                onAssignRole={handleAssignRole}
                onRevokeRole={handleRevokeRole}
                onUpdateUser={handleUpdateUser}
            />
        </div>
    );
}
