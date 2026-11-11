import React, { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import {
    IssueLinkItem,
    LinkType,
    useAddIssueLink,
    useIssueLinks,
    useRemoveIssueLink,
} from '@/hooks/api/issues';
import { useTranslate } from '@/hooks/useTranslate';
import { Issue } from '@/types/issue';

const TYPE_OPTIONS: { value: LinkType; label: string }[] = [
    { value: 'BLOCKS', label: 'Blocks' },
    { value: 'IS_BLOCKED_BY', label: 'Blocked by' },
    { value: 'RELATES_TO', label: 'Relates to' },
    { value: 'DUPLICATES', label: 'Duplicates' },
];

const INVERSE: Record<LinkType, string> = {
    BLOCKS: 'Blocked by',
    IS_BLOCKED_BY: 'Blocks',
    RELATES_TO: 'Relates to',
    DUPLICATES: 'Duplicated by',
};

const linkLabel = (l: IssueLinkItem) =>
    l.direction === 'incoming'
        ? INVERSE[l.link_type]
        : TYPE_OPTIONS.find((o) => o.value === l.link_type)!.label;

export const IssueLinksPanel: React.FC<{
    issue: Issue;
    canManage: boolean;
    projectIssues: Issue[];
}> = ({ issue, canManage, projectIssues }) => {
    const { t } = useTranslate();
    const { data, isLoading } = useIssueLinks(issue.id);
    const addLink = useAddIssueLink();
    const removeLink = useRemoveIssueLink();
    const [targetId, setTargetId] = useState('');
    const [linkType, setLinkType] = useState<LinkType>('RELATES_TO');

    const subtasks = data?.subtasks ?? [];
    const links = data?.links ?? [];
    const done = subtasks.filter(
        (s) => s.status_category?.toUpperCase() === 'DONE',
    ).length;
    const linkedIds = new Set(links.map((l) => l.issue.id));

    const handleAdd = () =>
        addLink.mutate(
            { issueId: issue.id, targetIssueId: targetId, linkType },
            {
                onSuccess: () => setTargetId(''),
                onError: () => toast.error(t('Gagal menambahkan tautan')),
            },
        );

    return (
        <div className="space-y-5 py-4">
            {isLoading && (
                <p className="text-muted-foreground text-sm">
                    {t('Loading...')}
                </p>
            )}

            <section className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{t('Sub-tasks')}</h4>
                    {subtasks.length > 0 && (
                        <span className="text-muted-foreground text-xs">
                            {done}/{subtasks.length} {t('selesai')}
                        </span>
                    )}
                </div>
                {subtasks.length === 0 && (
                    <p className="text-muted-foreground text-xs">
                        {t('Belum ada sub-task.')}
                    </p>
                )}
                {subtasks.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground shrink-0 text-xs font-medium">
                            {s.key}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                            {s.title}
                        </span>
                        <Badge
                            variant={
                                s.status_category?.toUpperCase() === 'DONE'
                                    ? 'success'
                                    : 'secondary'
                            }
                            className="text-[10px]"
                        >
                            {s.status_name}
                        </Badge>
                    </div>
                ))}
            </section>

            <section className="space-y-2">
                <h4 className="text-sm font-medium">{t('Linked issues')}</h4>
                {links.length === 0 && (
                    <p className="text-muted-foreground text-xs">
                        {t('Belum ada tautan.')}
                    </p>
                )}
                {links.map((l) => (
                    <div key={l.id} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                            {t(linkLabel(l))}
                        </Badge>
                        <span className="text-muted-foreground shrink-0 text-xs font-medium">
                            {l.issue.key}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                            {l.issue.title}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                            {l.issue.status_name}
                        </Badge>
                        {canManage && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                aria-label={t('Hapus tautan')}
                                disabled={removeLink.isPending}
                                onClick={() =>
                                    removeLink.mutate({
                                        issueId: issue.id,
                                        linkId: l.id,
                                    })
                                }
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                ))}
            </section>

            {canManage && (
                <section className="space-y-2 border-t pt-4">
                    <Label>{t('Tambah tautan')}</Label>
                    <div className="grid grid-cols-[140px_1fr_auto] items-center gap-2">
                        <Combobox
                            options={TYPE_OPTIONS.map((o) => ({
                                value: o.value,
                                label: t(o.label),
                            }))}
                            value={linkType}
                            onChange={(v) => setLinkType(v as LinkType)}
                            placeholder={t('Type')}
                            emptyText="-"
                        />
                        <Combobox
                            options={projectIssues
                                .filter(
                                    (i) =>
                                        i.id !== issue.id &&
                                        !linkedIds.has(i.id),
                                )
                                .map((i) => ({
                                    value: i.id,
                                    label: `${i.key ?? i.id.slice(0, 3)} ${i.title}`,
                                }))}
                            value={targetId}
                            onChange={setTargetId}
                            placeholder={t('Search issue...')}
                            emptyText={t('No issues found.')}
                        />
                        <Button
                            type="button"
                            size="sm"
                            disabled={!targetId || addLink.isPending}
                            onClick={handleAdd}
                        >
                            {t('Tambah')}
                        </Button>
                    </div>
                </section>
            )}
        </div>
    );
};
