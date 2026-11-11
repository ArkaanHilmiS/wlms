import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';

export interface IssueComment {
    id: string;
    issue_id: string;
    user_id: string;
    author: {
        id: string;
        name: string;
    };
    body: string;
    created_at: string;
    updated_at: string;
}

export const useIssueComments = (issueId: string | null) => {
    const queryClient = useQueryClient();
    const queryKey = ['issues', issueId, 'comments'];

    // GET: Fetch all comments for an issue
    const {
        data: comments = [],
        isLoading,
        error,
    } = useQuery<IssueComment[]>({
        queryKey,
        queryFn: async () => {
            const { data } = await axios.get(`/api/issues/${issueId}/comments`);
            return data.data ? data.data : data;
        },
        enabled: !!issueId,
    });

    // POST: Add a new comment
    const addCommentMutation = useMutation({
        mutationFn: async (payload: { body: string }) => {
            const { data } = await axios.post(
                `/api/issues/${issueId}/comments`,
                payload,
            );
            return data.data ? data.data : data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    return {
        comments,
        isLoading,
        error,
        addComment: addCommentMutation.mutateAsync,
        isAdding: addCommentMutation.isPending,
    };
};
