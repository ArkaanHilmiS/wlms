import React, { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import {
    useWorkspaceIssues,
    WorkspaceIssuesFilter,
} from '@/modules/Workload/Workspaces/hooks/useWorkspaceIssues';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
    IssueFormDialog,
    SelectOption,
} from '@/modules/Workload/Issues/components/IssueFormDialog';
import { Plus } from 'lucide-react';
import { CreateIssuePayload } from '@/modules/Workload/Issues/hooks/useIssues';
import axios from '@/lib/axios';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslate } from '@/hooks/useTranslate';

interface WorkspaceLookups {
    projects: SelectOption[];
    issueTypes: SelectOption[];
    priorities: SelectOption[];
    statuses: SelectOption[];
    assignees?: SelectOption[];
    users?: SelectOption[];
}

export default function WorkspaceIssues() {
    const { t } = useTranslate();
    const { workspace_id, lookups, auth } = usePage().props as unknown as {
        workspace_id: string;
        lookups: WorkspaceLookups;
        auth: { user: { id: string } };
    };
    const [filters, setFilters] = useState<WorkspaceIssuesFilter>({});
    const [activeTab, setActiveTab] = useState('All');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const queryClient = useQueryClient();

    const { data: issues = [], isLoading } = useWorkspaceIssues(
        workspace_id,
        filters,
    );

    const handleFilterChange = (tabName: string) => {
        setActiveTab(tabName);
        switch (tabName) {
            case 'All':
                setFilters({});
                break;
            case 'Assigned to Me':
                setFilters({ assignee_id: [auth.user.id] });
                break;
            case 'To Do':
                setFilters({ status_category: ['To Do'] });
                break;
            case 'In Progress':
                setFilters({ status_category: ['In Progress'] });
                break;
            case 'Done':
                setFilters({ status_category: ['Done'] });
                break;
        }
    };

    const handleCreateIssue = async (payload: CreateIssuePayload) => {
        setIsCreating(true);
        try {
            // Need to handle project_id from payload since we are in global workspace
            const projectId = payload.project_id;
            if (!projectId) {
                toast.error(t('Project is required'));
                return;
            }
            await axios.post(`/api/projects/${projectId}/issues`, payload);
            toast.success(t('Issue created successfully'));
            queryClient.invalidateQueries({
                queryKey: ['workspaces', workspace_id, 'issues'],
            });
            setIsCreateOpen(false);
        } catch (error) {
            toast.error(t('Failed to create issue'));
        } finally {
            setIsCreating(false);
        }
    };

    const tabs = ['All', 'Assigned to Me', 'To Do', 'In Progress', 'Done'];

    return (
        <>
            <Head title={t('All Tasks')} />

            <div className="flex h-full w-full flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {t('All Tasks')}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {t('Global view of issues across the workspace.')}
                        </p>
                    </div>

                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('Create Issue')}
                    </Button>
                </div>

                <div className="flex space-x-2">
                    {tabs.map((tab) => (
                        <Button
                            key={tab}
                            variant={activeTab === tab ? 'default' : 'outline'}
                            onClick={() => handleFilterChange(tab)}
                        >
                            {t(tab)}
                        </Button>
                    ))}
                </div>

                <div className="bg-card text-card-foreground rounded-md border shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Project')}</TableHead>
                                <TableHead>{t('Key/Title')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead>{t('Priority')}</TableHead>
                                <TableHead>{t('Type')}</TableHead>
                                <TableHead>{t('Assignee')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="text-muted-foreground py-8 text-center"
                                    >
                                        {t('Loading...')}
                                    </TableCell>
                                </TableRow>
                            ) : issues.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="text-muted-foreground py-8 text-center"
                                    >
                                        {t('No tasks found.')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                issues.map((issue: any) => (
                                    <TableRow key={issue.id}>
                                        <TableCell>
                                            {issue.project?.name || t('N/A')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {issue.title}
                                            </div>
                                            <div className="text-muted-foreground text-xs">
                                                {issue.id}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {issue.status?.name}
                                        </TableCell>
                                        <TableCell>
                                            {issue.priority?.name}
                                        </TableCell>
                                        <TableCell>
                                            {issue.issue_type?.name}
                                        </TableCell>
                                        <TableCell>
                                            {issue.assignee?.name ||
                                                t('Unassigned')}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <IssueFormDialog
                    isOpen={isCreateOpen}
                    onClose={() => setIsCreateOpen(false)}
                    onSubmit={(payload) =>
                        handleCreateIssue(payload as CreateIssuePayload)
                    }
                    isLoading={isCreating}
                    projects={lookups.projects}
                    issueTypes={lookups.issueTypes}
                    priorities={lookups.priorities}
                    statuses={lookups.statuses}
                    assignees={lookups.users || lookups.assignees || []}
                />
            </div>
        </>
    );
}

import AppLayout from '@/layouts/app-layout';

WorkspaceIssues.layout = (page: any) => {
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Workspaces', href: '/workspaces' },
                { title: 'Global Issues', href: '#' },
            ]}
        >
            {page}
        </AppLayout>
    );
};
