import React, { useMemo } from 'react';
import { usePage } from '@inertiajs/react';
import { Issue } from '@/types/issue';
import { SharedData } from '@/types';
import { SelectOption } from './IssueFormDialog';
import { IssueFlags } from './IssueFlags';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PriorityBadge } from '@/components/PriorityBadge';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    closestCorners,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, AlertCircle } from 'lucide-react';
import { useTranslate } from '@/hooks/useTranslate';
import { useIconSize } from '@/hooks/use-appearance';

interface KanbanBoardProps {
    issues: Issue[];
    statuses: SelectOption[];
    lookups?: {
        issueTypes: { id: string; name: string }[];
        priorities: { id: string; name: string; category?: string }[];
        users: { id: string; name: string }[];
    };
    onTransition: (issueId: string, toStatusId: string) => void;
    onEdit: (issue: Issue) => void;
    onLogWork: (issue: Issue) => void;
}

const SortableIssueCard = ({
    issue,
    onEdit,
    onLogWork,
    lookups,
}: {
    issue: Issue;
    onEdit: (issue: Issue) => void;
    onLogWork: (issue: Issue) => void;
    lookups?: {
        issueTypes: { id: string; name: string }[];
        priorities: { id: string; name: string; category?: string }[];
        users: { id: string; name: string }[];
    };
}) => {
    const { t } = useTranslate();
    const { iconSize } = useIconSize();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: issue.id, data: { type: 'Issue', issue } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const typeName =
        lookups?.issueTypes?.find(
            (t) => String(t.id) === String(issue.issue_type_id),
        )?.name || 'Task';
    const priorityObj = lookups?.priorities?.find(
        (p) => String(p.id) === String(issue.priority_id),
    );
    const priorityName = priorityObj?.name || 'Normal';
    const assigneeName =
        issue.assignee?.name ||
        lookups?.users?.find((u) => String(u.id) === String(issue.assignee_id))
            ?.name ||
        'Unassigned';

    const { auth } = usePage<SharedData>().props;
    const currentUserId: number | null = auth.user?.id ?? null;
    const canLogWork = !!(
        currentUserId &&
        issue.assignee_id &&
        String(currentUserId) === String(issue.assignee_id)
    );

    // Dynamic sizing styles based on global iconSize
    const cardPaddingClass =
        iconSize === 'sm'
            ? 'p-2.5 mb-2 gap-2 rounded-md'
            : iconSize === 'lg'
              ? 'p-5 mb-3.5 gap-3 rounded-xl'
              : 'p-3.5 mb-2.5 gap-2.5 rounded-lg';

    const titleClass =
        iconSize === 'sm'
            ? 'font-medium text-xs leading-snug pr-8 cursor-pointer hover:text-primary transition-colors'
            : iconSize === 'lg'
              ? 'font-semibold text-base leading-snug pr-12 cursor-pointer hover:text-primary transition-colors'
              : 'font-medium text-sm leading-snug pr-10 cursor-pointer hover:text-primary transition-colors';

    const badgeClass =
        iconSize === 'sm'
            ? 'text-[9px] px-1 py-0 h-4'
            : iconSize === 'lg'
              ? 'text-xs px-2 py-0.5 h-6'
              : 'text-[10px] px-1.5 py-0 h-5';

    const avatarSizeClass =
        iconSize === 'sm'
            ? 'h-5 w-5 text-[9px]'
            : iconSize === 'lg'
              ? 'h-8 w-8 text-xs'
              : 'h-6 w-6 text-[10px]';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onEdit(issue)}
            className={`bg-card text-card-foreground hover:border-primary/50 group relative flex cursor-pointer flex-col border shadow-xs transition-colors ${cardPaddingClass}`}
        >
            <div className={titleClass}>{issue.title}</div>

            <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                        variant="outline"
                        className={`${badgeClass} bg-muted/50 font-normal`}
                    >
                        {typeName}
                    </Badge>
                    <PriorityBadge
                        name={priorityName}
                        category={priorityObj?.category}
                        size={iconSize === 'lg' ? 'md' : 'sm'}
                    />
                    {issue.due_date &&
                        (() => {
                            const todayStr = new Date()
                                .toISOString()
                                .slice(0, 10);
                            const dueStr = issue.due_date.slice(0, 10);
                            const isDone =
                                issue.status?.category?.toUpperCase() ===
                                'DONE';
                            const isOverdue =
                                issue.is_overdue ??
                                (!isDone && dueStr < todayStr);

                            return (
                                <Badge
                                    variant="outline"
                                    className={`${badgeClass} inline-flex items-center gap-1 font-medium ${
                                        isOverdue
                                            ? 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400'
                                            : 'bg-muted/50 text-muted-foreground font-normal'
                                    }`}
                                >
                                    {isOverdue ? (
                                        <AlertCircle className="h-3 w-3 shrink-0" />
                                    ) : (
                                        <Calendar className="h-3 w-3 shrink-0" />
                                    )}
                                    <span>{dueStr}</span>
                                    {isOverdue && (
                                        <span className="font-semibold">
                                            ({t('Overdue')})
                                        </span>
                                    )}
                                </Badge>
                            );
                        })()}
                    <IssueFlags issue={issue} />
                </div>

                <Avatar
                    className={`${avatarSizeClass} bg-muted shrink-0 border`}
                >
                    {issue.assignee_id ? (
                        <AvatarFallback
                            className={`${iconSize === 'sm' ? 'text-[9px]' : iconSize === 'lg' ? 'text-xs' : 'text-[10px]'} bg-[#DE350B] font-medium text-white`}
                        >
                            {assigneeName === 'Unassigned'
                                ? '?'
                                : assigneeName
                                      .split(' ')
                                      .map((n: string) => n[0])
                                      .join('')
                                      .substring(0, 2)
                                      .toUpperCase()}
                        </AvatarFallback>
                    ) : (
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
                                        ? 'h-2.5 w-2.5'
                                        : iconSize === 'lg'
                                          ? 'h-4 w-4'
                                          : 'h-3.5 w-3.5'
                                }
                            >
                                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </AvatarFallback>
                    )}
                </Avatar>
            </div>

            <div className="bg-card/90 absolute top-2 right-2 z-10 flex space-x-1.5 rounded-md border p-1 opacity-100 shadow-xs backdrop-blur-sm transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
                {canLogWork && (
                    <button
                        className="text-primary hover:text-primary/80 hover:bg-primary/10 rounded px-1.5 py-0.5 text-xs font-medium transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            onLogWork(issue);
                        }}
                    >
                        {t('Log')}
                    </button>
                )}
                <button
                    className="text-muted-foreground hover:text-foreground hover:bg-muted rounded px-1.5 py-0.5 text-xs font-medium transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(issue);
                    }}
                >
                    {t('Edit')}
                </button>
            </div>
        </div>
    );
};

