import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sprint } from '@/types/sprint';
import { useSprints, UpdateSprintPayload } from '../hooks/useSprints';
import { toast } from 'sonner';
import { addWeeks } from 'date-fns';
import { useTranslate } from '@/hooks/useTranslate';
import { useIconSize } from '@/hooks/use-appearance';

interface SprintFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sprint: Sprint | null;
    projectId: string;
    mode?: 'edit' | 'start';
}

export const SprintFormDialog: React.FC<SprintFormDialogProps> = ({
    open,
    onOpenChange,
    sprint,
    projectId,
    mode = 'edit',
}) => {
    const { t } = useTranslate();
    const { iconSize } = useIconSize();
    const { updateSprint, startSprint, isUpdating, isStarting } =
        useSprints(projectId);

    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [goal, setGoal] = useState('');
    const [duration, setDuration] = useState(
        mode === 'start' ? '2w' : 'custom',
    );
    const [durationOpen, setDurationOpen] = useState(false);

    const durations = [
        { value: 'custom', label: 'Custom' },
        { value: '1w', label: '1 week' },
        { value: '2w', label: '2 weeks' },
        { value: '3w', label: '3 weeks' },
        { value: '4w', label: '4 weeks' },
    ];

    useEffect(() => {
        if (open && sprint) {
            setName(sprint.name);
            setGoal(sprint.goal || '');
            setStartDate(
                sprint.start_date
                    ? sprint.start_date.substring(0, 16)
                    : mode === 'start'
                      ? new Date(
                            new Date().getTime() -
                                new Date().getTimezoneOffset() * 60000,
                        )
                            .toISOString()
                            .substring(0, 16)
                      : '',
            );
            setEndDate(sprint.end_date ? sprint.end_date.substring(0, 16) : '');
            setDuration(mode === 'start' ? '2w' : 'custom'); // Default based on mode
        }
    }, [open, sprint]);

    useEffect(() => {
        if (duration !== 'custom' && startDate) {
            const weeks = parseInt(duration.replace('w', ''));
            const newEndDate = addWeeks(new Date(startDate), weeks);
            // Format to YYYY-MM-DDThh:mm (respecting local timezone offset)
            const iso = new Date(
                newEndDate.getTime() - newEndDate.getTimezoneOffset() * 60000,
            )
                .toISOString()
                .substring(0, 16);
            setEndDate(iso);
        }
    }, [duration, startDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sprint) return;

        try {
            await updateSprint({
                id: sprint.id,
                payload: {
                    name,
                    goal: goal || undefined,
                    start_date: startDate
                        ? new Date(startDate).toISOString()
                        : undefined,
                    end_date: endDate
                        ? new Date(endDate).toISOString()
                        : undefined,
                },
            });

            if (mode === 'start') {
                await startSprint(sprint.id);
                toast.success(t('Sprint started successfully!'));
            } else {
                toast.success(t('Sprint updated successfully'));
            }
            onOpenChange(false);
        } catch (error: any) {
            toast.error(
                error.response?.data?.error ||
                    error.response?.data?.message ||
                    `Failed to ${mode} sprint`,
            );
            console.error(error);
        }
    };

    if (!sprint) return null;

    const inputClass =
        iconSize === 'sm'
            ? 'h-8 text-xs'
            : iconSize === 'lg'
              ? 'h-10 text-base'
              : 'h-9 text-sm';
    const labelClass =
        iconSize === 'sm'
            ? 'text-xs'
            : iconSize === 'lg'
              ? 'text-base font-medium'
              : 'text-sm font-medium';
    const btnClass =
        iconSize === 'sm'
            ? 'h-8 text-xs px-3'
            : iconSize === 'lg'
              ? 'h-10 text-base px-5'
              : 'h-9 text-sm px-4';
    const iconClass =
        iconSize === 'sm'
            ? 'h-3.5 w-3.5'
            : iconSize === 'lg'
              ? 'h-5 w-5'
              : 'h-4 w-4';
    const formSpacing =
        iconSize === 'sm'
            ? 'space-y-3 py-3'
            : iconSize === 'lg'
              ? 'space-y-5 py-5'
              : 'space-y-4 py-4';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    iconSize === 'sm'
                        ? 'sm:max-w-[460px]'
                        : iconSize === 'lg'
                          ? 'sm:max-w-[560px]'
                          : 'sm:max-w-[500px]',
                )}
            >
                <DialogHeader>
                    <DialogTitle
                        className={
                            iconSize === 'sm'
                                ? 'text-base'
                                : iconSize === 'lg'
                                  ? 'text-xl'
                                  : 'text-lg'
                        }
                    >
                        {mode === 'start' ? 'Start sprint' : 'Edit sprint'}:{' '}
                        {sprint.name}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className={formSpacing}>
                    <p
                        className={cn(
                            'text-muted-foreground',
                            iconSize === 'sm'
                                ? 'text-[11px]'
                                : iconSize === 'lg'
                                  ? 'text-sm'
                                  : 'text-xs',
                        )}
                    >
                        {t('Required fields are marked with an asterisk')}{' '}
                        <span className="text-destructive">*</span>
                    </p>

                    <div className="space-y-1.5">
                        <Label className={labelClass}>
                            {t('Sprint name')}{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className={labelClass}>{t('Duration')}</Label>
                        <Popover
                            open={durationOpen}
                            onOpenChange={setDurationOpen}
                        >
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={durationOpen}
                                    className={cn(
                                        'w-full justify-between font-normal',
                                        inputClass,
                                    )}
                                >
                                    {durations.find((d) => d.value === duration)
                                        ?.label || 'Select duration...'}
                                    <ChevronsUpDown
                                        className={cn(
                                            'ml-2 shrink-0 opacity-50',
                                            iconClass,
                                        )}
                                    />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className={cn(
                                    'p-0',
                                    iconSize === 'sm'
                                        ? 'w-[400px]'
                                        : iconSize === 'lg'
                                          ? 'w-[500px]'
                                          : 'w-[450px]',
                                )}
                                align="start"
                            >
                                <Command>
                                    <CommandInput
                                        placeholder={t('Search duration...')}
                                        className={inputClass}
                                    />
                                    <CommandList>
                                        <CommandEmpty
                                            className={
                                                iconSize === 'sm'
                                                    ? 'py-4 text-xs'
                                                    : iconSize === 'lg'
                                                      ? 'py-6 text-sm'
                                                      : 'py-6 text-xs'
                                            }
                                        >
                                            {t('No duration found.')}
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {durations.map((d) => (
                                                <CommandItem
                                                    key={d.value}
                                                    value={d.value}
                                                    className={
                                                        iconSize === 'sm'
                                                            ? 'py-1.5 text-xs'
                                                            : iconSize === 'lg'
                                                              ? 'py-2.5 text-base'
                                                              : 'py-2 text-sm'
                                                    }
                                                    onSelect={(
                                                        currentValue,
                                                    ) => {
                                                        setDuration(
                                                            currentValue,
                                                        );
                                                        setDurationOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2',
                                                            iconClass,
                                                            duration === d.value
                                                                ? 'opacity-100'
                                                                : 'opacity-0',
                                                        )}
                                                    />
                                                    {d.label}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className={labelClass}>
                                {t('Start date')}
                            </Label>
                            <Input
                                type="datetime-local"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className={labelClass}>
                                {t('End date')}
                            </Label>
                            <Input
                                type="datetime-local"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                readOnly={duration !== 'custom'}
                                className={cn(
                                    inputClass,
                                    duration !== 'custom'
                                        ? 'bg-muted cursor-not-allowed opacity-70'
                                        : '',
                                )}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className={labelClass}>{t('Sprint goal')}</Label>
                        <Textarea
                            rows={
                                iconSize === 'sm'
                                    ? 3
                                    : iconSize === 'lg'
                                      ? 5
                                      : 4
                            }
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            className={cn(
                                iconSize === 'sm'
                                    ? 'text-xs'
                                    : iconSize === 'lg'
                                      ? 'text-base'
                                      : 'text-sm',
                            )}
                        />
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className={btnClass}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                isUpdating || (mode === 'start' && isStarting)
                            }
                            className={btnClass}
                        >
                            {mode === 'start'
                                ? isUpdating || isStarting
                                    ? 'Starting...'
                                    : 'Start'
                                : isUpdating
                                  ? 'Updating...'
                                  : 'Update'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
