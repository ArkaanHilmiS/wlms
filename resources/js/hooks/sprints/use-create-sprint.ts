import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';

export interface CreateSprintPayload {
    project_id: string;
    name: string;
    goal?: string;
}

export function useCreateSprint() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateSprintPayload) => {
            const response = await axios.post('/api/sprints', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sprints'] });
        },
    });
}
