import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LinkType, useSimilarIssues } from '@/hooks/api/issues';
import { useTranslate } from '@/hooks/useTranslate';

export interface LinkAfterCreate {
    targetId: string;
    linkType: LinkType;
}

interface Props {
    projectId?: string | null;
    title: string;
    value: LinkAfterCreate | null;
    onChange: (v: LinkAfterCreate | null) => void;
}

const ACTIONS: { type: LinkType; label: string }[] = [
    { type: 'RELATES_TO', label: 'Relates To' },
    { type: 'DUPLICATES', label: 'Duplicate' },
];

/** Saran tiket serupa saat membuat issue; pilihan disimpan di parent (linkAfterCreate). */
export const SimilarIssuesBox: React.FC<Props> = ({
    projectId,
    title,
    value,
    onChange,
}) => {
    const { t } = useTranslate();
    const { data } = useSimilarIssues(projectId, title);
    const items = (data ?? []).slice(0, 5);
    if (items.length === 0) return null;

    return (
        <div className="space-y-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs">
            <p className="font-medium text-amber-700 dark:text-amber-400">
                {t('Tiket serupa ditemukan')}
            </p>
            {items.map((s) => {
                const done = s.status_category?.toUpperCase() === 'DONE';
                return (
                    <div key={s.id} className="flex items-center gap-2">
                        <span className="text-muted-foreground shrink-0 font-medium">
                            {s.key}
                        </span>
                        <span className="min-w-0 flex-1 truncate" title={s.title}>
                            {s.title}
                        </span>
                        <Badge
                            variant={done ? 'success' : 'secondary'}
                            className="h-4 shrink-0 px-1.5 py-0 text-[10px]"
                        >
                            {done ? t('Selesai') : s.status_name}
                        </Badge>
                        {ACTIONS.map((a) => {
                            const active =
                                value?.targetId === s.id &&
                                value.linkType === a.type;
                            return (
                                <Button
                                    key={a.type}
                                    type="button"
                                    size="sm"
                                    variant={active ? 'default' : 'outline'}
                                    className="h-6 shrink-0 px-2 text-[10px]"
                                    onClick={() =>
                                        onChange(
                                            active
                                                ? null
                                                : {
                                                      targetId: s.id,
                                                      linkType: a.type,
                                                  },
                                        )
                                    }
                                >
                                    {t(a.label)}
                                </Button>
                            );
                        })}
                    </div>
                );
            })}
            {value && (
                <p className="text-muted-foreground">
                    {t('Akan ditautkan setelah dibuat.')}{' '}
                    <button
                        type="button"
                        className="underline"
                        onClick={() => onChange(null)}
                    >
                        {t('Batal pilih')}
                    </button>
                </p>
            )}
        </div>
    );
};
