import React, { useState } from 'react';
import { useIconSize, type IconSize } from '@/hooks/use-appearance';
import { ResponsiveContainer } from './ResponsiveContainer';
import { ChartTooltip, type ChartTooltipItem } from './ChartTooltip';
import { ChartLegend, type ChartLegendItem } from './ChartLegend';
import { ChartEmptyState } from './ChartEmptyState';
import { cn } from '@/lib/utils';

export interface StackedBarSeries {
    key: string;
    label: string;
    color: string;
}

export interface StackedBarChartProps {
    data: Record<string, any>[];
    xKey?: string;
    series: StackedBarSeries[];
    orientation?: 'vertical' | 'horizontal';
    height?: number | string;
    densityHeight?: Partial<Record<IconSize, number>>;
    valueFormatter?: (value: number) => string;
    emptyTitle?: string;
    emptyMessage?: string;
    className?: string;
    showGrid?: boolean;
    showTooltip?: boolean;
    showLegend?: boolean;
    onBarClick?: (item: Record<string, any>, index: number) => void;
}

export function StackedBarChart({
    data,
    xKey = 'name',
    series,
    orientation = 'vertical',
    height,
    densityHeight,
    valueFormatter = (val) => val.toLocaleString(),
    emptyTitle,
    emptyMessage,
    className,
    showGrid = true,
    showTooltip = true,
    showLegend = true,
    onBarClick,
}: StackedBarChartProps) {
    const { iconSize } = useIconSize();
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number }>({
        x: 0,
        y: 0,
    });

    if (!data || data.length === 0 || !series || series.length === 0) {
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
            maxBarThickness: number;
            fontSize: string;
            marginVertical: {
                top: number;
                right: number;
                bottom: number;
                left: number;
            };
            marginHorizontal: {
                top: number;
                right: number;
                bottom: number;
                left: number;
            };
        }
    > = {
        sm: {
            maxBarThickness: 20,
            fontSize: '9px',
            marginVertical: { top: 12, right: 12, bottom: 28, left: 36 },
            marginHorizontal: { top: 12, right: 20, bottom: 24, left: 60 },
        },
        md: {
            maxBarThickness: 30,
            fontSize: '11px',
            marginVertical: { top: 16, right: 16, bottom: 36, left: 44 },
            marginHorizontal: { top: 16, right: 28, bottom: 28, left: 80 },
        },
        lg: {
            maxBarThickness: 40,
            fontSize: '12px',
            marginVertical: { top: 20, right: 20, bottom: 44, left: 52 },
            marginHorizontal: { top: 20, right: 36, bottom: 34, left: 100 },
        },
    };

    const config = densityConfig[iconSize];

    return (
        <div
            className={cn('flex w-full flex-col', className)}
            data-slot="stacked-bar-chart"
        >
            <ResponsiveContainer
                height={height}
                densityHeight={densityHeight}
                className="overflow-visible"
            >
                {({ width, height: containerHeight }) => {
                    const isHorizontal = orientation === 'horizontal';
                    const margin = isHorizontal
                        ? config.marginHorizontal
                        : config.marginVertical;

                    const plotWidth = Math.max(
                        0,
                        width - margin.left - margin.right,
                    );
                    const plotHeight = Math.max(
                        0,
                        containerHeight - margin.top - margin.bottom,
                    );

                    // Compute totals for each data point
                    const totals = data.map((item) =>
                        series.reduce(
                            (sum, s) => sum + (Number(item[s.key]) || 0),
                            0,
                        ),
                    );
                    const maxTotalRaw = Math.max(...totals, 0);

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

                    const maxTotal = getNiceCeiling(maxTotalRaw);
                    const tickCount = 4;
                    const ticks = Array.from(
                        { length: tickCount + 1 },
                        (_, i) => Math.round((maxTotal / tickCount) * i),
                    );

                    const activeItem =
                        hoveredIndex !== null && data[hoveredIndex]
                            ? data[hoveredIndex]
                            : null;

                    const tooltipItems: ChartTooltipItem[] = activeItem
                        ? [
                              ...series.map((s) => ({
                                  label: s.label,
                                  value: valueFormatter(
                                      Number(activeItem[s.key]) || 0,
                                  ),
                                  color: s.color,
                              })),
                              {
                                  label: 'Total',
                                  value: valueFormatter(
                                      series.reduce(
                                          (sum, s) =>
                                              sum +
                                              (Number(activeItem[s.key]) || 0),
                                          0,
                                      ),
                                  ),
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
                                aria-label="Stacked bar chart visualization"
                            >
                                {isHorizontal ? (
                                    /* HORIZONTAL ORIENTATION */
                                    <>
                                        {/* X-axis Grid Lines & Ticks */}
                                        {showGrid &&
                                            ticks.map((tickVal, i) => {
                                                const xPos =
                                                    margin.left +
                                                    (tickVal / maxTotal) *
                                                        plotWidth;
                                                return (
                                                    <g key={`xtick-${i}`}>
                                                        <line
                                                            x1={xPos}
                                                            y1={margin.top}
                                                            x2={xPos}
                                                            y2={
                                                                margin.top +
                                                                plotHeight
                                                            }
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
                                                            x={xPos}
                                                            y={
                                                                margin.top +
                                                                plotHeight +
                                                                14
                                                            }
                                                            textAnchor="middle"
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

                                        {/* Horizontal Bars */}
                                        {data.map((item, idx) => {
                                            const slotHeight =
                                                plotHeight / data.length;
                                            const barThickness = Math.min(
                                                slotHeight * 0.7,
                                                config.maxBarThickness,
                                            );
                                            const yPos =
                                                margin.top +
                                                idx * slotHeight +
                                                (slotHeight - barThickness) / 2;
                                            const isHovered =
                                                hoveredIndex === idx;

                                            let currentX = margin.left;

                                            return (
                                                <g
                                                    key={`hbar-${idx}`}
                                                    className="cursor-pointer transition-all duration-150"
                                                    onClick={() =>
                                                        onBarClick?.(item, idx)
                                                    }
                                                    onMouseEnter={() => {
                                                        setHoveredIndex(idx);
                                                        setMousePos({
                                                            x:
                                                                margin.left +
                                                                plotWidth * 0.5,
                                                            y: yPos,
                                                        });
                                                    }}
                                                    onMouseMove={() => {
                                                        setMousePos({
                                                            x:
                                                                margin.left +
                                                                plotWidth * 0.5,
                                                            y: yPos,
                                                        });
                                                    }}
                                                >
                                                    {/* Y-axis Label */}
                                                    <text
                                                        x={margin.left - 8}
                                                        y={
                                                            yPos +
                                                            barThickness / 2 +
                                                            3.5
                                                        }
                                                        textAnchor="end"
                                                        fill="currentColor"
                                                        className={cn(
                                                            'truncate font-medium transition-colors',
                                                            isHovered
                                                                ? 'text-foreground font-semibold'
                                                                : 'text-muted-foreground',
                                                        )}
                                                        style={{
                                                            fontSize:
                                                                config.fontSize,
                                                        }}
                                                    >
                                                        {String(
                                                            item[xKey] ?? '',
                                                        )}
                                                    </text>

                                                    {/* Stacked segments */}
                                                    {series.map((s, sIdx) => {
                                                        const val =
                                                            Number(
                                                                item[s.key],
                                                            ) || 0;
                                                        const segWidth =
                                                            maxTotal > 0
                                                                ? (val /
                                                                      maxTotal) *
                                                                  plotWidth
                                                                : 0;
                                                        const segX = currentX;
                                                        currentX += segWidth;

                                                        if (segWidth <= 0)
                                                            return null;

                                                        const isLast =
                                                            sIdx ===
                                                                series.length -
                                                                    1 ||
                                                            series
                                                                .slice(sIdx + 1)
                                                                .every(
                                                                    (nextS) =>
                                                                        (Number(
                                                                            item[
                                                                                nextS
                                                                                    .key
                                                                            ],
                                                                        ) ||
                                                                            0) <=
                                                                        0,
                                                                );
                                                        const isFirst =
                                                            sIdx === 0;

                                                        return (
                                                            <rect
                                                                key={`seg-${s.key}-${sIdx}`}
                                                                x={segX}
                                                                y={yPos}
                                                                width={segWidth}
                                                                height={
                                                                    barThickness
                                                                }
                                                                rx={
                                                                    isLast
                                                                        ? 3
                                                                        : 0
                                                                }
                                                                fill={s.color}
                                                                className={cn(
                                                                    'transition-opacity',
                                                                    isHovered
                                                                        ? 'opacity-100 brightness-105'
                                                                        : 'opacity-90',
                                                                )}
                                                            />
                                                        );
                                                    })}
                                                </g>
                                            );
                                        })}
                                    </>
                                ) : (
                                    /* VERTICAL ORIENTATION */
                                    <>
                                        {/* Y-axis Grid Lines & Ticks */}
                                        {showGrid &&
                                            ticks.map((tickVal, i) => {
                                                const yPos =
                                                    margin.top +
                                                    plotHeight -
                                                    (tickVal / maxTotal) *
                                                        plotHeight;
                                                return (
                                                    <g key={`ytick-${i}`}>
                                                        <line
                                                            x1={margin.left}
                                                            y1={yPos}
                                                            x2={
                                                                margin.left +
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
                                                            x={margin.left - 8}
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

                                        {/* Vertical Stacked Bars */}
                                        {data.map((item, idx) => {
                                            const slotWidth =
                                                plotWidth / data.length;
                                            const barThickness = Math.min(
                                                slotWidth * 0.65,
                                                config.maxBarThickness,
                                            );
                                            const xPos =
                                                margin.left +
                                                idx * slotWidth +
                                                (slotWidth - barThickness) / 2;
                                            const isHovered =
                                                hoveredIndex === idx;

                                            let currentY =
                                                margin.top + plotHeight;

                                            return (
                                                <g
                                                    key={`vbar-${idx}`}
                                                    className="cursor-pointer transition-all duration-150"
                                                    onClick={() =>
                                                        onBarClick?.(item, idx)
                                                    }
                                                    onMouseEnter={() => {
                                                        setHoveredIndex(idx);
                                                        setMousePos({
                                                            x:
                                                                xPos +
                                                                barThickness /
                                                                    2,
                                                            y: margin.top + 10,
                                                        });
                                                    }}
                                                    onMouseMove={() => {
                                                        setMousePos({
                                                            x:
                                                                xPos +
                                                                barThickness /
                                                                    2,
                                                            y: margin.top + 10,
                                                        });
                                                    }}
                                                >
                                                    {/* Hover column highlight */}
                                                    {isHovered && (
                                                        <rect
                                                            x={
                                                                margin.left +
                                                                idx * slotWidth
                                                            }
                                                            y={margin.top}
                                                            width={slotWidth}
                                                            height={plotHeight}
                                                            className="fill-muted/20"
                                                            rx={2}
                                                        />
                                                    )}

                                                    {/* Stacked segments (rendered bottom to top) */}
                                                    {series.map((s, sIdx) => {
                                                        const val =
                                                            Number(
                                                                item[s.key],
                                                            ) || 0;
                                                        const segHeight =
                                                            maxTotal > 0
                                                                ? (val /
                                                                      maxTotal) *
                                                                  plotHeight
                                                                : 0;
                                                        currentY -= segHeight;
                                                        const segY = currentY;

                                                        if (segHeight <= 0)
                                                            return null;

                                                        const isTop =
                                                            sIdx ===
                                                                series.length -
                                                                    1 ||
                                                            series
                                                                .slice(sIdx + 1)
                                                                .every(
                                                                    (nextS) =>
                                                                        (Number(
                                                                            item[
                                                                                nextS
                                                                                    .key
                                                                            ],
                                                                        ) ||
                                                                            0) <=
                                                                        0,
                                                                );

                                                        return (
                                                            <rect
                                                                key={`vseg-${s.key}-${sIdx}`}
                                                                x={xPos}
                                                                y={segY}
                                                                width={
                                                                    barThickness
                                                                }
                                                                height={
                                                                    segHeight
                                                                }
                                                                rx={
                                                                    isTop
                                                                        ? 3
                                                                        : 0
                                                                }
                                                                fill={s.color}
                                                                className={cn(
                                                                    'transition-opacity',
                                                                    isHovered
                                                                        ? 'opacity-100 brightness-105'
                                                                        : 'opacity-90',
                                                                )}
                                                            />
                                                        );
                                                    })}

                                                    {/* X-axis Label */}
                                                    <text
                                                        x={
                                                            xPos +
                                                            barThickness / 2
                                                        }
                                                        y={
                                                            margin.top +
                                                            plotHeight +
                                                            16
                                                        }
                                                        textAnchor="middle"
                                                        fill="currentColor"
                                                        className={cn(
                                                            'truncate font-medium transition-colors',
                                                            isHovered
                                                                ? 'text-foreground font-semibold'
                                                                : 'text-muted-foreground',
                                                        )}
                                                        style={{
                                                            fontSize:
                                                                config.fontSize,
                                                        }}
                                                    >
                                                        {String(
                                                            item[xKey] ?? '',
                                                        )}
                                                    </text>
                                                </g>
                                            );
                                        })}
                                    </>
                                )}
                            </svg>

                            {/* Tooltip */}
                            {showTooltip && (
                                <ChartTooltip
                                    active={hoveredIndex !== null}
                                    x={mousePos.x}
                                    y={mousePos.y}
                                    title={
                                        activeItem
                                            ? String(activeItem[xKey])
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

            {/* Legend */}
            {showLegend && (
                <ChartLegend
                    items={series.map((s) => ({
                        label: s.label,
                        color: s.color,
                    }))}
                />
            )}
        </div>
    );
}

export default StackedBarChart;
