import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { Issue } from '@/types/issue';

export interface CreateIssuePayload {
    project_id?: string;
    title: string;
    description?: string | null;
    issue_type_id: string;
    priority_id: string;
    status_id?: string;
    assignee_id?: string | null;
    original_estimate_seconds?: number | null;
    remaining_estimate_seconds?: number | null;
    start_date?: string | null;
    due_date?: string | null;
    parent_id?: string | null;
}

export interface UpdateIssuePayload extends Partial<CreateIssuePayload> {
    status_id: string; // Wajib saat edit
    sprint_id?: string | null;
    original_estimate_seconds?: number | null;
    assignee_id?: string | null;
    start_date?: string | null;
    due_date?: string | null;
    parent_id?: string | null;
}

export const useIssues = (projectId: string) => {
    const queryClient = useQueryClient();
    const queryKey = ['projects', projectId, 'issues'];

    // GET: Fetch all issues for a project
    const {
        data: issues = [],
        isLoading,
        error,
    } = useQuery<Issue[]>({
        queryKey,
        queryFn: async () => {
            const { data } = await axios.get(
                `/api/projects/${projectId}/issues`,
                { params: { per_page: 500 } },
            );
            // Handle both Laravel resource format { data: [...] } and raw array [...]
            return data.data ? data.data : data;
        },
        enabled: !!projectId,
    });

    // POST: Create a new issue
    const createMutation = useMutation({
        mutationFn: async (payload: CreateIssuePayload) => {
            const { data } = await axios.post(
                `/api/projects/${projectId}/issues`,
                payload,
            );
            return data.data ? data.data : data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    // PUT: Update an existing issue
    const updateMutation = useMutation({
        mutationFn: async ({
            id,
            payload,
        }: {
            id: string;
            payload: UpdateIssuePayload;
        }) => {
            const { data } = await axios.put(`/api/issues/${id}`, payload);
            return data.data ? data.data : data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            queryClient.invalidateQueries({ queryKey: ['sprints'] });
        },
    });

    // DELETE: Delete an issue
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await axios.delete(`/api/issues/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    // POST: Assign issue
    const assignMutation = useMutation({
        mutationFn: async ({
            id,
            assigneeId,
        }: {
            id: string;
            assigneeId: string | null;
        }) => {
            const { data } = await axios.post(`/api/issues/${id}/assign`, {
                assignee_id: assigneeId,
            });
            return data.data ? data.data : data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            queryClient.invalidateQueries({ queryKey: ['sprints'] });
            queryClient.invalidateQueries({
                queryKey: ['projects', projectId, 'activity'],
            }); // Invalidate activity for audit trail
        },
    });

    // POST: Transition issue status
    const transitionMutation = useMutation({
        mutationFn: async ({
            id,
            toStatusId,
        }: {
            id: string;
            toStatusId: string;
        }) => {
            const { data } = await axios.post(`/api/issues/${id}/transition`, {
                to_status_id: toStatusId,
            });
            return data.data ? data.data : data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            queryClient.invalidateQueries({ queryKey: ['sprints'] });
        },
    });

    // POST: Log work
    const logWorkMutation = useMutation({
        mutationFn: async ({
            id,
            payload,
        }: {
            id: string;
            payload: {
                time_spent_seconds: number;
                description: string;
                started_at: string;
            };
        }) => {
            const { data } = await axios.post(
                `/api/issues/${id}/worklogs`,
                payload,
            );
            return data.data ? data.data : data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    return {
        issues,
        isLoading,
        error,
        createIssue: createMutation.mutateAsync,
        updateIssue: updateMutation.mutateAsync,
        deleteIssue: deleteMutation.mutateAsync,
        transitionIssue: transitionMutation.mutateAsync,
        assignIssue: assignMutation.mutateAsync,
        logWork: logWorkMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isTransitioning: transitionMutation.isPending,
        isLoggingWork: logWorkMutation.isPending,
    };
};

export interface Worklog {
    id: string;
    issue_id: string;
    user_id: string;
    author: {
        id: string;
        name: string;
    };
    time_spent_seconds: number;
    description: string;
    started_at: string;
    created_at: string;
}

export const useIssueWorklogs = (issueId: string | null) => {
    const queryKey = ['issues', issueId, 'worklogs'];

    return useQuery<Worklog[]>({
        queryKey,
        queryFn: async () => {
            const { data } = await axios.get(`/api/issues/${issueId}/worklogs`);
            return data.data ? data.data : data;
        },
        enabled: !!issueId,
    });
};

export const useBulkUpdateIssues = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            issueIds,
            payload,
        }: {
            issueIds: string[];
            payload: Partial<UpdateIssuePayload>;
        }) => {
            await axios.post('/api/issues/bulk-update', {
                issue_ids: issueIds,
                ...payload,
                ...('assignee_id' in payload
                    ? {
                          assignee_id:
                              payload.assignee_id === 'unassigned'
                                  ? null
                                  : payload.assignee_id,
                      }
                    : {}),
            });
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspaces'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['sprints'] });
        },
    });
};
