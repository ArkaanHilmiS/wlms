import { useState } from 'react';
import { useAddComment } from '@/hooks/collaboration/use-add-comment';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslate } from '@/hooks/useTranslate';

type Props = {
    issueId: string;
    parentId?: string;
    onSuccess?: () => void;
};

export function CommentBox({ issueId, parentId, onSuccess }: Props) {
    const { t } = useTranslate();
    const [body, setBody] = useState('');
    const { mutate: addComment, isPending } = useAddComment();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!body.trim()) return;

        addComment(
            { issueId, body, parentId },
            {
                onSuccess: () => {
                    setBody('');
                    if (onSuccess) onSuccess();
                },
            },
        );
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
                placeholder={t('Leave a comment...')}
                value={body}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setBody(e.target.value)
                }
                disabled={isPending}
                rows={3}
            />
            <div className="flex justify-end">
                <Button type="submit" disabled={isPending || !body.trim()}>
                    {isPending ? 'Posting...' : 'Post Comment'}
                </Button>
            </div>
        </form>
    );
}
