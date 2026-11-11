import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import type { Workflow, CreateWorkflowDto } from '../types';

const API_URL = '/api/workflows';

export function useWorkflows() {
    return useQuery({
        queryKey: ['workflows'],
        queryFn: async () => {
            const { data } = await axios.get<{ data: Workflow[] }>(API_URL);
            return (data.data ? data.data : data) as Workflow[];
        },
    });
}

export function useCreateWorkflow() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: CreateWorkflowDto) => {
            const { data } = await axios.post<{ data: Workflow }>(
                API_URL,
                payload,
            );
            return data.data ? data.data : data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflows'] });
        },
    });
}

export function useGetWorkflow(id: string) {
    return useQuery({
        queryKey: ['workflows', id],
        queryFn: async () => {
            const { data } = await axios.get<{ data: Workflow }>(
                `${API_URL}/${id}`,
            );
            return (data.data ? data.data : data) as Workflow;
        },
        enabled: !!id,
    });
}

export function useUpdateWorkflow() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            payload,
        }: {
            id: string;
            payload: Partial<CreateWorkflowDto>;
        }) => {
            const { data } = await axios.put<{ data: Workflow }>(
                `${API_URL}/${id}`,
                payload,
            );
            return data.data ? data.data : data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['workflows'] });
            queryClient.invalidateQueries({
                queryKey: ['workflows', variables.id],
            });
        },
    });
}

export function useDeleteWorkflow() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await axios.delete(`${API_URL}/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflows'] });
        },
    });
}

export function useCreateTransition() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            workflowId,
            payload,
        }: {
            workflowId: string;
            payload: import('../types').CreateTransitionDto;
        }) => {
            const { data } = await axios.post<{
                data: import('../types').Transition;
            }>(`${API_URL}/${workflowId}/transitions`, payload);
            return data.data ? data.data : data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['workflows', variables.workflowId],
            });
        },
    });
}

export function useDeleteTransition() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            workflowId,
            transitionId,
        }: {
            workflowId: string;
            transitionId: string;
        }) => {
            await axios.delete(
                `${API_URL}/${workflowId}/transitions/${transitionId}`,
            );
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['workflows', variables.workflowId],
            });
        },
    });
}
