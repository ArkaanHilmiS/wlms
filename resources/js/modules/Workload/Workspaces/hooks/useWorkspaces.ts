import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import {
    Workspace,
    WorkspaceCollectionResource,
    CreateWorkspacePayload,
    WorkspaceResource,
} from '../types';

export const WORKSPACES_QUERY_KEY = ['workspaces'];

export function useGetWorkspaces() {
    return useQuery({
        queryKey: WORKSPACES_QUERY_KEY,
        queryFn: async (): Promise<Workspace[]> => {
            const response = await axios.get('/api/workspaces');

            // Backend might return the array directly or wrapped in `data`
            const dataArray = Array.isArray(response.data)
                ? response.data
                : response.data?.data || [];

            return dataArray.map((item: any) => ({
                id: item.id,
                name: item.name,
                status: item.status,
                owner_group_id: item.owner_group_id || item.ownerGroupId,
                ownerGroupId: item.owner_group_id || item.ownerGroupId,
            }));
        },
    });
}

export function useCreateWorkspace() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (
            payload: CreateWorkspacePayload,
        ): Promise<Workspace> => {
            const response = await axios.post('/api/workspaces', payload);
            const item = response.data?.data || response.data;

            return {
                id: item.id,
                name: item.name,
                status: item.status,
                owner_group_id: item.owner_group_id || item.ownerGroupId,
                ownerGroupId: item.owner_group_id || item.ownerGroupId,
            };
        },
        onSuccess: () => {
            // Invalidate the cache to trigger a refetch of the list
            queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
        },
    });
}

export function useUpdateWorkspace() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            payload,
        }: {
            id: string;
            payload: { name: string };
        }): Promise<Workspace> => {
            const response = await axios.put(`/api/workspaces/${id}`, payload);
            const item = response.data?.data || response.data;

            return {
                id: item.id,
                name: item.name,
                status: item.status,
                owner_group_id: item.owner_group_id || item.ownerGroupId,
                ownerGroupId: item.owner_group_id || item.ownerGroupId,
            };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
        },
    });
}

export function useArchiveWorkspace() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string): Promise<void> => {
            await axios.delete(`/api/workspaces/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
        },
    });
}
