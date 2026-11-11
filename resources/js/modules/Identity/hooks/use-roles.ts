import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';

import type { Permission } from './use-permissions';

import type { Menu } from './use-menus';

export type Role = {
    id: string;
    name: string;
    scope: 'GLOBAL' | 'WORKSPACE' | 'PROJECT';
    permissions?: Permission[];
    menus?: Menu[];
};

export function useRoles() {
    return useQuery({
        queryKey: ['roles'],
        queryFn: async () => {
            const { data } = await axios.get('/api/rbac/roles');
            return data.data as Role[];
        },
    });
}

export function useCreateRole() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { name: string; scope: string }) => {
            const { data } = await axios.post('/api/rbac/roles', payload);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
        },
    });
}

export function useUpdateRole() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            ...payload
        }: {
            id: string;
            name: string;
            scope: string;
        }) => {
            const { data } = await axios.put(`/api/rbac/roles/${id}`, payload);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
        },
    });
}

export function useDeleteRole() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await axios.delete(`/api/rbac/roles/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
        },
    });
}

export function useSyncPermissions() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            roleId,
            permissionIds,
        }: {
            roleId: string;
            permissionIds: string[];
        }) => {
            const { data } = await axios.put(
                `/api/rbac/roles/${roleId}/permissions`,
                {
                    permission_ids: permissionIds,
                },
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
        },
    });
}

export function useSyncMenus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            roleId,
            menuIds,
        }: {
            roleId: string;
            menuIds: string[];
        }) => {
            const { data } = await axios.put(
                `/api/rbac/roles/${roleId}/menus`,
                {
                    menu_ids: menuIds,
                },
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
        },
    });
}
