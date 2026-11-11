import React, { useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import {
    DndContext,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    useSensors,
    useSensor,
    MouseSensor,
    TouchSensor,
    closestCorners,
} from '@dnd-kit/core';
import { SlidersHorizontal, LineChart, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Issue } from '@/types/issue';
import { Sprint } from '@/types/sprint';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTranslate } from '@/hooks/useTranslate';
import { useIconSize } from '@/hooks/use-appearance';
import { useSprints } from '../hooks/useSprints';
import { useIssues } from '../hooks/useIssues';
import { CompleteSprintDialog } from './CompleteSprintDialog';
import { SprintFormDialog } from './SprintFormDialog';
import { BacklogIssueRow, getFullPayload, LookupData } from './BacklogIssueRow';
import { DroppableSprint } from './DroppableSprint';
import { DroppableBacklog } from './DroppableBacklog';

export type { LookupData };

interface BacklogManagerProps {
    projectId: string;
    issues: Issue[];
    lookups?: LookupData;
    onIssueClick?: (issue: Issue) => void;
}

export const BacklogManager: React.FC<BacklogManagerProps> = ({
    projectId,
    issues,
    lookups,
    onIssueClick,
}) => {
    const { t } = useTranslate();
    const { iconSize } = useIconSize();
    const {
        sprints,
        startSprint,
        completeSprint,
        createSprint,
        isLoading,
        isCompleting,
    } = useSprints(projectId);
    const { auth } = usePage<any>().props;
    const isOwner =
        auth?.user?.roles?.includes('Workspace Owner') ||
        auth?.user?.roles?.includes('Superadmin');
    const [searchQuery, setSearchQuery] = useState('');
    const [assigneeFilters, setAssigneeFilters] = useState<string[]>([]);

    const filteredIssues = useMemo(() => {
        return issues.filter((issue) => {
            let matchesSearch = true;
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const key = (issue as any).issue_key
                    ? String((issue as any).issue_key).toLowerCase()
                    : '';
                matchesSearch =
                    issue.title.toLowerCase().includes(query) ||
                    key.includes(query);
            }

            let matchesAssignee = true;
            if (assigneeFilters.length > 0) {
                if (assigneeFilters.includes('unassigned')) {
                    matchesAssignee =
                        !issue.assignee_id ||
                        assigneeFilters.includes(String(issue.assignee_id));
                } else {
                    matchesAssignee = assigneeFilters.includes(
                        String(issue.assignee_id || ''),
                    );
                }
            }

            const isDone =
                issue.status?.category === 'DONE' ||
                issue.status?.name?.toLowerCase() === 'done';
            if (isDone) return false;

            return matchesSearch && matchesAssignee;
        });
    }, [issues, searchQuery, assigneeFilters]);

    const handleCreateSprint = async () => {
        const num = sprints ? sprints.length + 1 : 1;
        try {
            await createSprint({
                project_id: projectId,
                name: `Sprint ${num}`,
            });
        } catch (err) {
            console.error('Failed to create sprint', err);
        }
    };

    const { updateIssue, assignIssue } = useIssues(projectId);
    const [activeIssue, setActiveIssue] = React.useState<Issue | null>(null);
    const [sprintDialog, setSprintDialog] = useState<{
        sprint: Sprint;
        mode: 'edit' | 'start';
    } | null>(null);
    const [sprintToComplete, setSprintToComplete] = useState<Sprint | null>(
        null,
    );
    const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
    );

    const sortedSprints = useMemo(() => {
        if (!sprints) return [];
        return [...sprints]
            .filter((s) => s.state !== 'COMPLETED')
            .sort((a, b) => {
                if (
                    a.state?.toUpperCase() === 'ACTIVE' &&
                    b.state?.toUpperCase() !== 'ACTIVE'
                )
                    return -1;
                if (
                    b.state?.toUpperCase() === 'ACTIVE' &&
                    a.state?.toUpperCase() !== 'ACTIVE'
                )
                    return 1;
                return 0;
            });
    }, [sprints]);

    const backlogIssues = useMemo(() => {
        return filteredIssues.filter((i) => {
            if (i.sprint_id) return false;
            const status = lookups?.statuses?.find(
                (s: any) => s.id === i.status_id,
            );
            if (
                status &&
                (status.category === 'DONE' ||
                    status.name.toLowerCase() === 'done')
            ) {
                return false;
            }
            return true;
        });
    }, [filteredIssues, lookups]);

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        if (active.data.current?.type === 'Issue') {
            setActiveIssue(active.data.current.issue as Issue);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveIssue(null);
        const { active, over } = event;

        if (!over) return;

        const activeIssueData = active.data.current?.issue as Issue;
        if (!activeIssueData) return;

        const targetSprintId =
            over.id === 'backlog' ? null : (over.id as string);

        if (activeIssueData.sprint_id !== targetSprintId) {
            try {
                await updateIssue({
                    id: activeIssueData.id,
                    payload: getFullPayload(activeIssueData, {
                        sprint_id: targetSprintId,
                    }) as any,
                });
            } catch (error) {
                console.error('Failed to update issue sprint', error);
            }
        }
    };

    if (isLoading) return <div>{t('Loading sprints...')}</div>;

    return (
        <>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex flex-col py-2">
                    {/* Top Action Bar matching Jira Mockup */}
                    <div className="mb-6 flex items-center justify-between px-1">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={t('Search backlog')}
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className={`${iconSize === 'sm' ? 'h-7.5 w-44 text-xs' : iconSize === 'lg' ? 'h-9.5 w-56 text-sm' : 'h-8 w-48 text-xs'} border-input bg-background focus-visible:ring-ring rounded-md border pr-3 pl-8 shadow-sm focus-visible:ring-1 focus-visible:outline-none`}
                                />
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="text-muted-foreground absolute top-2 left-2.5 h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </div>
                            <div className="flex items-center -space-x-1.5 pl-1">
                                <Avatar
                                    onClick={() =>
                                        setAssigneeFilters((prev) =>
                                            prev.includes('unassigned')
                                                ? prev.filter(
                                                      (p) => p !== 'unassigned',
                                                  )
                                                : [...prev, 'unassigned'],
                                        )
                                    }
                                    className={`${iconSize === 'sm' ? 'h-7 w-7' : iconSize === 'lg' ? 'h-9 w-9' : 'h-8 w-8'} border-background cursor-pointer rounded-full border-2 transition-all ${assigneeFilters.includes('unassigned') ? 'ring-primary z-10 ring-2 ring-offset-1' : 'hover:z-10 hover:-translate-y-0.5'}`}
                                    title={t('Unassigned')}
                                >
                                    <AvatarFallback className="bg-muted text-muted-foreground">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className={
                                                iconSize === 'sm'
                                                    ? 'h-3.5 w-3.5'
                                                    : iconSize === 'lg'
                                                      ? 'h-4.5 w-4.5'
                                                      : 'h-4 w-4'
                                            }
                                        >
                                            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                    </AvatarFallback>
                                </Avatar>
                                {lookups?.users?.map((u) => (
                                    <Avatar
                                        key={u.id}
                                        onClick={() =>
                                            setAssigneeFilters((prev) =>
                                                prev.includes(String(u.id))
                                                    ? prev.filter(
                                                          (p) =>
                                                              p !==
                                                              String(u.id),
                                                      )
                                                    : [...prev, String(u.id)],
                                            )
                                        }
                                        className={`${iconSize === 'sm' ? 'h-7 w-7' : iconSize === 'lg' ? 'h-9 w-9' : 'h-8 w-8'} border-background cursor-pointer rounded-full border-2 transition-all ${assigneeFilters.includes(String(u.id)) ? 'ring-primary z-10 ring-2 ring-offset-1' : 'hover:z-10 hover:-translate-y-0.5'}`}
                                        title={u.name}
                                    >
                                        <AvatarFallback
                                            className={`${iconSize === 'sm' ? 'text-[10px]' : iconSize === 'lg' ? 'text-xs' : 'text-[11px]'} bg-[#DE350B] font-medium text-white`}
                                        >
                                            {u.name
                                                .split(' ')
                                                .map((n: string) => n[0])
                                                .join('')
                                                .substring(0, 2)
                                                .toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                ))}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className={`${iconSize === 'sm' ? 'h-7.5 px-2.5 text-xs' : iconSize === 'lg' ? 'h-9.5 px-3.5 text-sm' : 'h-8 px-3 text-xs'} font-medium ${searchQuery || assigneeFilters.length > 0 ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20' : 'text-muted-foreground'}`}
                            >
                                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />{' '}
                                {t('Filter')}
                                {(searchQuery ||
                                    assigneeFilters.length > 0) && (
                                    <span className="bg-primary/20 text-primary ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] leading-none">
                                        {(searchQuery ? 1 : 0) +
                                            assigneeFilters.length}
                                    </span>
                                )}
                            </Button>
                            {(searchQuery || assigneeFilters.length > 0) && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setAssigneeFilters([]);
                                    }}
                                    className="text-muted-foreground hover:text-foreground mx-1 text-xs font-medium"
                                >
                                    {t('Clear filters')}
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="icon"
                                className={`${iconSize === 'sm' ? 'h-7.5 w-7.5' : iconSize === 'lg' ? 'h-9.5 w-9.5' : 'h-8 w-8'} text-muted-foreground`}
                            >
                                <LineChart className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className={`${iconSize === 'sm' ? 'h-7.5 w-7.5' : iconSize === 'lg' ? 'h-9.5 w-9.5' : 'h-8 w-8'} text-muted-foreground`}
                            >
                                <SlidersHorizontal className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className={`${iconSize === 'sm' ? 'h-7.5 w-7.5' : iconSize === 'lg' ? 'h-9.5 w-9.5' : 'h-8 w-8'} text-muted-foreground`}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Sprints List */}
                    <div>
                        {sortedSprints.map((sprint) => (
                            <DroppableSprint
                                key={sprint.id}
                                sprint={sprint}
                                issues={filteredIssues.filter(
                                    (i) => i.sprint_id === sprint.id,
                                )}
                                lookups={lookups}
                                onStart={(id) => {
                                    startSprint(id)
                                        .then(() =>
                                            toast.success(
                                                t(
                                                    'Sprint started successfully',
                                                ),
                                            ),
                                        )
                                        .catch((err: any) =>
                                            toast.error(
                                                err.response?.data?.error ||
                                                    err.response?.data
                                                        ?.message ||
                                                    'Failed to start sprint',
                                            ),
                                        );
                                }}
                                onComplete={(id) => {
                                    const targetSprint = sortedSprints.find(
                                        (s) => s.id === id,
                                    );
                                    if (targetSprint) {
                                        setSprintToComplete(targetSprint);
                                        setIsCompleteDialogOpen(true);
                                    }
                                }}
                                projectId={projectId}
                                updateIssue={updateIssue}
                                assignIssue={assignIssue}
                                isOwner={isOwner}
                                onEditSprint={(s, m) =>
                                    setSprintDialog({ sprint: s, mode: m })
                                }
                                onIssueClick={onIssueClick}
                            />
                        ))}
                    </div>

                    {/* Backlog List */}
                    <DroppableBacklog
                        issues={backlogIssues}
                        lookups={lookups}
                        projectId={projectId}
                        updateIssue={updateIssue}
                        assignIssue={assignIssue}
                        isOwner={isOwner}
                        onIssueClick={onIssueClick}
                        onCreateSprint={handleCreateSprint}
                    />
                </div>

                <DragOverlay>
                    {activeIssue ? (
                        <div className="scale-105 rotate-2 opacity-95 shadow-xl">
                            <BacklogIssueRow
                                issue={activeIssue}
                                lookups={lookups}
                                updateIssue={updateIssue}
                                assignIssue={assignIssue}
                                isOwner={isOwner}
                                onIssueClick={onIssueClick}
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            <CompleteSprintDialog
                open={isCompleteDialogOpen}
                onOpenChange={setIsCompleteDialogOpen}
                sprint={sprintToComplete}
                issues={issues}
                availableSprints={sortedSprints}
                isCompleting={isCompleting}
                onComplete={async (sprintId, moveToSprintId) => {
                    try {
                        await completeSprint({ sprintId, moveToSprintId });
                        toast.success(t('Sprint completed successfully'));
                    } catch (err: any) {
                        toast.error(
                            err.response?.data?.error ||
                                err.response?.data?.message ||
                                'Failed to complete sprint',
                        );
                        throw err;
                    }
                }}
            />
            <SprintFormDialog
                open={!!sprintDialog}
                onOpenChange={(open) => !open && setSprintDialog(null)}
                sprint={sprintDialog?.sprint || null}
                mode={sprintDialog?.mode}
                projectId={projectId}
            />
        </>
    );
};
