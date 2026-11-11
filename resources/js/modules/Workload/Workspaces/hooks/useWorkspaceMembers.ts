import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';

export interface UpdateWorkspaceMemberPayload {
    role?: string;
    daily_capacity_hours?: number;
}
export interface WorkspaceMember {
    id: string; // User ID
    name: string;
    email: string;
    role: string;
    daily_capacity_hours?: number;
}

export interface WorkspaceMemberCollection {
    data: WorkspaceMember[];
}

export function useGetWorkspaceMembers(workspaceId: string) {
    return useQuery({
        queryKey: ['workspace-members', workspaceId],
        queryFn: async () => {
            const response = await axios.get<WorkspaceMemberCollection>(
                `/api/workspaces/${workspaceId}/members`,
            );
            return response.data.data;
        },
        enabled: !!workspaceId,
    });
}

export function useAddWorkspaceMember(workspaceId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: { user_id: string; role?: string }) => {
            const response = await axios.post(
                `/api/workspaces/${workspaceId}/members`,
                payload,
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['workspace-members', workspaceId],
            });
        },
    });
}

export function useRemoveWorkspaceMember(workspaceId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userId: string) => {
            const response = await axios.delete(
                `/api/workspaces/${workspaceId}/members/${userId}`,
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['workspace-members', workspaceId],
            });
        },
    });
}

export const useUpdateWorkspaceMember = (workspaceId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            userId,
            payload,
        }: {
            userId: string;
            payload: UpdateWorkspaceMemberPayload;
        }) => {
            const { data } = await axios.put(
                `/api/workspaces/${workspaceId}/members/${userId}`,
                payload,
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['workspace-members', workspaceId],
            });
            // Juga invalidate workload query jika ada
            queryClient.invalidateQueries({ queryKey: ['sprints'] });
        },
    });
};
