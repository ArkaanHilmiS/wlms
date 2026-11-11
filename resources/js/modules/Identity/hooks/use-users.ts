import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';

export type User = {
    id: number | string;
    uuid: string;
    name: string;
    email: string;
    org_unit_id?: string | null;
    org_unit_name?: string | null;
    roles: string[];
    user_roles?: {
        role_id: string;
        role_name: string;
        context_type?: string | null;
        context_id?: string | null;
    }[];
    created_at: string;
    updated_at: string;
};

export type BulkUserItem = {
    name: string;
    email: string;
    password?: string;
    org_unit_id?: string | null;
    role_id?: string | null;
};

export type BulkCreateUsersPayload = {
    users: BulkUserItem[];
    default_password?: string;
    default_org_unit_id?: string | null;
    default_role_id?: string | null;
    skip_duplicates?: boolean;
};

export type BulkCreateUsersResponse = {
    total_requested: number;
    created_count: number;
    skipped_count: number;
    created_users: { id: string | number; name: string; email: string }[];
    skipped_users: { email: string; reason: string }[];
};

export function useUsers() {
    return useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const { data } = await axios.get('/api/rbac/users');
            return data.data as User[];
        },
    });
}

export function useCreateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            name: string;
            email: string;
            password?: string;
            org_unit_id?: number;
        }) => {
            const { data } = await axios.post('/api/rbac/users', payload);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

export function useBulkCreateUsers() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: BulkCreateUsersPayload) => {
            const { data } = await axios.post('/api/rbac/users/bulk', payload);
            return data.data as BulkCreateUsersResponse;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

export function useUpdateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            ...payload
        }: {
            id: string | number;
            name?: string;
            email?: string;
            org_unit_id?: string | null;
        }) => {
            const { data } = await axios.put(`/api/rbac/users/${id}`, payload);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

export function useAssignRole() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            user_id: string;
            role_id: string;
            context_type?: string | null;
            context_id?: string | null;
        }) => {
            const { data } = await axios.post(
                '/api/rbac/user-roles/assign',
                payload,
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

export function useRevokeRole() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            user_id: string;
            role_id: string;
            context_type?: string | null;
            context_id?: string | null;
        }) => {
            const { data } = await axios.post(
                '/api/rbac/user-roles/revoke',
                payload,
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}
