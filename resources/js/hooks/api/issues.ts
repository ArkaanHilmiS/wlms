import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { toast } from 'sonner';

export function useMyWorkspaces() {
    return useQuery({
        queryKey: ['workspaces'],
        queryFn: async () => {
            const { data } = await axios.get('/api/workspaces');
            return data.data || data; // handle typical laravel response
        },
    });
}

export function useWorkspaceProjects(workspaceId: string | number | null) {
    return useQuery({
        queryKey: ['workspace', workspaceId, 'projects'],
        queryFn: async () => {
            const { data } = await axios.get(
                `/api/workspaces/${workspaceId}/projects`,
            );
            return data.data || data;
        },
        enabled: !!workspaceId,
    });
}

export function useProjectLookups(projectId: string | number | null) {
    return useQuery({
        queryKey: ['project', projectId, 'lookups'],
        queryFn: async () => {
            const { data } = await axios.get(
                `/api/projects/${projectId}/lookups`,
            );
            return data.data || data;
        },
        enabled: !!projectId,
    });
}

export interface GlobalCreateIssuePayload {
    project_id: string;
    title: string;
    description?: string | null;
    issue_type_id: string;
    priority_id: string;
    assignee_id?: string | null;
    start_date?: string | null;
    due_date?: string | null;
    parent_id?: string | null;
}

export type LinkType = 'BLOCKS' | 'IS_BLOCKED_BY' | 'RELATES_TO' | 'DUPLICATES';

export interface IssueRef {
    id: string;
    key: string;
    title: string;
    status_name: string;
    status_category: string;
}

export interface SimilarIssue extends IssueRef {
    score: number;
}

export interface IssueLinkItem {
    id: string;
    link_type: LinkType;
    direction: 'outgoing' | 'incoming';
    issue: IssueRef;
}

export interface IssueLinksData {
    links: IssueLinkItem[];
    subtasks: (IssueRef & { assignee_name: string | null })[];
}

export function useSimilarIssues(
    projectId: string | number | null | undefined,
    title: string,
) {
    const [debounced, setDebounced] = useState(title);
    useEffect(() => {
        const h = setTimeout(() => setDebounced(title), 350);
        return () => clearTimeout(h);
    }, [title]);

    const q = debounced.trim();
    return useQuery<SimilarIssue[]>({
        queryKey: ['projects', projectId, 'similar-issues', q],
        queryFn: async () => {
            const { data } = await axios.get(
                `/api/projects/${projectId}/issues/similar`,
                { params: { title: q } },
            );
            return data.data ?? [];
        },
        enabled: !!projectId && q.length >= 4,
        staleTime: 30_000,
    });
}

export function useIssueLinks(issueId: string | null | undefined) {
    return useQuery<IssueLinksData>({
        queryKey: ['issues', issueId, 'links'],
        queryFn: async () => {
            const { data } = await axios.get(`/api/issues/${issueId}/links`);
            return data.data;
        },
        enabled: !!issueId,
    });
}

export function useAddIssueLink() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            issueId,
            targetIssueId,
            linkType,
        }: {
            issueId: string;
            targetIssueId: string;
            linkType: LinkType;
        }) => {
            const { data } = await axios.post(`/api/issues/${issueId}/links`, {
                target_issue_id: targetIssueId,
                link_type: linkType,
            });
            return data.data ?? data;
        },
        onSuccess: (_d, v) => {
            queryClient.invalidateQueries({
                queryKey: ['issues', v.issueId, 'links'],
            });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });
}

export function useRemoveIssueLink() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            issueId,
            linkId,
        }: {
            issueId: string;
            linkId: string;
        }) => {
            await axios.delete(`/api/issues/${issueId}/links/${linkId}`);
        },
        onSuccess: (_d, v) => {
            queryClient.invalidateQueries({
                queryKey: ['issues', v.issueId, 'links'],
            });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });
}

export function useCreateIssue() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: GlobalCreateIssuePayload | Record<string, unknown>) => {
            const { data } = await axios.post('/api/issues', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            toast.success('Issue created successfully');
        },
    });
}
