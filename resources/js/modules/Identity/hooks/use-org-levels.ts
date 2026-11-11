import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';

export type OrgLevel = {
    id: string;
    name: string;
    slug: string;
    depth: number;
    is_leaf: boolean;
    can_own_workspace: boolean;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
};

type CreateOrgLevelPayload = Omit<OrgLevel, 'id' | 'created_at' | 'updated_at'>;
type UpdateOrgLevelPayload = Partial<CreateOrgLevelPayload> & { id: string };

export function useOrgLevels() {
    return useQuery({
        queryKey: ['org-levels'],
        queryFn: async () => {
            const { data } = await axios.get('/api/org-levels');
            // Assuming standard Laravel api resource wrapper: data.data
            return (data.data ?? data) as OrgLevel[];
        },
    });
}

export function useCreateOrgLevel() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: CreateOrgLevelPayload) => {
            const { data } = await axios.post('/api/org-levels', payload);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['org-levels'] });
        },
    });
}

export function useUpdateOrgLevel() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...payload }: UpdateOrgLevelPayload) => {
            const { data } = await axios.put(`/api/org-levels/${id}`, payload);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['org-levels'] });
        },
    });
}

export function useDeleteOrgLevel() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await axios.delete(`/api/org-levels/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['org-levels'] });
        },
    });
}
