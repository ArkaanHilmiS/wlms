import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Sprint } from '@/types/sprint';
import { Issue } from '@/types/issue';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslate } from '@/hooks/useTranslate';
import { useIconSize } from '@/hooks/use-appearance';

interface CompleteSprintDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sprint: Sprint | null;
    issues: Issue[];
    availableSprints: Sprint[];
    onComplete: (
        sprintId: string,
        moveToSprintId: string | null,
    ) => Promise<void>;
    isCompleting: boolean;
}

export const CompleteSprintDialog: React.FC<CompleteSprintDialogProps> = ({
    open,
    onOpenChange,
    sprint,
    issues,
    availableSprints,
    onComplete,
    isCompleting,
}) => {
    const { t } = useTranslate();
    const { iconSize } = useIconSize();
    const [moveTo, setMoveTo] = useState<string>('backlog');

    if (!sprint) return null;

    // Calculate completed vs open
    const sprintIssues = issues.filter((i) => i.sprint_id === sprint.id);
    const completedCount = sprintIssues.filter(
        (i) =>
            i.status?.category === 'DONE' ||
            i.status?.name?.toLowerCase() === 'done',
    ).length;
    const openCount = sprintIssues.length - completedCount;

    // Filter available sprints for the dropdown (exclude current sprint and completed sprints)
    const targetSprints = availableSprints.filter(
        (s) => s.id !== sprint.id && s.state !== 'COMPLETED',
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetId = moveTo === 'backlog' ? null : moveTo;
        await onComplete(sprint.id, targetId);
        onOpenChange(false);
    };

    const bannerHeight =
        iconSize === 'sm' ? 'h-24' : iconSize === 'lg' ? 'h-36' : 'h-28';
    const trophySize =
        iconSize === 'sm'
            ? 'w-7 h-7'
            : iconSize === 'lg'
              ? 'w-11 h-11'
              : 'w-9 h-9';
    const formPadding =
        iconSize === 'sm'
            ? 'p-4 pt-3 space-y-4 text-xs'
            : iconSize === 'lg'
              ? 'p-7 pt-5 space-y-6 text-base'
              : 'p-6 pt-4 space-y-5 text-sm';
    const btnClass =
        iconSize === 'sm'
            ? 'h-8 text-xs px-3'
            : iconSize === 'lg'
              ? 'h-10 text-base px-5'
              : 'h-9 text-sm px-4';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="overflow-hidden p-0 sm:max-w-[500px]">
                <div
                    className={`bg-gradient-to-r from-blue-500 to-cyan-400 ${bannerHeight} relative flex items-center justify-center overflow-hidden transition-all`}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-white to-transparent opacity-20"></div>
                    <div className="z-10 rounded-full border-4 border-white/20 bg-yellow-400 p-3 shadow-lg sm:p-3.5">
                        <Trophy className={`${trophySize} text-white`} />
                    </div>
                </div>

                <form onSubmit={handleSubmit} className={formPadding}>
                    <DialogHeader>
                        <DialogTitle
                            className={
                                iconSize === 'sm'
                                    ? 'text-lg font-bold'
                                    : iconSize === 'lg'
                                      ? 'text-2xl font-bold'
                                      : 'text-xl font-bold'
                            }
                        >
                            {t('Complete')} {sprint.name}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3">
                        <p>
                            {t('This sprint contains')}{' '}
                            <span className="font-bold">
                                {completedCount} {t('completed work items')}
                            </span>{' '}
                            {t('and')}{' '}
                            <span className="font-bold">
                                {openCount} {t('open work items')}
                            </span>
                            .
                        </p>

                        <ul className="text-muted-foreground list-disc space-y-1.5 pl-5">
                            <li>
                                {t(
                                    'Completed work items includes everything in the last column on the board, Done.',
                                )}
                            </li>
                            <li>
                                {t(
                                    'Open work items includes everything from any other column on the board. Move these to a new sprint or the backlog.',
                                )}
                            </li>
                        </ul>

                        {openCount > 0 && (
                            <div className="space-y-1.5 pt-2">
                                <label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                                    {t('Move open work items to')}
                                </label>
                                <Combobox
                                    options={[
                                        ...targetSprints.map((ts) => ({
                                            value: ts.id,
                                            label: ts.name,
                                        })),
                                        { value: 'backlog', label: 'Backlog' },
                                    ]}
                                    value={moveTo}
                                    onChange={(val) =>
                                        setMoveTo(val || 'backlog')
                                    }
                                    placeholder={t('Select destination')}
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 pt-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="ghost"
                            className={btnClass}
                            onClick={() => onOpenChange(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="submit"
                            className={btnClass}
                            disabled={isCompleting}
                        >
                            {isCompleting ? 'Completing...' : 'Complete sprint'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
