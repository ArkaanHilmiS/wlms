import React from 'react';
import { format } from 'date-fns';
import { useDraggable } from '@dnd-kit/core';
import {
    ChevronDown,
    Pencil,
    Bookmark,
    CheckSquare,
    MoreHorizontal,
} from 'lucide-react';
import { Issue } from '@/types/issue';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useTranslate } from '@/hooks/useTranslate';
import { useIconSize, type IconSize } from '@/hooks/use-appearance';
import { EstimatePopover } from './EstimatePopover';
import { IssueFlags } from './IssueFlags';

export interface LookupData {
    statuses?: any[];
    issueTypes?: any[];
    priorities?: any[];
    users?: any[];
}

export const getFullPayload = (issue: Issue, overrides: any) => ({
    title: overrides.title !== undefined ? overrides.title : issue.title,
    description:
        overrides.description !== undefined
            ? overrides.description
            : issue.description,
    issue_type_id:
        overrides.issue_type_id !== undefined
            ? overrides.issue_type_id
            : issue.issue_type_id,
    status_id:
        overrides.status_id !== undefined
            ? overrides.status_id
            : issue.status_id,
    priority_id:
        overrides.priority_id !== undefined
            ? overrides.priority_id
            : issue.priority_id,
    sprint_id:
        overrides.sprint_id !== undefined
            ? overrides.sprint_id
            : issue.sprint_id,
    assignee_id:
        overrides.assignee_id !== undefined
            ? overrides.assignee_id
            : issue.assignee_id || null,
    original_estimate_seconds:
        overrides.original_estimate_seconds !== undefined
            ? overrides.original_estimate_seconds
            : issue.original_estimate_seconds,
    remaining_estimate_seconds:
        overrides.remaining_estimate_seconds !== undefined
            ? overrides.remaining_estimate_seconds
            : issue.remaining_estimate_seconds,
    start_date:
        overrides.start_date !== undefined
            ? overrides.start_date
            : issue.start_date || null,
    due_date:
        overrides.due_date !== undefined
            ? overrides.due_date
            : issue.due_date || null,
    parent_id:
        overrides.parent_id !== undefined
            ? overrides.parent_id
            : issue.parent_id || null,
});

export const getStatusVariant = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('done') || n.includes('resolve')) return 'success';
    if (n.includes('progress') || n.includes('review') || n.includes('uat'))
        return 'info';
    return 'secondary';
};

export const getTypeIcon = (name: string, size: IconSize = 'md') => {
    const n = name.toLowerCase();
    const iconClass =
        size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5';
    if (n.includes('bug'))
        return <div className={`${iconClass} bg-destructive rounded-sm`} />;
    if (n.includes('task'))
        return <CheckSquare className={`${iconClass} text-info`} />;
    return <Bookmark className={`${iconClass} text-success`} />;
};

