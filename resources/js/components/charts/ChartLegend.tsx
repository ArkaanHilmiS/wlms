import React from 'react';
import { useIconSize, type IconSize } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

export interface ChartLegendItem {
    label: string;
    color: string;
    value?: string | number;
}

export interface ChartLegendProps {
    items: ChartLegendItem[];
    className?: string;
    align?: 'start' | 'center' | 'end';
    direction?: 'row' | 'col';
    onItemClick?: (item: ChartLegendItem, index: number) => void;
    activeItemIndex?: number | null;
}

export function ChartLegend({
    items,
    className,
    align = 'center',
    direction = 'row',
    onItemClick,
    activeItemIndex,
}: ChartLegendProps) {
    const { iconSize } = useIconSize();

    if (!items || items.length === 0) {
        return null;
    }

    const densityStyles: Record<
        IconSize,
        {
            container: string;
            item: string;
            dot: string;
            text: string;
            value: string;
        }
    > = {
        sm: {
            container: 'gap-2.5 text-[11px]',
            item: 'gap-1.5',
            dot: 'size-1.5',
            text: 'text-[11px]',
            value: 'text-[11px]',
        },
        md: {
            container: 'gap-3.5 text-xs',
            item: 'gap-2',
            dot: 'size-2',
            text: 'text-xs',
            value: 'text-xs',
        },
        lg: {
            container: 'gap-4.5 text-sm',
            item: 'gap-2.5',
            dot: 'size-2.5',
            text: 'text-sm',
            value: 'text-sm',
        },
    };

    const currentDensity = densityStyles[iconSize];

    const alignClass =
        align === 'start'
            ? 'justify-start'
            : align === 'end'
              ? 'justify-end'
              : 'justify-center';

    return (
        <div
            role="list"
            className={cn(
                'flex flex-wrap items-center pt-2 select-none',
                direction === 'col' ? 'flex-col items-start' : 'flex-row',
                alignClass,
                currentDensity.container,
                className,
            )}
            data-slot="chart-legend"
        >
            {items.map((item, idx) => {
                const isActive =
                    activeItemIndex === undefined ||
                    activeItemIndex === null ||
                    activeItemIndex === idx;
                const isClickable = typeof onItemClick === 'function';

                return (
                    <div
                        key={`${item.label}-${idx}`}
                        role="listitem"
                        onClick={() => onItemClick?.(item, idx)}
                        className={cn(
                            'inline-flex items-center transition-all duration-150',
                            currentDensity.item,
                            isClickable && 'cursor-pointer hover:opacity-100',
                            !isActive && 'opacity-40 grayscale-[50%]',
                        )}
                    >
                        <span
                            className={cn(
                                'shrink-0 rounded-full shadow-xs',
                                currentDensity.dot,
                            )}
                            style={{ backgroundColor: item.color }}
                            aria-hidden="true"
                        />
                        <span
                            className={cn(
                                'text-muted-foreground hover:text-foreground truncate font-medium transition-colors',
                                currentDensity.text,
                            )}
                        >
                            {item.label}
                        </span>
                        {item.value !== undefined && (
                            <span
                                className={cn(
                                    'text-foreground ml-0.5 font-semibold tabular-nums',
                                    currentDensity.value,
                                )}
                            >
                                {item.value}
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default ChartLegend;
