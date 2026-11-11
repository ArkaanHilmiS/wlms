import { IssueTimeline } from './IssueTimeline';
import { CommentBox } from './CommentBox';
import { useTranslate } from '@/hooks/useTranslate';

type Props = {
    issueId: string;
};

export function CommentThread({ issueId }: Props) {
    const { t } = useTranslate();
    return (
        <div className="space-y-8">
            <h3 className="text-lg font-semibold">{t('Activity')}</h3>

            <IssueTimeline issueId={issueId} />

            <div className="border-t pt-4">
                <CommentBox issueId={issueId} />
            </div>
        </div>
    );
}
