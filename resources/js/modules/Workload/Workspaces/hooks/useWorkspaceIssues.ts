import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { Issue } from '@/types/issue';

export interface WorkspaceIssuesFilter {
    status_category?: string[];
    assignee_id?: string[];
    // add any other filters here if needed
}

export const useWorkspaceIssues = (
    workspaceId: string | undefined,
    filters?: WorkspaceIssuesFilter,
) => {
    return useQuery<Issue[]>({
        queryKey: ['workspaces', workspaceId, 'issues', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.set('limit', '500');
            if (filters?.status_category) {
                filters.status_category.forEach((cat) =>
                    params.append('status_category[]', cat),
                );
            }
            if (filters?.assignee_id) {
                filters.assignee_id.forEach((id) =>
                    params.append('assignee_id[]', id),
                );
            }

            const { data } = await axios.get(
                `/api/workspaces/${workspaceId}/issues`,
                { params },
            );
            return data.data ? data.data : data;
        },
        enabled: !!workspaceId,
    });
};
