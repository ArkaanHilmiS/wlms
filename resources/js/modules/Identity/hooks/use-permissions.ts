import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';

export type Permission = {
    id: string;
    name: string;
    description: string | null;
};

export function usePermissions() {
    return useQuery({
        queryKey: ['permissions'],
        queryFn: async () => {
            const { data } = await axios.get('/api/rbac/permissions');
            return data.data as Permission[];
        },
    });
}

export function useSyncRolePermissions() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            roleId,
            permissionIds,
        }: {
            roleId: string;
            permissionIds: string[];
        }) => {
            await axios.post(`/api/rbac/roles/${roleId}/permissions`, {
                permission_ids: permissionIds,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
        },
    });
}
