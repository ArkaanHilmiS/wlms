import React, { useState } from 'react';
import { useIconSize, type IconSize } from '@/hooks/use-appearance';
import { useTranslate } from '@/hooks/useTranslate';
import { ResponsiveContainer } from './ResponsiveContainer';
import { ChartTooltip, type ChartTooltipItem } from './ChartTooltip';
import { ChartEmptyState } from './ChartEmptyState';
import { cn } from '@/lib/utils';

export interface HistogramBucket {
    bucket: string;
    count: number;
    percentage?: number;
}

export interface LeadTimeHistogramProps {
    data: HistogramBucket[];
    averageDays?: number;
    medianDays?: number;
    p85Days?: number;
    metricLabel?: string;
    height?: number | string;
    densityHeight?: Partial<Record<IconSize, number>>;
    barColor?: string;
    emptyTitle?: string;
    emptyMessage?: string;
    className?: string;
    showSummaryCards?: boolean;
    showGrid?: boolean;
    showTooltip?: boolean;
}

export function LeadTimeHistogram({
    data,
    averageDays,
    medianDays,
    p85Days,
    metricLabel,
    height,
    densityHeight,
    barColor = 'var(--chart-1)',
    emptyTitle,
    emptyMessage,
    className,
    showSummaryCards = true,
    showGrid = true,
    showTooltip = true,
}: LeadTimeHistogramProps) {
    const { t } = useTranslate();
    const { iconSize } = useIconSize();
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number }>({
        x: 0,
        y: 0,
    });

    const totalCount = data
        ? data.reduce((sum, d) => sum + (Number(d.count) || 0), 0)
        : 0;

    if (!data || data.length === 0 || totalCount === 0) {
        return (
            <ChartEmptyState
                title={emptyTitle}
                description={emptyMessage}
                height={height}
                className={className}
            />
        );
    }

    const densityConfig: Record<
        IconSize,
        {
            fontSize: string;
            margin: {
                top: number;
                right: number;
                bottom: number;
                left: number;
            };
            maxBarWidth: number;
            summaryGap: string;
            summaryPadding: string;
            summaryValueSize: string;
            summaryLabelSize: string;
        }
    > = {
        sm: {
            fontSize: '9px',
            margin: { top: 12, right: 12, bottom: 28, left: 34 },
            maxBarWidth: 32,
            summaryGap: 'gap-2 mb-2',
            summaryPadding: 'px-2 py-1',
            summaryValueSize: 'text-sm font-semibold',
            summaryLabelSize: 'text-[10px] text-muted-foreground',
        },
        md: {
            fontSize: '11px',
            margin: { top: 16, right: 16, bottom: 36, left: 42 },
            maxBarWidth: 48,
            summaryGap: 'gap-3 mb-3',
            summaryPadding: 'px-3 py-1.5',
            summaryValueSize: 'text-base font-bold',
            summaryLabelSize: 'text-xs text-muted-foreground',
        },
        lg: {
            fontSize: '12px',
            margin: { top: 20, right: 20, bottom: 44, left: 50 },
            maxBarWidth: 64,
            summaryGap: 'gap-4 mb-4',
            summaryPadding: 'px-4 py-2',
            summaryValueSize: 'text-lg font-bold',
            summaryLabelSize: 'text-xs text-muted-foreground',
        },
    };

    const config = densityConfig[iconSize];

    const formatDays = (days: number | undefined) => {
        if (days === undefined || days === null) return '-';
        return `${days.toFixed(1)} ${t('Days')}`;
    };

    return (
        <div
            className={cn('flex w-full flex-col', className)}
            data-slot="lead-time-histogram"
        >
            {/* Summary Metrics Chips */}
            {showSummaryCards &&
                (averageDays !== undefined ||
                    medianDays !== undefined ||
                    p85Days !== undefined) && (
                    <div
                        className={cn(
                            'grid w-full grid-cols-3',
                            config.summaryGap,
                        )}
                    >
                        {averageDays !== undefined && (
                            <div
                                className={cn(
                                    'border-border/70 bg-card text-card-foreground flex flex-col rounded-lg border',
                                    config.summaryPadding,
                                )}
                            >
                                <span className={config.summaryLabelSize}>
                                    {metricLabel
                                        ? `${metricLabel} (Avg)`
                                        : t('Average Lead Time')}
                                </span>
                                <span
                                    className={cn(
                                        'text-foreground mt-0.5 tabular-nums',
                                        config.summaryValueSize,
                                    )}
                                >
                                    {formatDays(averageDays)}
                                </span>
                            </div>
                        )}

                        {medianDays !== undefined && (
                            <div
                                className={cn(
                                    'border-border/70 bg-card text-card-foreground flex flex-col rounded-lg border',
                                    config.summaryPadding,
                                )}
                            >
                                <span className={config.summaryLabelSize}>
                                    {t('Median')} (p50)
                                </span>
                                <span
                                    className={cn(
                                        'text-foreground mt-0.5 tabular-nums',
                                        config.summaryValueSize,
                                    )}
                                >
                                    {formatDays(medianDays)}
                                </span>
                            </div>
                        )}

                        {p85Days !== undefined && (
                            <div
                                className={cn(
                                    'border-border/70 bg-card text-card-foreground flex flex-col rounded-lg border',
                                    config.summaryPadding,
                                )}
                            >
                                <span className={config.summaryLabelSize}>
                                    {t('85th Percentile')} (p85)
                                </span>
                                <span
                                    className={cn(
                                        'text-foreground mt-0.5 tabular-nums',
                                        config.summaryValueSize,
                                    )}
                                >
                                    {formatDays(p85Days)}
                                </span>
                            </div>
                        )}
                    </div>
                )}

            {/* Histogram Bars */}
            <ResponsiveContainer
                height={height}
                densityHeight={densityHeight}
                className="overflow-visible"
            >
                {({ width, height: containerHeight }) => {
                    const plotWidth = Math.max(
                        0,
                        width - config.margin.left - config.margin.right,
                    );
                    const plotHeight = Math.max(
                        0,
                        containerHeight -
                            config.margin.top -
                            config.margin.bottom,
                    );

                    const maxCountRaw = Math.max(
                        ...data.map((d) => Number(d.count) || 0),
                        0,
                    );

                    const getNiceCeiling = (val: number) => {
                        if (val <= 0) return 5;
                        if (val <= 5) return 5;
                        if (val <= 10) return 10;
                        if (val <= 20) return 20;
                        if (val <= 50) return 50;
                        if (val <= 100) return 100;
                        const factor = Math.pow(
                            10,
                            Math.floor(Math.log10(val)),
                        );
                        return Math.ceil(val / factor) * factor;
                    };

                    const maxCount = getNiceCeiling(maxCountRaw);
                    const tickCount = 4;
                    const yTicks = Array.from(
                        { length: tickCount + 1 },
                        (_, i) => Math.round((maxCount / tickCount) * i),
                    );

                    const slotWidth =
                        data.length > 0 ? plotWidth / data.length : 0;
                    const barWidth = Math.max(
                        8,
                        Math.min(slotWidth * 0.7, config.maxBarWidth),
                    );

                    const activeItem =
                        hoveredIndex !== null && data[hoveredIndex]
                            ? data[hoveredIndex]
                            : null;

                    const tooltipItems: ChartTooltipItem[] = activeItem
                        ? [
                              {
                                  label: t('Total Tasks'),
                                  value: `${activeItem.count} (${totalCount > 0 ? ((activeItem.count / totalCount) * 100).toFixed(1) : 0}%)`,
                                  color: barColor,
                              },
                          ]
                        : [];

                    return (
                        <div
                            className="relative h-full w-full"
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            <svg
                                width={width}
                                height={containerHeight}
                                className="overflow-visible select-none"
                                aria-label="Lead time histogram"
                            >
                                {/* Grid Lines */}
                                {showGrid &&
                                    yTicks.map((tickVal, i) => {
                                        const yPos =
                                            config.margin.top +
                                            plotHeight -
                                            (tickVal / maxCount) * plotHeight;
                                        return (
                                            <g key={`hist-grid-${i}`}>
                                                <line
                                                    x1={config.margin.left}
                                                    y1={yPos}
                                                    x2={
                                                        config.margin.left +
                                                        plotWidth
                                                    }
                                                    y2={yPos}
                                                    stroke="currentColor"
                                                    strokeDasharray={
                                                        i === 0
                                                            ? undefined
                                                            : '3 3'
                                                    }
                                                    className={cn(
                                                        i === 0
                                                            ? 'text-border stroke-[1.5]'
                                                            : 'text-border/40 stroke-1',
                                                    )}
                                                />
                                                <text
                                                    x={config.margin.left - 8}
                                                    y={yPos + 3.5}
                                                    textAnchor="end"
                                                    fill="currentColor"
                                                    className="text-muted-foreground font-mono"
                                                    style={{
                                                        fontSize:
                                                            config.fontSize,
                                                    }}
                                                >
                                                    {tickVal}
                                                </text>
                                            </g>
                                        );
                                    })}

                                {/* Histogram Bars */}
                                {data.map((item, idx) => {
                                    const val = Number(item.count) || 0;
                                    const barHeight =
                                        maxCount > 0
                                            ? (val / maxCount) * plotHeight
                                            : 0;
                                    const xPos =
                                        config.margin.left +
                                        idx * slotWidth +
                                        (slotWidth - barWidth) / 2;
                                    const yPos =
                                        config.margin.top +
                                        (plotHeight - barHeight);
                                    const isHovered = hoveredIndex === idx;

                                    return (
                                        <g
                                            key={`hbucket-${idx}`}
                                            className="cursor-pointer transition-all duration-150"
                                            onMouseEnter={() => {
                                                setHoveredIndex(idx);
                                                setMousePos({
                                                    x: xPos + barWidth / 2,
                                                    y: Math.max(10, yPos),
                                                });
                                            }}
                                            onMouseMove={() => {
                                                setMousePos({
                                                    x: xPos + barWidth / 2,
                                                    y: Math.max(10, yPos),
                                                });
                                            }}
                                        >
                                            {/* Column hover background */}
                                            {isHovered && (
                                                <rect
                                                    x={
                                                        config.margin.left +
                                                        idx * slotWidth
                                                    }
                                                    y={config.margin.top}
                                                    width={slotWidth}
                                                    height={plotHeight}
                                                    className="fill-muted/20"
                                                    rx={2}
                                                />
                                            )}

                                            {/* Bar */}
                                            <rect
                                                x={xPos}
                                                y={yPos}
                                                width={barWidth}
                                                height={Math.max(2, barHeight)}
                                                rx={4}
                                                fill={barColor}
                                                className={cn(
                                                    'transition-all duration-150',
                                                    isHovered
                                                        ? 'brightness-110 drop-shadow-xs'
                                                        : 'opacity-90',
                                                )}
                                            />

                                            {/* Value on top of bar if space permits */}
                                            {barHeight > 24 && (
                                                <text
                                                    x={xPos + barWidth / 2}
                                                    y={yPos + 14}
                                                    textAnchor="middle"
                                                    fill="var(--color-card, #fff)"
                                                    className="font-mono text-[10px] font-bold"
                                                >
                                                    {val}
                                                </text>
                                            )}

                                            {/* Bucket Label */}
                                            <text
                                                x={xPos + barWidth / 2}
                                                y={
                                                    config.margin.top +
                                                    plotHeight +
                                                    16
                                                }
                                                textAnchor="middle"
                                                fill="currentColor"
                                                className={cn(
                                                    'font-medium transition-colors',
                                                    isHovered
                                                        ? 'text-foreground font-semibold'
                                                        : 'text-muted-foreground',
                                                )}
                                                style={{
                                                    fontSize: config.fontSize,
                                                }}
                                            >
                                                {item.bucket}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>

                            {/* Tooltip */}
                            {showTooltip && (
                                <ChartTooltip
                                    active={hoveredIndex !== null}
                                    x={mousePos.x}
                                    y={mousePos.y}
                                    title={
                                        activeItem
                                            ? `${t('Duration')}: ${activeItem.bucket}`
                                            : undefined
                                    }
                                    items={tooltipItems}
                                    containerWidth={width}
                                    containerHeight={containerHeight}
                                />
                            )}
                        </div>
                    );
                }}
            </ResponsiveContainer>
        </div>
    );
}

export default LeadTimeHistogram;