const KanbanColumn = ({
    status,
    issues,
    onEdit,
    onLogWork,
    lookups,
}: {
    status: SelectOption;
    issues: Issue[];
    onEdit: (issue: Issue) => void;
    onLogWork: (issue: Issue) => void;
    lookups?: {
        issueTypes: { id: string; name: string }[];
        priorities: { id: string; name: string }[];
        users: { id: string; name: string }[];
    };
}) => {
    const { t } = useTranslate();
    const { iconSize } = useIconSize();
    const { setNodeRef } = useSortable({
        id: status.id,
        data: { type: 'Column', status },
    });

    const columnWidthClass =
        iconSize === 'sm'
            ? 'w-[250px] p-2.5 rounded-lg'
            : iconSize === 'lg'
              ? 'w-[360px] p-4 rounded-2xl'
              : 'w-[300px] p-3 rounded-xl';

    const headerTextClass =
        iconSize === 'sm'
            ? 'text-xs font-semibold'
            : iconSize === 'lg'
              ? 'text-base font-bold'
              : 'text-sm font-semibold';

    return (
        <div
            className={`bg-muted/40 hover:border-border/50 flex flex-shrink-0 flex-col border border-transparent transition-colors ${columnWidthClass}`}
        >
            <div className="mb-3 flex items-center justify-between px-1">
                <div className={`${headerTextClass} text-foreground`}>
                    {status.name}
                </div>
                <div
                    className={`bg-muted text-muted-foreground flex items-center justify-center rounded-full font-medium ${iconSize === 'sm' ? 'h-4.5 w-4.5 text-[10px]' : iconSize === 'lg' ? 'h-6 w-6 text-xs' : 'h-5 w-5 text-xs'}`}
                >
                    {issues.length}
                </div>
            </div>
            <div
                ref={setNodeRef}
                className="min-h-[200px] flex-1 overflow-y-auto"
            >
                <SortableContext
                    items={issues.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {issues.length > 0 ? (
                        issues.map((issue) => (
                            <SortableIssueCard
                                key={issue.id}
                                issue={issue}
                                onEdit={onEdit}
                                onLogWork={onLogWork}
                                lookups={lookups}
                            />
                        ))
                    ) : (
                        <div
                            className={`border-border text-muted-foreground flex items-center justify-center rounded-lg border-2 border-dashed ${iconSize === 'sm' ? 'h-16 text-xs' : iconSize === 'lg' ? 'h-28 text-sm' : 'h-24 text-sm'}`}
                        >
                            {t('No issues here')}
                        </div>
                    )}
                </SortableContext>
            </div>
        </div>
    );
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
    issues,
    statuses,
    onTransition,
    onEdit,
    onLogWork,
    lookups,
}) => {
    const { t } = useTranslate();
    const [activeIssue, setActiveIssue] = React.useState<Issue | null>(null);

    const columns = useMemo(() => {
        const now = new Date();
        const MAX_DAYS = 30;

        return statuses.map((status) => ({
            ...status,
            issues: issues.filter((issue) => {
                if (issue.status_id !== status.id) return false;

                const isDone =
                    issue.status?.category?.toUpperCase() === 'DONE' ||
                    status.name.toUpperCase() === 'DONE';
                if (isDone && issue.updated_at) {
                    const updatedAt = new Date(issue.updated_at);
                    const diffTime = Math.abs(
                        now.getTime() - updatedAt.getTime(),
                    );
                    const diffDays = Math.ceil(
                        diffTime / (1000 * 60 * 60 * 24),
                    );
                    if (diffDays > MAX_DAYS) {
                        return false;
                    }
                }
                return true;
            }),
        }));
    }, [issues, statuses]);

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

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        if (active.data.current?.type === 'Issue') {
            setActiveIssue(active.data.current.issue as Issue);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveIssue(null);
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        const isActiveIssue = active.data.current?.type === 'Issue';
        const isOverColumn = over.data.current?.type === 'Column';
        const isOverIssue = over.data.current?.type === 'Issue';

        if (!isActiveIssue) return;

        const activeIssueData = active.data.current?.issue as Issue;
        let targetStatusId = activeIssueData.status_id;

        if (isOverColumn) {
            targetStatusId = overId as string;
        } else if (isOverIssue) {
            targetStatusId = (over.data.current?.issue as Issue).status_id;
        }

        if (targetStatusId && targetStatusId !== activeIssueData.status_id) {
            onTransition(activeId as string, targetStatusId);
        }
    };

    return (
        <div className="flex gap-4 overflow-x-auto px-1 pt-2 pb-4">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                {columns.map((col) => (
                    <KanbanColumn
                        key={col.id}
                        status={col}
                        issues={col.issues}
                        onEdit={onEdit}
                        onLogWork={onLogWork}
                        lookups={lookups}
                    />
                ))}

                <DragOverlay>
                    {activeIssue ? (
                        <div className="scale-105 rotate-2 opacity-80">
                            <SortableIssueCard
                                issue={activeIssue as Issue}
                                onEdit={onEdit}
                                onLogWork={onLogWork}
                                lookups={lookups}
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
};
