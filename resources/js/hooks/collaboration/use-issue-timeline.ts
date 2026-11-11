import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export type TimelineItem = {
    type: 'comment' | 'audit_log';
    id: string;
    actorId: string | null;
    createdAt: string;
    payload: any;
};

export function useIssueTimeline(issueId: string) {
    return useQuery({
        queryKey: ['issues', issueId, 'timeline'],
        queryFn: async () => {
            const { data } = await axios.get<{ data: TimelineItem[] }>(
                `/api/issues/${issueId}/timeline`,
            );
            return data.data;
        },
        enabled: Boolean(issueId),
    });
}
