import React from 'react';
import { Ban, ListChecks } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Issue } from '@/types/issue';
import { useTranslate } from '@/hooks/useTranslate';
import { useIconSize } from '@/hooks/use-appearance';

/** Badge "Blocked" + progres sub-task, dipakai di kanban/list/backlog. */
export const IssueFlags: React.FC<{ issue: Issue }> = ({ issue }) => {
    const { t } = useTranslate();
    const { iconSize } = useIconSize();
    const total = issue.subtasks_count ?? 0;
    if (!issue.is_blocked && total <= 0) return null;

    const badgeClass =
        iconSize === 'sm'
            ? 'text-[9px] px-1 py-0 h-4'
            : iconSize === 'lg'
              ? 'text-xs px-2 py-0.5 h-6'
              : 'text-[10px] px-1.5 py-0 h-5';

    return (
        <>
            {issue.is_blocked && (
                <Badge
                    variant="destructive"
                    className={`${badgeClass} inline-flex items-center gap-1 font-medium`}
                >
                    <Ban className="h-3 w-3 shrink-0" />
                    {t('Blocked')}
                </Badge>
            )}
            {total > 0 && (
                <Badge
                    variant="outline"
                    className={`${badgeClass} bg-muted/50 text-muted-foreground inline-flex items-center gap-1 font-normal`}
                    title={t('Sub-tasks')}
                >
                    <ListChecks className="h-3 w-3 shrink-0" />
                    {issue.completed_subtasks_count ?? 0}/{total}
                </Badge>
            )}
        </>
    );
};
