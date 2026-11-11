import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';

export interface CreateProjectPayload {
    workspace_id: string;
    key: string;
    name: string;
    description?: string;
    lead_id?: string;
}

export function useCreateProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateProjectPayload) => {
            const response = await axios.post('/api/projects', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });
}
