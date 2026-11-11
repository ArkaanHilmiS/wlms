import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Issue } from '@/types/issue';
import {
    CreateIssuePayload,
    UpdateIssuePayload,
    useIssues,
    useIssueWorklogs,
} from '../hooks/useIssues';
import { WorklogHistory } from './WorklogHistory';
import { IssueCommentSection } from './IssueCommentSection';
import { IssueAttachmentSection } from './IssueAttachmentSection';
import { IssueLinksPanel } from './IssueLinksPanel';
import { LinkAfterCreate, SimilarIssuesBox } from './SimilarIssuesBox';
import { useTranslate } from '@/hooks/useTranslate';
import { usePermission } from '@/hooks/usePermission';
import { toast } from 'sonner';
import { useAddIssueLink, useProjectLookups } from '@/hooks/api/issues';

export interface SelectOption {
    id: string;
    name: string;
    slug?: string;
}

export interface IssueWorkloadSettings {
    enable_sprints?: boolean;
    sla_days_by_priority?: Record<string, number>;
    working_days?: number[];
    holidays?: string[];
    worklog_max_hours_per_day?: number;
    attachment_max_mb?: number;
}

function calculateBusinessDueDate(
    baseDateStr: string,
    daysToAdd: number,
    workingDays: number[] = [1, 2, 3, 4, 5],
    holidays: string[] = [],
): string {
    if (daysToAdd <= 0) return baseDateStr;
    const parts = baseDateStr.split('-').map(Number);
    const current = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
    const holidaySet = new Set(holidays);
    const validWorkingDays =
        workingDays.length > 0 ? workingDays : [1, 2, 3, 4, 5];

    let remaining = daysToAdd;
    let safety = 0;
    while (remaining > 0 && safety < 1000) {
        safety++;
        current.setDate(current.getDate() + 1);
        const isoDay = current.getDay() === 0 ? 7 : current.getDay();
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        const formatted = `${yyyy}-${mm}-${dd}`;
        if (validWorkingDays.includes(isoDay) && !holidaySet.has(formatted)) {
            remaining--;
        }
    }
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

interface IssueFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    // Boleh mengembalikan issue hasil create agar tautan "serupa" bisa dibuat.
    onSubmit: (
        payload: CreateIssuePayload | UpdateIssuePayload,
    ) => void | Promise<unknown>;
    issue?: Issue | null;
    isLoading?: boolean;
    projectId?: string;
    projects?: SelectOption[];
    issueTypes: SelectOption[];
    priorities: SelectOption[];
    statuses: SelectOption[];
    assignees: SelectOption[];
    settings?: IssueWorkloadSettings;
}

