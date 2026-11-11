import React from 'react';
import { format } from 'date-fns';
import { Worklog } from '../hooks/useIssues';
import { useTranslate } from '@/hooks/useTranslate';

interface WorklogHistoryProps {
    worklogs: Worklog[];
    isLoading?: boolean;
}

const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
};

export const WorklogHistory: React.FC<WorklogHistoryProps> = ({
    worklogs,
    isLoading,
}) => {
    const { t } = useTranslate();
    if (isLoading) {
        return (
            <div className="text-muted-foreground py-4 text-center text-sm">
                {t('Loading worklogs...')}
            </div>
        );
    }

    if (!worklogs || worklogs.length === 0) {
        return (
            <div className="text-muted-foreground py-4 text-center text-sm">
                {t('No worklogs found.')}
            </div>
        );
    }

    return (
        <div className="mt-4 space-y-4">
            {worklogs.map((worklog) => (
                <div
                    key={worklog.id}
                    className="bg-background flex gap-4 rounded-lg border p-4"
                >
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                                {worklog.author?.name || 'Unknown User'}
                            </p>
                            <span className="bg-secondary rounded-md px-2 py-1 text-xs font-semibold">
                                {formatDuration(worklog.time_spent_seconds)}
                            </span>
                        </div>
                        <p className="text-muted-foreground text-xs">
                            {format(
                                new Date(worklog.started_at),
                                "MMM d, yyyy 'at' h:mm a",
                            )}
                        </p>
                        {worklog.description && (
                            <p className="text-foreground mt-2 text-sm whitespace-pre-wrap">
                                {worklog.description}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};
