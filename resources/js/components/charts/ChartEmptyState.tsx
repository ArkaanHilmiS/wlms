import React from 'react';
import { BarChart3, type LucideIcon } from 'lucide-react';
import { useIconSize, type IconSize } from '@/hooks/use-appearance';
import { useTranslate } from '@/hooks/useTranslate';
import { cn } from '@/lib/utils';

export interface ChartEmptyStateProps {
    title?: string;
    description?: string;
    icon?: LucideIcon;
    action?: React.ReactNode;
    className?: string;
    height?: number | string;
}

export function ChartEmptyState({
    title,
    description,
    icon: Icon = BarChart3,
    action,
    className,
    height,
}: ChartEmptyStateProps) {
    const { t } = useTranslate();
    const { iconSize } = useIconSize();

    const displayTitle = title ?? t('No analytics data available');
    const displayDescription =
        description ??
        t('No completed tasks or activity recorded in the selected period.');

    const densityStyles: Record<
        IconSize,
        {
            wrapper: string;
            iconContainer: string;
            iconSize: number;
            title: string;
            desc: string;
            minHeight: string;
        }
    > = {
        sm: {
            wrapper: 'p-4 gap-2 rounded-lg',
            iconContainer: 'p-2 size-8',
            iconSize: 16,
            title: 'text-xs font-medium',
            desc: 'text-[11px] max-w-xs',
            minHeight: 'min-h-[160px]',
        },
        md: {
            wrapper: 'p-6 gap-2.5 rounded-xl',
            iconContainer: 'p-2.5 size-10',
            iconSize: 20,
            title: 'text-sm font-semibold',
            desc: 'text-xs max-w-sm',
            minHeight: 'min-h-[200px]',
        },
        lg: {
            wrapper: 'p-8 gap-3 rounded-2xl',
            iconContainer: 'p-3 size-12',
            iconSize: 24,
            title: 'text-base font-semibold',
            desc: 'text-sm max-w-md',
            minHeight: 'min-h-[260px]',
        },
    };

    const currentDensity = densityStyles[iconSize];

    return (
        <div
            className={cn(
                'flex w-full flex-col items-center justify-center text-center',
                'border-border/70 bg-muted/10 border-2 border-dashed',
                currentDensity.minHeight,
                currentDensity.wrapper,
                className,
            )}
            style={
                height
                    ? {
                          height:
                              typeof height === 'number'
                                  ? `${height}px`
                                  : height,
                      }
                    : undefined
            }
            data-slot="chart-empty-state"
        >
            <div
                className={cn(
                    'bg-muted/60 text-muted-foreground ring-border/50 flex items-center justify-center rounded-full ring-1',
                    currentDensity.iconContainer,
                )}
                aria-hidden="true"
            >
                <Icon
                    size={currentDensity.iconSize}
                    className="stroke-[1.75]"
                />
            </div>

            <div className="mt-1 flex flex-col items-center gap-1">
                <h4
                    className={cn(
                        'text-foreground tracking-tight',
                        currentDensity.title,
                    )}
                >
                    {displayTitle}
                </h4>
                {displayDescription && (
                    <p
                        className={cn(
                            'text-muted-foreground leading-relaxed',
                            currentDensity.desc,
                        )}
                    >
                        {displayDescription}
                    </p>
                )}
            </div>

            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}

export default ChartEmptyState;