const StatusDropdown = ({
    issue,
    lookups,
    updateIssue,
}: {
    issue: Issue;
    lookups?: LookupData;
    updateIssue: any;
}) => {
    const { t } = useTranslate();
    const { iconSize } = useIconSize();
    const statusName =
        lookups?.statuses?.find(
            (s: any) => String(s.id) === String(issue.status_id),
        )?.name || 'To Do';

    const badgeClass =
        iconSize === 'sm'
            ? 'text-[9px] font-medium px-1.5 py-0.5 rounded-sm h-4.5 cursor-pointer flex items-center gap-1'
            : iconSize === 'lg'
              ? 'text-xs font-medium px-2.5 py-1 rounded-sm h-6 cursor-pointer flex items-center gap-1'
              : 'text-[10px] font-medium px-2 py-0.5 rounded-sm h-5 cursor-pointer flex items-center gap-1';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Badge
                    variant={getStatusVariant(statusName) as any}
                    className={badgeClass}
                >
                    {statusName} <ChevronDown className="h-3 w-3 opacity-70" />
                </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                {lookups?.statuses?.map((status: any) => (
                    <DropdownMenuItem
                        key={status.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            updateIssue({
                                id: issue.id,
                                payload: getFullPayload(issue, {
                                    status_id: status.id,
                                }) as any,
                            });
                        }}
                    >
                        {status.name}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

const AssigneeDropdown = ({
    issue,
    lookups,
    assignIssue,
    disabled,
}: {
    issue: Issue;
    lookups?: LookupData;
    assignIssue: any;
    disabled?: boolean;
}) => {
    const { t } = useTranslate();
    const { iconSize } = useIconSize();
    const assignedUser = lookups?.users?.find(
        (u: any) => String(u.id) === String(issue.assignee_id),
    );

    const avatarSizeClass =
        iconSize === 'sm'
            ? 'w-5 h-5'
            : iconSize === 'lg'
              ? 'w-7 h-7'
              : 'w-6 h-6';

    const trigger = (
        <div className="cursor-pointer">
            {assignedUser ? (
                <Avatar className={`${avatarSizeClass} rounded-full`}>
                    <AvatarImage src={assignedUser.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                        {assignedUser.name
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase()}
                    </AvatarFallback>
                </Avatar>
            ) : (
                <div
                    className={`${avatarSizeClass} border-muted-foreground/40 hover:bg-muted text-muted-foreground flex items-center justify-center rounded-full border border-dashed`}
                >
                    <span className="text-[10px]">+</span>
                </div>
            )}
        </div>
    );

    if (disabled) return trigger;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        assignIssue({ id: issue.id, assigneeId: null });
                    }}
                >
                    <span className="text-muted-foreground">
                        {t('Unassigned')}
                    </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {lookups?.users?.map((user: any) => (
                    <DropdownMenuItem
                        key={user.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            assignIssue({ id: issue.id, assigneeId: user.id });
                        }}
                        className="flex items-center gap-2"
                    >
                        <Avatar className="h-5 w-5 rounded-full">
                            <AvatarFallback className="bg-primary text-primary-foreground text-[9px]">
                                {user.name
                                    .split(' ')
                                    .map((n: string) => n[0])
                                    .join('')
                                    .substring(0, 2)
                                    .toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{user.name}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export interface BacklogIssueRowProps {
    issue: Issue;
    lookups?: LookupData;
    updateIssue: any;
    assignIssue: any;
    isOwner: boolean;
    onIssueClick?: (issue: Issue) => void;
}

export const BacklogIssueRow: React.FC<BacklogIssueRowProps> = ({
    issue,
    lookups,
    updateIssue,
    assignIssue,
    isOwner,
    onIssueClick,
}) => {
    const { t } = useTranslate();
    const { iconSize } = useIconSize();
    const { attributes, listeners, setNodeRef, transform, isDragging } =
        useDraggable({
            id: issue.id,
            data: { type: 'Issue', issue },
        });

    const style = transform
        ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
              opacity: isDragging ? 0.5 : 1,
          }
        : undefined;

    const dateFormatted = issue.created_at
        ? format(new Date(issue.created_at), 'MMM d')
        : '-';
    const typeName =
        lookups?.issueTypes?.find(
            (t: any) => String(t.id) === String(issue.issue_type_id),
        )?.name || 'Task';

    const rowPaddingClass =
        iconSize === 'sm'
            ? 'py-1.5 px-2.5 text-xs'
            : iconSize === 'lg'
              ? 'py-3.5 px-4 text-base'
              : 'py-2 px-3 text-sm';

    const titleClass =
        iconSize === 'sm'
            ? 'text-xs font-medium text-foreground truncate flex items-center gap-1.5 cursor-pointer hover:text-primary'
            : iconSize === 'lg'
              ? 'text-base font-medium text-foreground truncate flex items-center gap-2.5 cursor-pointer hover:text-primary'
              : 'text-sm font-medium text-foreground truncate flex items-center gap-2 cursor-pointer hover:text-primary';

    const keyTextClass =
        iconSize === 'sm'
            ? 'text-[11px]'
            : iconSize === 'lg'
              ? 'text-sm'
              : 'text-xs';

    const dateTextClass =
        iconSize === 'sm'
            ? 'text-[11px]'
            : iconSize === 'lg'
              ? 'text-sm'
              : 'text-xs';

    const actionIconClass =
        iconSize === 'sm'
            ? 'w-3 h-3'
            : iconSize === 'lg'
              ? 'w-4 h-4'
              : 'w-3.5 h-3.5';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`group flex items-center justify-between ${rowPaddingClass} bg-card hover:bg-muted/50 border-border/50 cursor-grab border-b transition-colors active:cursor-grabbing`}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <input
                    type="checkbox"
                    className={`${actionIconClass} border-muted-foreground/30 text-primary focus:ring-primary rounded-sm opacity-100 transition-opacity [@media(hover:hover)]:opacity-50 [@media(hover:hover)]:group-hover:opacity-100`}
                />
                {getTypeIcon(typeName, iconSize)}
                <span
                    onClick={() => onIssueClick?.(issue)}
                    className={`${keyTextClass} text-muted-foreground w-16 cursor-pointer truncate font-medium hover:underline`}
                    title={issue.id}
                >
                    {t('TES-')}
                    {issue.id.substring(0, 3)}
                </span>
                <span
                    onClick={() => onIssueClick?.(issue)}
                    className={titleClass}
                >
                    {issue.title}
                    <Pencil
                        className={`${actionIconClass} text-muted-foreground opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100`}
                    />
                </span>
                <IssueFlags issue={issue} />
            </div>
            <div className="flex flex-shrink-0 items-center gap-3.5">
                <div
                    onPointerDown={(e) => e.stopPropagation()}
                    className="cursor-default"
                >
                    <StatusDropdown
                        issue={issue}
                        lookups={lookups}
                        updateIssue={updateIssue}
                    />
                </div>
                <span
                    className={`${dateTextClass} text-muted-foreground w-12 text-right`}
                >
                    {dateFormatted}
                </span>
                <div
                    onPointerDown={(e) => e.stopPropagation()}
                    className="cursor-default"
                >
                    <EstimatePopover issue={issue} updateIssue={updateIssue} />
                </div>
                <div
                    onPointerDown={(e) => e.stopPropagation()}
                    className="cursor-default"
                >
                    <AssigneeDropdown
                        issue={issue}
                        lookups={lookups}
                        assignIssue={assignIssue}
                        disabled={!isOwner}
                    />
                </div>
                <MoreHorizontal
                    className={`${actionIconClass} text-muted-foreground cursor-pointer opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100`}
                />
            </div>
        </div>
    );
};
