import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { OrgLevel } from './use-org-levels';

export type OrgUnit = {
    id: string;
    parent_id: string | null;
    org_level_id: string;
    name: string;
    code: string;
    is_active: boolean;
    max_workspaces?: number;
    level?: OrgLevel;
    children?: OrgUnit[];
    created_at?: string;
    updated_at?: string;
};

type CreateOrgUnitPayload = Omit<
    OrgUnit,
    'id' | 'level' | 'children' | 'created_at' | 'updated_at'
>;
type UpdateOrgUnitPayload = Partial<CreateOrgUnitPayload> & { id: string };

export function useOrgUnits() {
    return useQuery({
        queryKey: ['org-units'],
        queryFn: async () => {
            const { data } = await axios.get('/api/org-units');
            // Using data.data assuming Laravel Resource Collection
            return (data.data ?? data) as OrgUnit[];
        },
    });
}

export function useCreateOrgUnit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: CreateOrgUnitPayload) => {
            const { data } = await axios.post('/api/org-units', payload);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['org-units'] });
        },
    });
}

export function useUpdateOrgUnit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...payload }: UpdateOrgUnitPayload) => {
            const { data } = await axios.put(`/api/org-units/${id}`, payload);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['org-units'] });
        },
    });
}

export function useDeleteOrgUnit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await axios.delete(`/api/org-units/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['org-units'] });
        },
    });
}
