import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useIconSize, type IconSize } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

export interface ChartCardSkeletonProps {
    className?: string;
    showHeader?: boolean;
    showLegend?: boolean;
    height?: number | string;
}

export function ChartCardSkeleton({
    className,
    showHeader = true,
    showLegend = false,
    height,
}: ChartCardSkeletonProps) {
    const { iconSize } = useIconSize();

    const densityStyles: Record<
        IconSize,
        {
            card: string;
            chartHeight: string;
            headerTitleHeight: string;
            badgeHeight: string;
        }
    > = {
        sm: {
            card: 'p-3.5 gap-2.5 rounded-lg',
            chartHeight: 'h-[160px]',
            headerTitleHeight: 'h-3.5 w-28',
            badgeHeight: 'h-4 w-14',
        },
        md: {
            card: 'p-5 gap-3.5 rounded-xl',
            chartHeight: 'h-[220px]',
            headerTitleHeight: 'h-4 w-36',
            badgeHeight: 'h-5 w-18',
        },
        lg: {
            card: 'p-6 gap-4.5 rounded-2xl',
            chartHeight: 'h-[280px]',
            headerTitleHeight: 'h-5 w-44',
            badgeHeight: 'h-6 w-20',
        },
    };

    const currentDensity = densityStyles[iconSize];

    return (
        <div
            className={cn(
                'border-border/80 bg-card text-card-foreground flex flex-col border shadow-xs',
                currentDensity.card,
                className,
            )}
            data-slot="chart-card-skeleton"
            aria-busy="true"
            aria-live="polite"
        >
            {showHeader && (
                <div className="flex items-center justify-between pb-1">
                    <div className="flex flex-col gap-1.5">
                        <Skeleton
                            className={cn(
                                'rounded-sm',
                                currentDensity.headerTitleHeight,
                            )}
                        />
                        <Skeleton className="h-2.5 w-48 rounded-sm opacity-60" />
                    </div>
                    <Skeleton
                        className={cn(
                            'rounded-full',
                            currentDensity.badgeHeight,
                        )}
                    />
                </div>
            )}

            <div
                className={cn('w-full', !height && currentDensity.chartHeight)}
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
            >
                <Skeleton className="h-full w-full rounded-lg" />
            </div>

            {showLegend && (
                <div className="flex items-center justify-center gap-4 pt-1">
                    <Skeleton className="h-3 w-16 rounded-full" />
                    <Skeleton className="h-3 w-20 rounded-full" />
                    <Skeleton className="h-3 w-16 rounded-full" />
                </div>
            )}
        </div>
    );
}

export default ChartCardSkeleton;
