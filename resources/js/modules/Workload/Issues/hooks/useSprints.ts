import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { Sprint, CreateSprintPayload } from '@/types/sprint';

export interface UpdateSprintPayload {
    name: string;
    goal?: string;
    start_date?: string;
    end_date?: string;
}

export const useSprints = (projectId: string) => {
    const queryClient = useQueryClient();
    const queryKey = ['projects', projectId, 'sprints'];

    // GET: Fetch all sprints for a project
    const {
        data: sprints = [],
        isLoading,
        error,
    } = useQuery<Sprint[]>({
        queryKey,
        queryFn: async () => {
            const { data } = await axios.get(
                `/api/projects/${projectId}/sprints`,
            );
            return data.data ? data.data : data;
        },
        enabled: !!projectId,
    });

    // POST: Create a new sprint
    const createMutation = useMutation({
        mutationFn: async (payload: CreateSprintPayload) => {
            const { data } = await axios.post(`/api/sprints`, payload);
            return data.data ? data.data : data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            queryClient.invalidateQueries({
                queryKey: ['projects', projectId, 'issues'],
            });
            queryClient.invalidateQueries({ queryKey: ['sprints'] });
        },
    });

    // PUT: Update sprint
    const updateMutation = useMutation({
        mutationFn: async ({
            id,
            payload,
        }: {
            id: string;
            payload: UpdateSprintPayload;
        }) => {
            const { data } = await axios.put(`/api/sprints/${id}`, payload);
            return data.data ? data.data : data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            queryClient.invalidateQueries({
                queryKey: ['projects', projectId, 'issues'],
            });
            queryClient.invalidateQueries({ queryKey: ['sprints'] });
        },
    });

    // PUT: Start sprint
    const startMutation = useMutation({
        mutationFn: async (sprintId: string) => {
            const { data } = await axios.put(`/api/sprints/${sprintId}/start`);
            return data.data ? data.data : data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            queryClient.invalidateQueries({
                queryKey: ['projects', projectId, 'issues'],
            });
            queryClient.invalidateQueries({ queryKey: ['sprints'] });
        },
    });

    // PUT: Complete sprint
    const completeMutation = useMutation({
        mutationFn: async ({
            sprintId,
            moveToSprintId,
        }: {
            sprintId: string;
            moveToSprintId: string | null;
        }) => {
            const { data } = await axios.put(
                `/api/sprints/${sprintId}/complete`,
                { move_to_sprint_id: moveToSprintId },
            );
            return data.data ? data.data : data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            queryClient.invalidateQueries({
                queryKey: ['projects', projectId, 'issues'],
            });
            queryClient.invalidateQueries({ queryKey: ['sprints'] });
        },
    });

    return {
        sprints,
        isLoading,
        error,
        createSprint: createMutation.mutateAsync,
        updateSprint: updateMutation.mutateAsync,
        startSprint: startMutation.mutateAsync,
        completeSprint: completeMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isStarting: startMutation.isPending,
        isCompleting: completeMutation.isPending,
    };
};

export interface SprintWorkloadMember {
    user_id: string;
    name: string;
    avatar: string | null;
    capacity_seconds: number;
    allocated_seconds: number;
}

export const useSprintWorkload = (sprintId: string | null) => {
    const queryKey = ['sprints', sprintId, 'workload'];

    return useQuery<SprintWorkloadMember[]>({
        queryKey,
        queryFn: async () => {
            const { data } = await axios.get(
                `/api/sprints/${sprintId}/workload`,
            );
            return data.data ? data.data : data;
        },
        enabled: !!sprintId,
    });
};
