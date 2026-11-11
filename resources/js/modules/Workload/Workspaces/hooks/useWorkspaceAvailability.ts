import { useQueries } from '@tanstack/react-query';
import axios from '@/lib/axios';

export interface WorkspaceMemberAvailability {
    user_id: number;
    name: string;
    email: string;
    role: string;
    daily_capacity_hours: number;
    weekly_capacity_hours: number;
    allocated_hours: number;
    available_hours: number;
    open_task_count: number;
}

export const WORKSPACE_AVAILABILITY_QUERY_KEY = 'workspace-availability';

/**
 * Mengambil rekap jam tersedia anggota untuk beberapa ruang kerja sekaligus.
 * Urutan hasil mengikuti urutan `workspaceIds`.
 */
export function useWorkspaceAvailability(workspaceIds: string[]) {
    return useQueries({
        queries: workspaceIds.map((workspaceId) => ({
            queryKey: [WORKSPACE_AVAILABILITY_QUERY_KEY, workspaceId],
            queryFn: async (): Promise<WorkspaceMemberAvailability[]> => {
                const response = await axios.get<{
                    data: WorkspaceMemberAvailability[];
                }>(`/api/workspaces/${workspaceId}/availability`);
                return response.data.data;
            },
            staleTime: 60 * 1000,
        })),
    });
}
