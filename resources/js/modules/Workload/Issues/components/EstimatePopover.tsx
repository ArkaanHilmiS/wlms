import React, { useState } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Issue } from '@/types/issue';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useTranslate } from '@/hooks/useTranslate';
import { useIconSize } from '@/hooks/use-appearance';

interface EstimatePopoverProps {
    issue: Issue;
    updateIssue: any;
}

export const EstimatePopover = ({
    issue,
    updateIssue,
}: EstimatePopoverProps) => {
    const { t } = useTranslate();
    const { iconSize } = useIconSize();
    const [open, setOpen] = useState(false);
    const currentOriginal = issue.original_estimate_seconds
        ? (issue.original_estimate_seconds / 3600).toString()
        : '';
    const currentRemaining =
        issue.remaining_estimate_seconds !== undefined &&
        issue.remaining_estimate_seconds !== null
            ? (issue.remaining_estimate_seconds / 3600).toString()
            : currentOriginal;

    const [originalHours, setOriginalHours] = useState(currentOriginal);
    const [remainingHours, setRemainingHours] = useState(currentRemaining);

    const handleSave = () => {
        const payload: any = {
            title: issue.title,
            description: issue.description,
            issue_type_id: issue.issue_type_id,
            priority_id: issue.priority_id,
            status_id: issue.status_id,
            sprint_id: issue.sprint_id,
            assignee_id: issue.assignee_id,
        };

        payload.original_estimate_seconds =
            originalHours.trim() === '' ? null : Number(originalHours) * 3600;
        payload.remaining_estimate_seconds =
            remainingHours.trim() === '' ? null : Number(remainingHours) * 3600;

        updateIssue({ id: issue.id, payload });
        setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        }
    };

    const triggerPillClass =
        iconSize === 'sm'
            ? 'text-[10px] px-1 py-0 min-w-[18px]'
            : iconSize === 'lg'
              ? 'text-sm px-2 py-0.5 min-w-[24px]'
              : 'text-xs px-1.5 py-0.5 min-w-[20px]';

    return (
        <Popover
            open={open}
            onOpenChange={(newOpen) => {
                setOpen(newOpen);
                if (newOpen) {
                    setOriginalHours(currentOriginal);
                    setRemainingHours(currentRemaining);
                }
            }}
        >
            <PopoverTrigger asChild>
                <span
                    className={`text-muted-foreground bg-muted/50 hover:bg-muted inline-block cursor-pointer rounded text-center font-mono transition-colors select-none ${triggerPillClass}`}
                    title={t('Remaining Estimate')}
                >
                    {currentRemaining ? currentRemaining : '-'}
                </span>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="center">
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <label className="text-muted-foreground text-xs font-medium">
                            Original estimate (h)
                        </label>
                        <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={originalHours}
                            onChange={(e) => setOriginalHours(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-muted-foreground text-xs font-medium">
                            Remaining estimate (h)
                        </label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={remainingHours}
                                onChange={(e) =>
                                    setRemainingHours(e.target.value)
                                }
                                onKeyDown={handleKeyDown}
                                className="h-8 text-sm"
                            />
                            <Button
                                size="sm"
                                className="h-8 px-2"
                                onClick={handleSave}
                            >
                                <Check className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};
