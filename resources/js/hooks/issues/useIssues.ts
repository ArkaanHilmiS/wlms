import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import {
    Issue,
    BoardColumn,
    Transition,
    CreateIssuePayload,
    TransitionIssuePayload,
    AssignIssuePayload,
} from '../../types/issue';

export const useBoardIssues = (projectId: string, sprintId?: string) => {
    return useQuery<BoardColumn[], Error>({
        queryKey: ['board', projectId, sprintId],
        queryFn: async () => {
            const params = sprintId ? { sprint_id: sprintId } : {};
            const { data } = await axios.get(
                `/api/projects/${projectId}/board`,
                { params },
            );
            return data;
        },
        enabled: !!projectId,
    });
};

export const useCreateIssue = () => {
    const queryClient = useQueryClient();
    return useMutation<Issue, Error, CreateIssuePayload>({
        mutationFn: async (payload) => {
            const { data } = await axios.post('/api/issues', payload);
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['board', variables.project_id],
            });
        },
    });
};

export const useTransitionIssue = (projectId: string, sprintId?: string) => {
    const queryClient = useQueryClient();
    return useMutation<
        void,
        Error,
        { issueId: string; payload: TransitionIssuePayload },
        { previousBoard: BoardColumn[] | undefined }
    >({
        mutationFn: async ({ issueId, payload }) => {
            await axios.post(`/api/issues/${issueId}/transition`, payload);
        },
        onMutate: async ({ issueId, payload }) => {
            const queryKey = ['board', projectId, sprintId];
            await queryClient.cancelQueries({ queryKey });

            const previousBoard =
                queryClient.getQueryData<BoardColumn[]>(queryKey);

            queryClient.setQueryData<BoardColumn[]>(queryKey, (oldData) => {
                if (!oldData) return oldData;
                const newColumns = JSON.parse(
                    JSON.stringify(oldData),
                ) as BoardColumn[];

                let activeColumnIndex = -1;
                let activeIssueIndex = -1;

                for (let i = 0; i < newColumns.length; i++) {
                    const idx = newColumns[i].issues.findIndex(
                        (issue) => issue.id === issueId,
                    );
                    if (idx !== -1) {
                        activeColumnIndex = i;
                        activeIssueIndex = idx;
                        break;
                    }
                }

                if (activeColumnIndex === -1) return newColumns;

                const activeIssue =
                    newColumns[activeColumnIndex].issues[activeIssueIndex];
                const toStatusId = payload.to_status_id;
                const overColumnIndex = newColumns.findIndex(
                    (col) => col.id === toStatusId,
                );

                if (
                    activeColumnIndex !== overColumnIndex &&
                    overColumnIndex !== -1
                ) {
                    activeIssue.status_id = toStatusId;
                    newColumns[activeColumnIndex].issues.splice(
                        activeIssueIndex,
                        1,
                    );
                    newColumns[overColumnIndex].issues.push(activeIssue);
                }

                return newColumns;
            });

            return { previousBoard };
        },
        onError: (err, variables, context) => {
            if (context?.previousBoard) {
                queryClient.setQueryData(
                    ['board', projectId, sprintId],
                    context.previousBoard,
                );
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({
                queryKey: ['board', projectId, sprintId],
            });
        },
    });
};

export const useAssignIssue = (projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation<
        void,
        Error,
        { issueId: string; payload: AssignIssuePayload }
    >({
        mutationFn: async ({ issueId, payload }) => {
            await axios.post(`/api/issues/${issueId}/assign`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['board', projectId] });
        },
    });
};

export const useValidTransitions = (issueId: string) => {
    return useQuery<Transition[], Error>({
        queryKey: ['transitions', issueId],
        queryFn: async () => {
            const { data } = await axios.get(
                `/api/issues/${issueId}/transitions`,
            );
            return data;
        },
        enabled: !!issueId,
    });
};
