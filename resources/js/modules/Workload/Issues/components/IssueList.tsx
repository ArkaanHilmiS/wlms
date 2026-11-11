import React from 'react';
import { usePage } from '@inertiajs/react';
import { Issue } from '@/types/issue';
import { SharedData } from '@/types';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { SelectOption } from './IssueFormDialog';
import { IssueFlags } from './IssueFlags';
import { PriorityBadge } from '@/components/PriorityBadge';
import { Badge } from '@/components/ui/badge';
import { useTranslate } from '@/hooks/useTranslate';
import { useIconSize } from '@/hooks/use-appearance';

interface IssueListProps {
    issues: Issue[];
    isLoading: boolean;
    onCreateClick?: () => void;
    onEdit: (issue: Issue) => void;
    onDelete: (id: string) => void;
    onLogWork: (issue: Issue) => void;
    // Map dictionaries for rendering
    issueTypes: SelectOption[];
    priorities: SelectOption[];
    statuses: SelectOption[];
    assignees: SelectOption[];
}

export const IssueList: React.FC<IssueListProps> = ({
    issues,
    isLoading,
    onCreateClick,
    onEdit,
    onDelete,
    onLogWork,
    issueTypes,
    priorities,
    statuses,
    assignees,
}) => {
    const { t } = useTranslate();
    const { iconSize } = useIconSize();
    const { auth } = usePage<SharedData>().props;
    const currentUserId: number | null = auth.user?.id ?? null;

    const cellPaddingClass =
        iconSize === 'sm'
            ? 'px-3.5 py-2 text-xs'
            : iconSize === 'lg'
              ? 'px-6 py-4 text-base'
              : 'px-5 py-3 text-sm';

    const headerPaddingClass =
        iconSize === 'sm'
            ? 'px-3.5 py-2 text-[11px]'
            : iconSize === 'lg'
              ? 'px-6 py-3.5 text-sm'
              : 'px-5 py-2.5 text-xs';

    const actionButtonClass =
        iconSize === 'sm'
            ? 'h-7 text-xs px-2'
            : iconSize === 'lg'
              ? 'h-9 text-sm px-3.5'
              : 'h-8 text-xs px-2.5';

    const createBtnClass =
        iconSize === 'sm'
            ? 'h-8 text-xs px-3'
            : iconSize === 'lg'
              ? 'h-10 text-sm px-4.5'
              : 'h-9 text-xs px-3.5';

    const getName = (options: SelectOption[], id: string | null) => {
        if (!id) return '-';
        return options.find((o) => o.id === id)?.name || id;
    };

    if (isLoading) {
        return <div className="p-4 text-center">{t('Loading issues...')}</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3
                    className={`${iconSize === 'sm' ? 'text-base font-semibold' : iconSize === 'lg' ? 'text-xl font-bold' : 'text-lg font-medium'}`}
                >
                    {t('Issues')}
                </h3>
                {onCreateClick && (
                    <Button onClick={onCreateClick} className={createBtnClass}>
                        {t('Create Task')}
                    </Button>
                )}
            </div>

            {!issues || issues.length === 0 ? (
                <div className="bg-muted rounded-md border p-4 text-center">
                    {t('No issues found.')}
                </div>
            ) : (
                <div className="overflow-x-auto rounded-md border">
                    <table className="divide-border min-w-full divide-y">
                        <thead className="bg-muted">
                            <tr>
                                <th
                                    className={`${headerPaddingClass} text-muted-foreground text-left font-medium tracking-wider uppercase`}
                                >
                                    {t('Title')}
                                </th>
                                <th
                                    className={`${headerPaddingClass} text-muted-foreground text-left font-medium tracking-wider uppercase`}
                                >
                                    {t('Type')}
                                </th>
                                <th
                                    className={`${headerPaddingClass} text-muted-foreground text-left font-medium tracking-wider uppercase`}
                                >
                                    {t('Status')}
                                </th>
                                <th
                                    className={`${headerPaddingClass} text-muted-foreground text-left font-medium tracking-wider uppercase`}
                                >
                                    {t('Priority')}
                                </th>
                                <th
                                    className={`${headerPaddingClass} text-muted-foreground text-left font-medium tracking-wider uppercase`}
                                >
                                    {t('Assignee')}
                                </th>
                                <th
                                    className={`${headerPaddingClass} text-muted-foreground text-left font-medium tracking-wider uppercase`}
                                >
                                    {t('Due Date')}
                                </th>
                                <th
                                    className={`${headerPaddingClass} text-muted-foreground text-right font-medium tracking-wider uppercase`}
                                >
                                    {t('Actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-card divide-border divide-y">
                            {issues.map((issue) => {
                                const priorityItem = priorities.find(
                                    (p) => p.id === issue.priority_id,
                                );
                                return (
                                    <tr
                                        key={issue.id}
                                        className="hover:bg-muted/40 transition-colors"
                                    >
                                        <td
                                            className={`${cellPaddingClass} text-foreground font-medium whitespace-nowrap`}
                                        >
                                            <span
                                                onClick={() => onEdit(issue)}
                                                className="hover:text-primary cursor-pointer hover:underline"
                                            >
                                                {issue.title}
                                            </span>
                                            <span className="ml-2 inline-flex items-center gap-1 align-middle">
                                                <IssueFlags issue={issue} />
                                            </span>
                                        </td>
                                        <td
                                            className={`${cellPaddingClass} text-muted-foreground whitespace-nowrap`}
                                        >
                                            <span
                                                className={`bg-muted/50 text-muted-foreground border-border/50 inline-flex items-center rounded border font-normal ${
                                                    iconSize === 'sm'
                                                        ? 'px-1.5 py-0 text-[10px]'
                                                        : iconSize === 'lg'
                                                          ? 'px-2.5 py-0.5 text-xs'
                                                          : 'px-2 py-0.5 text-[11px]'
                                                }`}
                                            >
                                                {getName(
                                                    issueTypes,
                                                    issue.issue_type_id,
                                                )}
                                            </span>
                                        </td>
                                        <td
                                            className={`${cellPaddingClass} text-muted-foreground whitespace-nowrap`}
                                        >
                                            <span
                                                className={`bg-muted text-foreground border-border/50 inline-flex items-center rounded border font-medium ${
                                                    iconSize === 'sm'
                                                        ? 'px-1.5 py-0 text-[10px]'
                                                        : iconSize === 'lg'
                                                          ? 'px-2.5 py-1 text-xs'
                                                          : 'px-2 py-0.5 text-xs'
                                                }`}
                                            >
                                                {getName(
                                                    statuses,
                                                    issue.status_id,
                                                )}
                                            </span>
                                        </td>
                                        <td
                                            className={`${cellPaddingClass} whitespace-nowrap`}
                                        >
                                            {issue.priority_id &&
                                            priorityItem ? (
                                                <PriorityBadge
                                                    name={priorityItem.name}
                                                    category={priorityItem.name}
                                                    size={iconSize}
                                                />
                                            ) : (
                                                <span className="text-muted-foreground text-xs">
                                                    -
                                                </span>
                                            )}
                                        </td>
                                        <td
                                            className={`${cellPaddingClass} text-muted-foreground whitespace-nowrap`}
                                        >
                                            {getName(
                                                assignees,
                                                issue.assignee_id,
                                            )}
                                        </td>
                                        <td
                                            className={`${cellPaddingClass} whitespace-nowrap`}
                                        >
                                            {issue.due_date ? (
                                                (() => {
                                                    const todayStr = new Date()
                                                        .toISOString()
                                                        .slice(0, 10);
                                                    const dueStr =
                                                        issue.due_date.slice(
                                                            0,
                                                            10,
                                                        );
                                                    const isDone =
                                                        issue.status?.category?.toUpperCase() ===
                                                        'DONE';
                                                    const isOverdue =
                                                        issue.is_overdue ??
                                                        (!isDone &&
                                                            dueStr < todayStr);
                                                    return (
                                                        <div className="flex items-center gap-1.5">
                                                            <span
                                                                className={
                                                                    isOverdue
                                                                        ? 'font-medium text-red-600 dark:text-red-400'
                                                                        : 'text-muted-foreground'
                                                                }
                                                            >
                                                                {dueStr}
                                                            </span>
                                                            {isOverdue && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="border-red-500/20 bg-red-500/10 px-1.5 py-0 text-[10px] font-semibold text-red-600 dark:text-red-400"
                                                                >
                                                                    {t(
                                                                        'Overdue',
                                                                    )}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <span className="text-muted-foreground text-xs">
                                                    -
                                                </span>
                                            )}
                                        </td>
                                        <td
                                            className={`${cellPaddingClass} space-x-1.5 text-right font-medium whitespace-nowrap`}
                                        >
                                            {currentUserId &&
                                                issue.assignee_id &&
                                                String(currentUserId) ===
                                                    String(
                                                        issue.assignee_id,
                                                    ) && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className={
                                                            actionButtonClass
                                                        }
                                                        onClick={() =>
                                                            onLogWork(issue)
                                                        }
                                                    >
                                                        {t('Log Work')}
                                                    </Button>
                                                )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={actionButtonClass}
                                                onClick={() => onEdit(issue)}
                                            >
                                                {t('Edit')}
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        className={
                                                            actionButtonClass
                                                        }
                                                    >
                                                        {t('Delete')}
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>
                                                            {t('Delete Issue')}
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            {t(
                                                                'Are you sure you want to delete this issue?',
                                                            )}
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>
                                                            {t('Cancel')}
                                                        </AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() =>
                                                                onDelete(
                                                                    issue.id,
                                                                )
                                                            }
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        >
                                                            {t('Delete')}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
