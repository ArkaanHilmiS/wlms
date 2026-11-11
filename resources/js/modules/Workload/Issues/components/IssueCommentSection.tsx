import React, { useRef, useState } from 'react';
import { format } from 'date-fns';
import { AtSign, MessageSquare, Send, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useIssueComments } from '../hooks/useIssueComments';
import { useTranslate } from '@/hooks/useTranslate';

interface MentionUser {
    id: string | number;
    name: string;
    email?: string;
}

interface IssueCommentSectionProps {
    issueId: string;
    users?: MentionUser[];
}

export const IssueCommentSection: React.FC<IssueCommentSectionProps> = ({
    issueId,
    users = [],
}) => {
    const { t } = useTranslate();
    const { comments, isLoading, addComment, isAdding } =
        useIssueComments(issueId);

    const [newComment, setNewComment] = useState('');
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionIndex, setMentionIndex] = useState<number>(-1);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // Filter users matching mention query
    const matchingUsers =
        mentionQuery !== null
            ? users
                  .filter(
                      (u) =>
                          u.name
                              .toLowerCase()
                              .includes(mentionQuery.toLowerCase()) ||
                          (u.email || '')
                              .toLowerCase()
                              .includes(mentionQuery.toLowerCase()),
                  )
                  .slice(0, 5)
            : [];

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart;
        setNewComment(value);

        // Check if cursor is right after an '@'
        const textBeforeCursor = value.slice(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const query = textBeforeCursor.slice(lastAtIndex + 1);
            // Valid mention search (no spaces)
            if (!/\s/.test(query) && query.length <= 20) {
                setMentionQuery(query);
                setMentionIndex(lastAtIndex);
                setSelectedIndex(0);
                return;
            }
        }

        setMentionQuery(null);
        setMentionIndex(-1);
    };

    const handleSelectMention = (user: MentionUser) => {
        if (mentionIndex === -1) return;

        const cleanName = user.name.replace(/\s+/g, '');
        const before = newComment.slice(0, mentionIndex);
        const cursorPosition =
            textareaRef.current?.selectionStart ??
            mentionIndex + (mentionQuery?.length ?? 0) + 1;
        const after = newComment.slice(cursorPosition);

        const updated = `${before}@${cleanName} ${after}`;
        setNewComment(updated);
        setMentionQuery(null);
        setMentionIndex(-1);

        setTimeout(() => {
            if (textareaRef.current) {
                const nextCursor = before.length + cleanName.length + 2;
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(nextCursor, nextCursor);
            }
        }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (mentionQuery !== null && matchingUsers.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % matchingUsers.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(
                    (prev) =>
                        (prev - 1 + matchingUsers.length) %
                        matchingUsers.length,
                );
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                handleSelectMention(matchingUsers[selectedIndex]);
            } else if (e.key === 'Escape') {
                setMentionQuery(null);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        await addComment({ body: newComment });
        setNewComment('');
        setMentionQuery(null);
    };

    // Highlight @mentions in comment body
    const renderCommentBody = (body: string) => {
        const parts = body.split(/(@[a-zA-Z0-9._-]+)/g);
        return parts.map((part, idx) => {
            if (part.startsWith('@')) {
                return (
                    <span
                        key={idx}
                        className="bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold transition-colors"
                    >
                        {part}
                    </span>
                );
            }
            return <span key={idx}>{part}</span>;
        });
    };

    return (
        <div className="mt-4 space-y-6">
            <div className="space-y-4">
                <h3 className="flex items-center gap-1.5 text-sm font-medium">
                    <MessageSquare className="text-muted-foreground h-4 w-4" />
                    <span>{t('Comments')}</span>
                </h3>

                {isLoading ? (
                    <div className="text-muted-foreground py-4 text-center text-sm">
                        {t('Loading comments...')}
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-muted-foreground py-4 text-center text-sm">
                        {t('No comments yet.')}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {comments.map((comment) => (
                            <div
                                key={comment.id}
                                className="bg-background flex gap-4 rounded-lg border p-4 shadow-xs"
                            >
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium">
                                            {comment.author?.name ||
                                                'Unknown User'}
                                        </p>
                                        <p className="text-muted-foreground font-mono text-xs">
                                            {format(
                                                new Date(comment.created_at),
                                                "MMM d, yyyy 'at' h:mm a",
                                            )}
                                        </p>
                                    </div>
                                    <div className="text-foreground mt-2 text-sm leading-relaxed whitespace-pre-wrap">
                                        {renderCommentBody(comment.body)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Comment Form with @Mention Autocomplete */}
            <form
                onSubmit={handleSubmit}
                className="relative space-y-3 border-t pt-4"
            >
                <div className="relative">
                    <Textarea
                        ref={textareaRef}
                        placeholder={t(
                            'Add a comment... Type @ to mention a team member',
                        )}
                        value={newComment}
                        onChange={handleTextChange}
                        onKeyDown={handleKeyDown}
                        rows={3}
                        disabled={isAdding}
                    />

                    {/* Floating Mention Suggestions Popover */}
                    {mentionQuery !== null && matchingUsers.length > 0 && (
                        <div className="bg-popover text-popover-foreground animate-in fade-in-50 zoom-in-95 absolute bottom-full left-0 z-50 mb-1 w-64 overflow-hidden rounded-lg border shadow-md">
                            <div className="bg-muted/40 text-muted-foreground flex items-center gap-1 border-b px-2.5 py-1.5 text-[11px] font-semibold">
                                <AtSign className="h-3 w-3" />
                                <span>{t('Mention team member')}</span>
                            </div>
                            <div className="p-1">
                                {matchingUsers.map((user, idx) => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() =>
                                            handleSelectMention(user)
                                        }
                                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                                            idx === selectedIndex
                                                ? 'bg-primary text-primary-foreground'
                                                : 'hover:bg-accent hover:text-accent-foreground'
                                        }`}
                                    >
                                        <User className="h-3.5 w-3.5 shrink-0" />
                                        <div className="min-w-0 flex-1 truncate">
                                            <p className="truncate font-medium">
                                                {user.name}
                                            </p>
                                            <p
                                                className={`truncate text-[10px] ${idx === selectedIndex ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}
                                            >
                                                {user.email}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-[11px]">
                        {t('Tip: Use @name to mention colleagues')}
                    </span>
                    <Button
                        type="submit"
                        size="sm"
                        disabled={isAdding || !newComment.trim()}
                        className="gap-1.5"
                    >
                        <Send className="h-3.5 w-3.5" />
                        <span>
                            {isAdding ? t('Posting...') : t('Post Comment')}
                        </span>
                    </Button>
                </div>
            </form>
        </div>
    );
};
