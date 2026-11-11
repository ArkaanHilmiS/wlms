import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar, ChevronDown } from 'lucide-react';
import { useTranslate } from '@/hooks/useTranslate';
import { useIconSize } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

export type DateRangePreset = '7d' | '30d' | 'quarter' | 'custom';

export interface DateRangeFilterProps {
    dateRange: DateRangePreset;
    from?: string;
    to?: string;
    onChange: (params: {
        dateRange: DateRangePreset;
        from?: string;
        to?: string;
    }) => void;
    className?: string;
}

export function DateRangeFilter({
    dateRange,
    from,
    to,
    onChange,
    className,
}: DateRangeFilterProps) {
    const { t } = useTranslate();
    const { iconSize } = useIconSize();
    const [customOpen, setCustomOpen] = useState(false);
    const [tempFrom, setTempFrom] = useState(from || '');
    const [tempTo, setTempTo] = useState(to || '');

    const btnHeight =
        iconSize === 'sm'
            ? 'h-7 text-xs px-2.5'
            : iconSize === 'lg'
              ? 'h-9 text-sm px-4'
              : 'h-8 text-xs px-3';

    const getLabel = (preset: DateRangePreset): string => {
        switch (preset) {
            case '7d':
                return t('Last 7 Days');
            case '30d':
                return t('Last 30 Days');
            case 'quarter':
                return t('This Quarter');
            case 'custom':
                return from && to ? `${from} - ${to}` : t('Custom Range');
        }
    };

    const handleApplyCustom = () => {
        if (tempFrom && tempTo) {
            onChange({ dateRange: 'custom', from: tempFrom, to: tempTo });
            setCustomOpen(false);
        }
    };

    return (
        <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
            <div className="bg-muted/40 flex items-center rounded-lg border p-0.5">
                <Button
                    variant={dateRange === '7d' ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                        btnHeight,
                        'rounded-md font-medium transition-all',
                    )}
                    onClick={() => onChange({ dateRange: '7d' })}
                >
                    {t('7 Days')}
                </Button>
                <Button
                    variant={dateRange === '30d' ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                        btnHeight,
                        'rounded-md font-medium transition-all',
                    )}
                    onClick={() => onChange({ dateRange: '30d' })}
                >
                    {t('30 Days')}
                </Button>
                <Button
                    variant={dateRange === 'quarter' ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                        btnHeight,
                        'rounded-md font-medium transition-all',
                    )}
                    onClick={() => onChange({ dateRange: 'quarter' })}
                >
                    {t('Quarter')}
                </Button>
            </div>

            <Popover open={customOpen} onOpenChange={setCustomOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant={dateRange === 'custom' ? 'default' : 'outline'}
                        size="sm"
                        className={cn(btnHeight, 'gap-1.5 font-medium')}
                    >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                            {getLabel(
                                dateRange === 'custom' ? 'custom' : 'custom',
                            )}
                        </span>
                        <ChevronDown className="h-3 w-3 opacity-60" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 space-y-3 p-4" align="end">
                    <div className="text-foreground text-xs font-semibold">
                        {t('Select Custom Date Range')}
                    </div>
                    <div className="space-y-2">
                        <div>
                            <label className="text-muted-foreground mb-1 block text-[11px] font-medium">
                                {t('From')}
                            </label>
                            <Input
                                type="date"
                                value={tempFrom}
                                onChange={(e) => setTempFrom(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>
                        <div>
                            <label className="text-muted-foreground mb-1 block text-[11px] font-medium">
                                {t('To')}
                            </label>
                            <Input
                                type="date"
                                value={tempTo}
                                onChange={(e) => setTempTo(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 border-t pt-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setCustomOpen(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={handleApplyCustom}
                            disabled={!tempFrom || !tempTo}
                        >
                            {t('Apply')}
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