export const IssueFormDialog: React.FC<IssueFormDialogProps> = ({
    isOpen,
    onClose,
    onSubmit,
    issue,
    isLoading,
    projectId,
    projects = [],
    issueTypes,
    priorities,
    statuses,
    assignees,
    settings,
}) => {
    const { t } = useTranslate();
    const isEdit = !!issue;

    const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [issueTypeId, setIssueTypeId] = useState('');
    const [priorityId, setPriorityId] = useState('');
    const [statusId, setStatusId] = useState('');
    const [assigneeId, setAssigneeId] = useState('');
    const [originalEstimateHours, setOriginalEstimateHours] =
        useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [dueDate, setDueDate] = useState<string>('');
    const [parentId, setParentId] = useState<string>('');
    const [linkAfterCreate, setLinkAfterCreate] =
        useState<LinkAfterCreate | null>(null);

    const { can } = usePermission();
    const canManageLinks = can('issues:create') || can('issues:manage');
    const addLink = useAddIssueLink();

    const effectiveProjectId =
        (isEdit ? issue?.project_id : projectId || selectedProjectId) || '';
    const { issues: projectIssues } = useIssues(effectiveProjectId);
    const parentOptions = projectIssues
        .filter((i) => !i.parent_id && i.id !== issue?.id)
        .map((i) => ({
            value: i.id,
            label: `${i.key ?? i.id.slice(0, 3)} ${i.title}`,
        }));

    const { data: worklogs = [], isLoading: isLoadingWorklogs } =
        useIssueWorklogs(issue?.id || null);

    // Dynamic Lookups for Cross-Project Create Task
    const { data: dynamicLookups, isLoading: isLoadingLookups } =
        useProjectLookups(
            !isEdit && !projectId && selectedProjectId
                ? selectedProjectId
                : null,
        );
    const activeIssueTypes = dynamicLookups?.issueTypes || issueTypes;
    const activePriorities = dynamicLookups?.priorities || priorities;
    const activeStatuses = dynamicLookups?.statuses || statuses;
    const activeAssignees = dynamicLookups?.users || assignees;
    const activeSettings: IssueWorkloadSettings | undefined =
        dynamicLookups?.settings || settings;

    const getAutoDueDate = (prioId: string, baseStart?: string): string => {
        if (!activeSettings?.sla_days_by_priority) return '';
        const prio = (activePriorities || []).find(
            (p: SelectOption) => String(p.id) === String(prioId),
        );
        if (!prio) return '';
        const slug = (prio.slug || prio.name).toLowerCase();
        const slaDays = activeSettings.sla_days_by_priority[slug];
        if (typeof slaDays !== 'number' || slaDays <= 0) return '';
        const todayStr = new Date().toISOString().slice(0, 10);
        return calculateBusinessDueDate(
            baseStart || todayStr,
            slaDays,
            activeSettings.working_days,
            activeSettings.holidays,
        );
    };

    useEffect(() => {
        if (!isEdit && selectedProjectId && dynamicLookups) {
            if (
                activeIssueTypes.length > 0 &&
                !activeIssueTypes.find(
                    (t: SelectOption) => String(t.id) === issueTypeId,
                )
            ) {
                setIssueTypeId(String(activeIssueTypes[0].id));
            }
            if (
                activePriorities.length > 0 &&
                !activePriorities.find(
                    (p: SelectOption) => String(p.id) === priorityId,
                )
            ) {
                setPriorityId(String(activePriorities[0].id));
            }
            if (
                activeStatuses.length > 0 &&
                !activeStatuses.find(
                    (s: SelectOption) => String(s.id) === statusId,
                )
            ) {
                setStatusId(String(activeStatuses[0].id));
            }
            if (
                assigneeId !== 'unassigned' &&
                activeAssignees.length > 0 &&
                !activeAssignees.find(
                    (u: SelectOption) => String(u.id) === assigneeId,
                )
            ) {
                setAssigneeId('unassigned');
            }
        }
    }, [selectedProjectId, dynamicLookups, isEdit]);

    useEffect(() => {
        if (isOpen) {
            if (issue) {
                setTitle(issue.title);
                setDescription(issue.description || '');
                setIssueTypeId(String(issue.issue_type_id));
                setPriorityId(String(issue.priority_id));
                setStatusId(String(issue.status_id));
                setAssigneeId(
                    issue.assignee_id
                        ? String(issue.assignee_id)
                        : 'unassigned',
                );
                setOriginalEstimateHours(
                    issue.original_estimate_seconds
                        ? String(issue.original_estimate_seconds / 3600)
                        : '',
                );
                setStartDate(
                    issue.start_date ? issue.start_date.slice(0, 10) : '',
                );
                setDueDate(issue.due_date ? issue.due_date.slice(0, 10) : '');
                setParentId(issue.parent_id ? String(issue.parent_id) : '');
            } else {
                // Recover draft from Local Storage for new issues
                setTitle(localStorage.getItem('wlms_draft_issue_title') || '');
                setDescription(
                    localStorage.getItem('wlms_draft_issue_description') || '',
                );
                setIssueTypeId(issueTypes[0] ? String(issueTypes[0].id) : '');
                setPriorityId(priorities[0] ? String(priorities[0].id) : '');
                setStatusId(statuses[0] ? String(statuses[0].id) : '');
                setAssigneeId('unassigned');
                setOriginalEstimateHours('');
                setStartDate('');
                setDueDate('');
                setParentId('');
                setLinkAfterCreate(null);
            }
        }
    }, [isOpen, issue, issueTypes, priorities, statuses]);

    // Save draft to local storage when typing (only for create)
    useEffect(() => {
        if (!isEdit && isOpen) {
            localStorage.setItem('wlms_draft_issue_title', title);
            localStorage.setItem('wlms_draft_issue_description', description);
        }
    }, [title, description, isEdit, isOpen]);

    useEffect(() => {
        if (projectId) {
            setSelectedProjectId(projectId);
        }
    }, [projectId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isEdit && !projectId && !selectedProjectId) {
            toast.error(t('Please select a project'));
            return;
        }

        const payload: CreateIssuePayload | UpdateIssuePayload = {
            project_id: !isEdit && !projectId ? selectedProjectId : undefined,
            title,
            description: description || null,
            issue_type_id: issueTypeId,
            priority_id: priorityId,
            assignee_id: assigneeId === 'unassigned' ? null : assigneeId,
            sprint_id: issue?.sprint_id || null,
            original_estimate_seconds: originalEstimateHours
                ? Number(originalEstimateHours) * 3600
                : null,
            remaining_estimate_seconds:
                issue?.remaining_estimate_seconds !== undefined
                    ? issue.remaining_estimate_seconds
                    : originalEstimateHours
                      ? Number(originalEstimateHours) * 3600
                      : null,
            start_date: startDate || null,
            due_date: dueDate || null,
            parent_id: parentId || null,
        };

        if (isEdit) {
            (payload as UpdateIssuePayload).status_id = statusId;
        } else if (statusId) {
            payload.status_id = statusId;
        }

        const pending = onSubmit(payload);
        const pendingLink = linkAfterCreate;

        // Clear draft on successful submit
        if (!isEdit) {
            localStorage.removeItem('wlms_draft_issue_title');
            localStorage.removeItem('wlms_draft_issue_description');
        }

        if (!isEdit && pendingLink) {
            const created = (await pending) as
                | { id?: string }
                | null
                | undefined;
            if (created?.id) {
                addLink.mutate(
                    {
                        issueId: created.id,
                        targetIssueId: pendingLink.targetId,
                        linkType: pendingLink.linkType,
                    },
                    {
                        onError: () =>
                            toast.error(t('Gagal menautkan tiket serupa')),
                    },
                );
            }
        }
    };

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {!isEdit && (
                <div className="space-y-2">
                    <Label htmlFor="project">Project *</Label>
                    <Combobox
                        id="project"
                        options={(projects || []).map((p) => ({
                            value: String(p.id),
                            label: p.name,
                        }))}
                        value={selectedProjectId}
                        onChange={setSelectedProjectId}
                        placeholder={t('Select project...')}
                        emptyText="No project found."
                        disabled={!!projectId}
                    />
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="title">{t('Title')}</Label>
                <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('Issue title')}
                    required
                />
                {!isEdit && (
                    <SimilarIssuesBox
                        projectId={effectiveProjectId}
                        title={title}
                        value={linkAfterCreate}
                        onChange={setLinkAfterCreate}
                    />
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="parent">{t('Parent issue (sub-task)')}</Label>
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

            <div className="space-y-2">
                <Label htmlFor="description">{t('Description')}</Label>
                <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('Description...')}
                    rows={4}
                />
                {!isEdit && (
                    <p className="text-muted-foreground text-right text-xs italic">
                        *Draft otomatis tersimpan (Auto-saved)
                    </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="issue_type">{t('Type')}</Label>
                    <Combobox
                        id="issue_type"
                        options={(activeIssueTypes || []).map(
                            (type: SelectOption) => ({
                                value: String(type.id),
                                label: type.name,
                            }),
                        )}
                        value={issueTypeId}
                        onChange={setIssueTypeId}
                        placeholder={t('Search type...')}
                        emptyText="No type found."
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="priority">{t('Priority')}</Label>
                    <Combobox
                        id="priority"
                        options={(activePriorities || []).map(
                            (p: SelectOption) => ({
                                value: String(p.id),
                                label: p.name,
                            }),
                        )}
                        value={priorityId}
                        onChange={(val) => {
                            setPriorityId(val);
                            if (!isEdit && activeSettings?.sla_days_by_priority) {
                                const computed = getAutoDueDate(val, startDate);
                                if (computed) setDueDate(computed);
                            }
                        }}
                        placeholder={t('Search priority...')}
                        emptyText="No priority found."
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="status">
                        {t('Status')} {isEdit ? '*' : '(Optional)'}
                    </Label>
                    <Combobox
                        id="status"
                        options={(activeStatuses || []).map(
                            (s: SelectOption) => ({
                                value: String(s.id),
                                label: s.name,
                            }),
                        )}
                        value={statusId}
                        onChange={setStatusId}
                        placeholder={t('Search status...')}
                        emptyText="No status found."
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="assignee">{t('Assignee')}</Label>
                    <Combobox
                        id="assignee"
                        options={[
                            { value: 'unassigned', label: 'Unassigned' },
                            ...(activeAssignees || []).map(
                                (a: SelectOption) => ({
                                    value: String(a.id),
                                    label: a.name,
                                }),
                            ),
                        ]}
                        value={assigneeId}
                        onChange={setAssigneeId}
                        placeholder={t('Search assignee...')}
                        emptyText="No user found."
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="start_date">{t('Start Date')}</Label>
                    <Input
                        id="start_date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="due_date">{t('Due Date')}</Label>
                    <Input
                        id="due_date"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="original_estimate">
                        Original Estimate (Hours)
                    </Label>
                    <Input
                        id="original_estimate"
                        type="number"
                        min="0"
                        step="0.1"
                        value={originalEstimateHours}
                        onChange={(e) =>
                            setOriginalEstimateHours(e.target.value)
                        }
                        placeholder="e.g. 8"
                    />
                </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                >
                    {t('Cancel')}
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Issue'}
                </Button>
            </div>
        </form>
    );

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent
                className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]"
                onInteractOutside={(e) => {
                    e.preventDefault();
                }}
            >
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? 'Edit Issue' : 'Create New Issue'}
                    </DialogTitle>
                </DialogHeader>

                {isEdit ? (
                    <Tabs defaultValue="details" className="mt-4 w-full">
                        <TabsList className="w-full">
                            <TabsTrigger value="details" className="flex-1">
                                {t('Details')}
                            </TabsTrigger>
                            <TabsTrigger value="links" className="flex-1">
                                {t('Sub-tasks & Links')}
                            </TabsTrigger>
                            <TabsTrigger value="worklogs" className="flex-1">
                                {t('Worklogs')}
                            </TabsTrigger>
                            <TabsTrigger value="comments" className="flex-1">
                                {t('Comments')}
                            </TabsTrigger>
                            <TabsTrigger value="attachments" className="flex-1">
                                {t('Attachments')}
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="details">{formContent}</TabsContent>
                        <TabsContent value="links">
                            <IssueLinksPanel
                                issue={issue}
                                canManage={canManageLinks}
                                projectIssues={projectIssues}
                            />
                        </TabsContent>
                        <TabsContent value="worklogs">
                            <WorklogHistory
                                worklogs={worklogs}
                                isLoading={isLoadingWorklogs}
                            />
                        </TabsContent>
                        <TabsContent value="comments">
                            <IssueCommentSection
                                issueId={String(issue.id)}
                                users={activeAssignees}
                            />
                        </TabsContent>
                        <TabsContent value="attachments">
                            <IssueAttachmentSection
                                issueId={String(issue.id)}
                            />
                        </TabsContent>
                    </Tabs>
                ) : (
                    formContent
                )}
            </DialogContent>
        </Dialog>
    );
};
