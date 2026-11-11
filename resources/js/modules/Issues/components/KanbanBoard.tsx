import React, { useState, useMemo } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    useBoardIssues,
    useTransitionIssue,
} from '../../../hooks/issues/useIssues';
import { BoardColumn, Issue } from '../../../types/issue';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// COMPOUND COMPONENTS
const BoardWrapper: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => (
    <div className="flex min-h-[calc(100vh-100px)] w-full gap-4 overflow-x-auto bg-slate-50 p-4">
        {children}
    </div>
);

const Column: React.FC<{
    column: BoardColumn;
    children: React.ReactNode;
}> = ({ column, children }) => {
    return (
        <div className="flex w-[300px] min-w-[300px] flex-col rounded-lg bg-slate-100 shadow-sm">
            <div className="flex items-center justify-between rounded-t-lg border-b border-slate-200 bg-slate-100 p-3 font-semibold">
                <span>{column.name}</span>
                <span className="rounded-full bg-slate-200 px-2 py-1 text-xs text-slate-600">
                    {column.issues.length}
                </span>
            </div>
            <div className="flex min-h-[150px] flex-1 flex-col gap-2 overflow-y-auto p-2">
                {children}
            </div>
        </div>
    );
};

const Card: React.FC<{ issue: Issue }> = ({ issue }) => {
    return (
        <div className="cursor-grab rounded-md border border-slate-200 bg-white p-3 shadow-sm hover:border-blue-400">
            <div className="mb-1 line-clamp-2 text-sm font-medium">
                {issue.title}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{issue.issue_type_id}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5">
                    {issue.priority_id}
                </span>
            </div>
        </div>
    );
};

// SORTABLE WRAPPERS
const SortableColumn: React.FC<{
    column: BoardColumn;
    children: React.ReactNode;
}> = ({ column, children }) => {
    const { setNodeRef } = useSortable({
        id: column.id,
        data: { type: 'Column', column },
    });
    return (
        <div ref={setNodeRef}>
            <Column column={column}>{children}</Column>
        </div>
    );
};

const SortableCard: React.FC<{ issue: Issue }> = ({ issue }) => {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: issue.id,
        data: { type: 'Issue', issue },
    });

    const style = {
        transition,
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <Card issue={issue} />
        </div>
    );
};

// SMART COMPONENT
interface KanbanBoardProps {
    projectId: string;
    sprintId?: string;
}

