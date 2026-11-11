import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';

type AddCommentVariables = {
    issueId: string;
    body: string;
    parentId?: string;
};

export function useAddComment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            issueId,
            body,
            parentId,
        }: AddCommentVariables) => {
            const { data } = await axios.post(
                `/api/issues/${issueId}/comments`,
                {
                    body,
                    parent_id: parentId,
                },
            );
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['issues', variables.issueId, 'timeline'],
            });
        },
    });
}
