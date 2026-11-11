import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { Project, CreateProjectPayload, UpdateProjectPayload } from '../types';

export const PROJECTS_QUERY_KEY = (workspaceId: string) => [
    'workspaces',
    workspaceId,
    'projects',
];

export function useGetProjects(workspaceId?: string) {
    return useQuery({
        queryKey: PROJECTS_QUERY_KEY(workspaceId || ''),
        queryFn: async (): Promise<Project[]> => {
            if (!workspaceId) return [];
            const response = await axios.get(
                `/api/workspaces/${workspaceId}/projects`,
            );
            const dataArray = Array.isArray(response.data)
                ? response.data
                : response.data?.data || [];

            return dataArray.map((item: any) => ({
                id: item.id,
                workspace_id: item.workspace_id,
                workflow_id: item.workflow_id,
                key: item.key,
                name: item.name,
                description: item.description,
                priority_id: item.priority_id,
                total_issues_count: item.total_issues_count,
                completed_issues_count: item.completed_issues_count,
                start_date: item.start_date,
                end_date: item.end_date,
                created_at: item.created_at,
                updated_at: item.updated_at,
            }));
        },
        enabled: !!workspaceId,
    });
}

export function useCreateProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateProjectPayload): Promise<Project> => {
            const response = await axios.post('/api/projects', payload);
            const item = response.data?.data || response.data;

            return {
                id: item.id,
                workspace_id: item.workspace_id,
                workflow_id: item.workflow_id,
                key: item.key,
                name: item.name,
                description: item.description,
                priority_id: item.priority_id,
                created_at: item.created_at,
                updated_at: item.updated_at,
            };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: PROJECTS_QUERY_KEY(variables.workspace_id),
            });
        },
    });
}

export function useUpdateProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            workspaceId,
            payload,
        }: {
            id: string;
            workspaceId: string;
            payload: UpdateProjectPayload;
        }): Promise<Project> => {
            const response = await axios.put(`/api/projects/${id}`, payload);
            const item = response.data?.data || response.data;

            return {
                id: item.id,
                workspace_id: item.workspace_id,
                workflow_id: item.workflow_id,
                key: item.key,
                name: item.name,
                description: item.description,
                priority_id: item.priority_id,
                created_at: item.created_at,
                updated_at: item.updated_at,
            };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: PROJECTS_QUERY_KEY(variables.workspaceId),
            });
        },
    });
}

export function useDeleteProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            workspaceId,
        }: {
            id: string;
            workspaceId: string;
        }): Promise<void> => {
            await axios.delete(`/api/projects/${id}`);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: PROJECTS_QUERY_KEY(variables.workspaceId),
            });
        },
    });
}
