import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface ProjectAnalyticsSummary {
    total_issues: number;
    completed_issues: number;
    in_progress_issues: number;
    todo_issues: number;
    overdue_issues?: number;
    completion_rate: number;
}

export interface LeadCycleTimeDistribution {
    bucket: string;
    count: number;
}

export interface LeadCycleTimeMetrics {
    average_days: number;
    median_days: number;
    p85_days: number;
    distribution: LeadCycleTimeDistribution[];
}

export interface CumulativeFlowPoint {
    date: string;
    todo: number;
    in_progress: number;
    done: number;
}

export interface IssueTypeBreakdown {
    id: string;
    name: string;
    slug: string;
    count: number;
    color: string;
    percentage: number;
}

export interface PriorityBreakdown {
    id: string;
    name: string;
    slug: string;
    level: number;
    count: number;
    color: string;
    percentage: number;
}

export interface SprintBurndownPoint {
    day: string;
    ideal_points: number;
    actual_points: number | null;
}

export interface SprintVelocityPoint {
    sprint_id: string;
    sprint_name: string;
    committed_points: number;
    completed_points: number;
}

export interface SprintMetrics {
    has_sprints: boolean;
    mode?: 'sprint' | 'non_sprint';
    burndown: SprintBurndownPoint[];
    velocity: SprintVelocityPoint[];
}

export interface ProjectAnalyticsResponse {
    project: {
        id: string;
        key: string;
        name: string;
        status: string;
    };
    summary: ProjectAnalyticsSummary;
    lead_time: LeadCycleTimeMetrics;
    cycle_time: LeadCycleTimeMetrics;
    cumulative_flow: CumulativeFlowPoint[];
    issue_types: IssueTypeBreakdown[];
    priorities: PriorityBreakdown[];
    sprint_metrics: SprintMetrics;
    filters: {
        date_range: string;
        start_date: string;
        end_date: string;
        sprint_id: string | null;
    };
}

export interface ProjectAnalyticsParams {
    projectId: string;
    dateRange?: '7d' | '30d' | 'quarter' | 'custom';
    from?: string;
    to?: string;
    sprintId?: string | null;
}

export function useProjectAnalytics({
    projectId,
    dateRange = '30d',
    from,
    to,
    sprintId,
}: ProjectAnalyticsParams) {
    return useQuery<ProjectAnalyticsResponse>({
        queryKey: [
            'project-analytics',
            projectId,
            dateRange,
            from,
            to,
            sprintId,
        ],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (dateRange) params.append('date_range', dateRange);
            if (from) params.append('from', from);
            if (to) params.append('to', to);
            if (sprintId) params.append('sprint_id', sprintId);

            const response = await axios.get<ProjectAnalyticsResponse>(
                `/api/projects/${projectId}/analytics?${params.toString()}`,
            );
            return response.data;
        },
        enabled: Boolean(projectId),
        staleTime: 60 * 1000,
    });
}
