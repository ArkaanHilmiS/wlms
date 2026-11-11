import React, { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { useGlobalIssueModal } from '@/contexts/GlobalIssueModalContext';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import {
    useMyWorkspaces,
    useWorkspaceProjects,
    useProjectLookups,
    useCreateIssue,
    useAddIssueLink,
} from '@/hooks/api/issues';
import { useIssues } from '@/modules/Workload/Issues/hooks/useIssues';
import {
    LinkAfterCreate,
    SimilarIssuesBox,
} from '@/modules/Workload/Issues/components/SimilarIssuesBox';
import { toast } from 'sonner';
import { useTranslate } from '@/hooks/useTranslate';

interface LookupItem {
    id: string | number;
    name?: string;
    user?: { name?: string };
}

interface WorkspaceItem {
    id: string | number;
    name: string;
}

interface ProjectItem {
    id: string | number;
    name: string;
}

interface ProjectContext {
    id?: string;
    workspace_id?: string;
}

interface PagePropsWithProject {
    project?: ProjectContext;
    [key: string]: unknown;
}

export function GlobalIssueCreateModal() {
    const { t } = useTranslate();

    const { isOpen, closeModal } = useGlobalIssueModal();
    const [workspaceId, setWorkspaceId] = useState<string>('');
    const [projectId, setProjectId] = useState<string>('');

    const { props } = usePage<PagePropsWithProject>();
    const activeProject = props.project;

    useEffect(() => {
        if (isOpen && activeProject?.id && activeProject?.workspace_id) {
            setWorkspaceId(activeProject.workspace_id);
            setProjectId(activeProject.id);
        }
    }, [isOpen, activeProject]);

    // Form fields
    const [title, setTitle] = useState('');
    const [typeId, setTypeId] = useState<string>('');
    const [priorityId, setPriorityId] = useState<string>('');
    const [assigneeId, setAssigneeId] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [dueDate, setDueDate] = useState<string>('');
    const [parentId, setParentId] = useState<string>('');
    const [linkAfterCreate, setLinkAfterCreate] =
        useState<LinkAfterCreate | null>(null);
    const addLink = useAddIssueLink();
    const { issues: projectIssues } = useIssues(projectId);
    const parentOptions = projectIssues
        .filter((i) => !i.parent_id)
        .map((i) => ({
            value: i.id,
            label: `${i.key ?? i.id.slice(0, 3)} ${i.title}`,
        }));

    const { data: workspaces, isLoading: isLoadingWorkspaces } =
        useMyWorkspaces();
    const { data: projects, isLoading: isLoadingProjects } =
        useWorkspaceProjects(workspaceId);
    const { data: lookups, isLoading: isLoadingLookups } =
        useProjectLookups(projectId);

    const createIssueMutation = useCreateIssue();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!projectId || !title || !typeId || !priorityId) return;

        createIssueMutation.mutate(
            {
                project_id: projectId,
                title,
                issue_type_id: typeId,
                priority_id: priorityId,
                assignee_id:
                    assigneeId && assigneeId !== 'unassigned'
                        ? assigneeId
                        : null,
                start_date: startDate || null,
                due_date: dueDate || null,
                parent_id: parentId || null,
            },
            {
                onSuccess: (res) => {
                    const newId = res?.data?.id ?? res?.id;
                    if (newId && linkAfterCreate) {
                        addLink.mutate(
                            {
                                issueId: newId,
                                targetIssueId: linkAfterCreate.targetId,
                                linkType: linkAfterCreate.linkType,
                            },
                            {
                                onError: () =>
                                    toast.error(
                                        t('Gagal menautkan tiket serupa'),
                                    ),
                            },
                        );
                    }
                    resetForm();
                    closeModal();
                },
            },
        );
    };

    const resetForm = () => {
        setParentId('');
        setLinkAfterCreate(null);
        setWorkspaceId('');
        setProjectId('');
        setTitle('');
        setTypeId('');
        setPriorityId('');
        setAssigneeId('');
        setStartDate('');
        setDueDate('');
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            closeModal();
            setTimeout(resetForm, 300); // reset after transition
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent
                className="sm:max-w-[500px]"
                onInteractOutside={(e) => {
                    e.preventDefault();
                }}
            >
                <DialogHeader>
                    <DialogTitle>{t('Create New Issue')}</DialogTitle>
                    <DialogDescription>
                        {t('Create a new issue across any of your projects.')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="workspace">{t('Workspace')}</Label>
                        <Combobox
                            id="workspace"
                            options={(workspaces || []).map(
                                (ws: WorkspaceItem) => ({
                                    value: ws.id.toString(),
                                    label: ws.name,
                                }),
                            )}
                            value={workspaceId}
                            disabled={
                                !!activeProject?.workspace_id ||
                                isLoadingWorkspaces
                            }
                            onChange={(val) => {
                                setWorkspaceId(val);
                                setProjectId('');
                                setTypeId('');
                                setPriorityId('');
                                setAssigneeId('');
                            }}
                            placeholder={
                                isLoadingWorkspaces
                                    ? t('Loading workspaces...')
                                    : t('Select Workspace')
                            }
                            emptyText={t('No workspace found.')}
                        />
                    </div>

                    {workspaceId && (
                        <div className="space-y-2">
                            <Label htmlFor="project">{t('Project')}</Label>
                            <Combobox
                                id="project"
                                options={(projects || []).map(
                                    (proj: ProjectItem) => ({
                                        value: proj.id.toString(),
                                        label: proj.name,
                                    }),
                                )}
                                value={projectId}
                                disabled={
                                    !!activeProject?.id || isLoadingProjects
                                }
                                onChange={(val) => {
                                    setProjectId(val);
                                    setTypeId('');
                                    setPriorityId('');
                                    setAssigneeId('');
                                }}
                                placeholder={
                                    isLoadingProjects
                                        ? t('Loading projects...')
                                        : t('Select Project')
                                }
                                emptyText={t('No project found.')}
                            />
                        </div>
                    )}

                    {projectId && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="title">
                                    {t('Issue Title')}
                                </Label>
                                <Input
                                    id="title"
                                    className="w-full"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={t('Enter issue title')}
                                    required
                                />
                                <SimilarIssuesBox
                                    projectId={projectId}
                                    title={title}
                                    value={linkAfterCreate}
                                    onChange={setLinkAfterCreate}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="parent">
                                    {t('Parent issue (sub-task)')}
                                </Label>
                                <Combobox
                                    id="parent"
                                    options={[
                                        { value: '', label: t('None') },
                                        ...parentOptions,
                                    ]}
                                    value={parentId}
                                    onChange={setParentId}
                                    placeholder={t('Search issue...')}
                                    emptyText={t('No issues found.')}
                                />
                            </div>

                            {isLoadingLookups && (
                                <p className="text-muted-foreground text-sm">
                                    {t('Loading options...')}
                                </p>
                            )}

                            {!isLoadingLookups &&
                                lookups &&
                                (() => {
                                    const issueTypes: LookupItem[] =
                                        lookups.issueTypes ||
                                        lookups.types ||
                                        [];
                                    const priorities: LookupItem[] =
                                        lookups.priorities || [];
                                    const assignees: LookupItem[] =
                                        lookups.users || lookups.members || [];

                                    return (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="type">
                                                    {t('Type')} *
                                                </Label>
                                                <Combobox
                                                    id="type"
                                                    options={issueTypes.map(
                                                        (type: LookupItem) => ({
                                                            value: type.id.toString(),
                                                            label:
                                                                type.name ||
                                                                `Type ${type.id}`,
                                                        }),
                                                    )}
                                                    value={typeId}
                                                    onChange={setTypeId}
                                                    placeholder={t(
                                                        'Select Type',
                                                    )}
                                                    emptyText={t(
                                                        'No type found.',
                                                    )}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="priority">
                                                    {t('Priority')} *
                                                </Label>
                                                <Combobox
                                                    id="priority"
                                                    options={priorities.map(
                                                        (
                                                            priority: LookupItem,
                                                        ) => ({
                                                            value: priority.id.toString(),
                                                            label:
                                                                priority.name ||
                                                                `Priority ${priority.id}`,
                                                        }),
                                                    )}
                                                    value={priorityId}
                                                    onChange={setPriorityId}
                                                    placeholder={t(
                                                        'Select Priority',
                                                    )}
                                                    emptyText={t(
                                                        'No priority found.',
                                                    )}
                                                />
                                            </div>

                                            <div className="col-span-2 space-y-2">
                                                <Label htmlFor="assignee">
                                                    {t('Assignee')}
                                                </Label>
                                                <Combobox
                                                    id="assignee"
                                                    options={[
                                                        {
                                                            value: 'unassigned',
                                                            label: t(
                                                                'Unassigned',
                                                            ),
                                                        },
                                                        ...assignees.map(
                                                            (
                                                                member: LookupItem,
                                                            ) => ({
                                                                value: member.id.toString(),
                                                                label:
                                                                    member.name ||
                                                                    member.user
                                                                        ?.name ||
                                                                    `User ${member.id}`,
                                                            }),
                                                        ),
                                                    ]}
                                                    value={assigneeId}
                                                    onChange={setAssigneeId}
                                                    placeholder={t(
                                                        'Select Assignee',
                                                    )}
                                                    emptyText={t(
                                                        'No user found.',
                                                    )}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="start_date">
                                                    {t('Start Date')}
                                                </Label>
                                                <Input
                                                    id="start_date"
                                                    type="date"
                                                    value={startDate}
                                                    onChange={(e) =>
                                                        setStartDate(
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="due_date">
                                                    {t('Due Date')}
                                                </Label>
                                                <Input
                                                    id="due_date"
                                                    type="date"
                                                    value={dueDate}
                                                    onChange={(e) =>
                                                        setDueDate(
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>
                                    );
                                })()}

                            <div className="flex justify-end pt-4">
                                <Button
                                    type="submit"
                                    disabled={
                                        !title ||
                                        !projectId ||
                                        !typeId ||
                                        !priorityId ||
                                        createIssueMutation.isPending
                                    }
                                >
                                    {createIssueMutation.isPending
                                        ? t('Creating...')
                                        : t('Create Issue')}
                                </Button>
                            </div>
                        </>
                    )}
                </form>
            </DialogContent>
        </Dialog>
    );
}