const KanbanBoardMain: React.FC<KanbanBoardProps> = ({
    projectId,
    sprintId,
}) => {
    const queryClient = useQueryClient();
    const { data: columns = [], isLoading } = useBoardIssues(
        projectId,
        sprintId,
    );
    const transitionMutation = useTransitionIssue(projectId);

    const [activeColumn, setActiveColumn] = useState<BoardColumn | null>(null);
    const [activeIssue, setActiveIssue] = useState<Issue | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);

    if (isLoading) return <div className="p-4">Loading board...</div>;

    const onDragStart = (event: DragStartEvent) => {
        if (event.active.data.current?.type === 'Column') {
            setActiveColumn(event.active.data.current.column);
            return;
        }
        if (event.active.data.current?.type === 'Issue') {
            setActiveIssue(event.active.data.current.issue);
            return;
        }
    };

    const onDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;
        if (activeId === overId) return;

        const isActiveTask = active.data.current?.type === 'Issue';
        const isOverTask = over.data.current?.type === 'Issue';
        const isOverColumn = over.data.current?.type === 'Column';

        if (!isActiveTask) return;

        // We do optimistic updates purely within React Query cache here
        queryClient.setQueryData(
            ['board', projectId, sprintId],
            (oldData: BoardColumn[] | undefined) => {
                if (!oldData) return oldData;
                const newColumns = JSON.parse(
                    JSON.stringify(oldData),
                ) as BoardColumn[];

                const activeColumnIndex = newColumns.findIndex((col) =>
                    col.issues.some((issue) => issue.id === activeId),
                );
                if (activeColumnIndex === -1) return newColumns;

                const activeIssueIndex = newColumns[
                    activeColumnIndex
                ].issues.findIndex((i) => i.id === activeId);
                const activeIssue =
                    newColumns[activeColumnIndex].issues[activeIssueIndex];

                // Dropping over another task
                if (isOverTask) {
                    const overColumnIndex = newColumns.findIndex((col) =>
                        col.issues.some((issue) => issue.id === overId),
                    );
                    const overIssueIndex = newColumns[
                        overColumnIndex
                    ].issues.findIndex((i) => i.id === overId);

                    if (activeColumnIndex !== overColumnIndex) {
                        activeIssue.status_id = newColumns[overColumnIndex].id;
                        newColumns[activeColumnIndex].issues.splice(
                            activeIssueIndex,
                            1,
                        );
                        newColumns[overColumnIndex].issues.splice(
                            overIssueIndex,
                            0,
                            activeIssue,
                        );
                    } else {
                        newColumns[activeColumnIndex].issues = arrayMove(
                            newColumns[activeColumnIndex].issues,
                            activeIssueIndex,
                            overIssueIndex,
                        );
                    }
                    return newColumns;
                }

                // Dropping over empty column area
                if (isOverColumn) {
                    const overColumnIndex = newColumns.findIndex(
                        (col) => col.id === overId,
                    );
                    if (activeColumnIndex !== overColumnIndex) {
                        activeIssue.status_id = newColumns[overColumnIndex].id;
                        newColumns[activeColumnIndex].issues.splice(
                            activeIssueIndex,
                            1,
                        );
                        newColumns[overColumnIndex].issues.push(activeIssue);
                    }
                    return newColumns;
                }

                return newColumns;
            },
        );
    };

    const onDragEnd = (event: DragEndEvent) => {
        setActiveColumn(null);
        setActiveIssue(null);
        const { active, over } = event;
        if (!over) return;

        if (active.data.current?.type === 'Issue') {
            const activeIssue = active.data.current.issue as Issue;
            const previousStatusId = activeIssue.status_id;

            // Determine the new status ID by checking where the issue ended up in the query data
            const currentBoard = queryClient.getQueryData<BoardColumn[]>([
                'board',
                projectId,
                sprintId,
            ]);
            if (!currentBoard) return;

            let newStatusId = previousStatusId;
            for (const col of currentBoard) {
                if (col.issues.some((i) => i.id === activeIssue.id)) {
                    newStatusId = col.id;
                    break;
                }
            }

            if (newStatusId !== previousStatusId) {
                // Snapshot the previous state for optimistic rollback
                const previousBoard = queryClient.getQueryData<BoardColumn[]>([
                    'board',
                    projectId,
                    sprintId,
                ]);

                transitionMutation.mutate(
                    {
                        issueId: activeIssue.id,
                        payload: { to_status_id: newStatusId },
                    },
                    {
                        onError: (err) => {
                            toast.error(
                                'Gagal memindahkan issue: ' + err.message,
                            );
                            // Optimistic rollback
                            if (previousBoard) {
                                queryClient.setQueryData(
                                    ['board', projectId, sprintId],
                                    previousBoard,
                                );
                            }
                            // Invalidate to fetch the true state
                            queryClient.invalidateQueries({
                                queryKey: ['board', projectId, sprintId],
                            });
                        },
                    },
                );
            }
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
        >
            <BoardWrapper>
                <SortableContext
                    items={columnsId}
                    strategy={horizontalListSortingStrategy}
                >
                    {columns.map((column) => (
                        <SortableColumn key={column.id} column={column}>
                            <SortableContext
                                items={column.issues.map((i) => i.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {column.issues.map((issue) => (
                                    <SortableCard
                                        key={issue.id}
                                        issue={issue}
                                    />
                                ))}
                            </SortableContext>
                        </SortableColumn>
                    ))}
                </SortableContext>
            </BoardWrapper>

            <DragOverlay
                dropAnimation={{
                    sideEffects: defaultDropAnimationSideEffects({
                        styles: { active: { opacity: '0.4' } },
                    }),
                }}
            >
                {activeColumn && <Column column={activeColumn}>{null}</Column>}
                {activeIssue && <Card issue={activeIssue} />}
            </DragOverlay>
        </DndContext>
    );
};

export const KanbanBoard = Object.assign(KanbanBoardMain, {
    Wrapper: BoardWrapper,
    Column: Column,
    Card: Card,
});

export default KanbanBoard;
