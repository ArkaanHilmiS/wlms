import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface WorkspaceAnalyticsSummary {
    total_projects: number;
    active_projects: number;
    total_issues: number;
    completed_issues: number;
    completion_rate: number;
    total_estimated_hours: number;
    total_logged_hours: number;
}

export interface WorkspaceAnalyticsProject {
    id: string;
    key: string;
    name: string;
    status: string;
    total_issues: number;
    completed_issues: number;
    progress_percent: number;
    health_status: 'on_track' | 'at_risk' | 'completed' | 'delayed';
}

export interface WorkspaceAnalyticsThroughput {
    period: string;
    completed_count: number;
}

export interface WorkspaceMemberWorkload {
    user_id: number | string;
    name: string;
    email: string;
    task_count: number;
    completed_task_count: number;
    estimated_hours: number;
    logged_hours: number;
    capacity_hours: number;
    utilization_rate: number;
}

export interface WorkspaceAnalyticsResponse {
    summary: WorkspaceAnalyticsSummary;
    projects: WorkspaceAnalyticsProject[];
    throughput: WorkspaceAnalyticsThroughput[];
    member_workload: WorkspaceMemberWorkload[];
    filters: {
        date_range: string;
        start_date: string;
        end_date: string;
    };
}

export interface WorkspaceAnalyticsParams {
    workspaceId: string;
    dateRange?: '7d' | '30d' | 'quarter' | 'custom';
    from?: string;
    to?: string;
}

export function useWorkspaceAnalytics({
    workspaceId,
    dateRange = '30d',
    from,
    to,
}: WorkspaceAnalyticsParams) {
    return useQuery<WorkspaceAnalyticsResponse>({
        queryKey: ['workspace-analytics', workspaceId, dateRange, from, to],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (dateRange) params.append('date_range', dateRange);
            if (from) params.append('from', from);
            if (to) params.append('to', to);

            const response = await axios.get<WorkspaceAnalyticsResponse>(
                `/api/workspaces/${workspaceId}/analytics?${params.toString()}`,
            );
            return response.data;
        },
        enabled: Boolean(workspaceId),
        staleTime: 60 * 1000,
    });
}
