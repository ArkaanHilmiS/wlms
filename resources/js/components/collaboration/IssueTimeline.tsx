import { useIssueTimeline } from '@/hooks/collaboration/use-issue-timeline';
import { Spinner } from '@/components/ui/spinner';
import { useTranslate } from '@/hooks/useTranslate';

type Props = {
    issueId: string;
};

export function IssueTimeline({ issueId }: Props) {
    const { t } = useTranslate();
    const { data: timeline, isLoading, error } = useIssueTimeline(issueId);

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Spinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-500">{t('Failed to load timeline')}</div>
        );
    }

    if (!timeline || timeline.length === 0) {
        return (
            <div className="text-muted-foreground p-4 text-center text-sm">
                {t('No activity yet.')}
            </div>
        );
    }

    const formatTime = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(dateString));
    };

    return (
        <div className="space-y-4">
            {timeline.map((item) => (
                <div key={item.id} className="flex gap-4 rounded-md border p-4">
                    <div className="flex-1">
                        {item.type === 'comment' ? (
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm font-semibold">
                                        {t('User')} {item.actorId}
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                        {formatTime(item.createdAt)}
                                    </span>
                                </div>
                                <div className="text-sm whitespace-pre-wrap">
                                    {item.payload.body}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <span className="text-sm">
                                    <span className="font-medium">
                                        {t('User')} {item.actorId}
                                    </span>{' '}
                                    <span className="text-muted-foreground">
                                        {item.payload.event}
                                    </span>
                                </span>
                                <span className="text-muted-foreground text-xs">
                                    {formatTime(item.createdAt)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
