import React, { useState } from 'react';
import { useIconSize, type IconSize } from '@/hooks/use-appearance';
import { ResponsiveContainer } from './ResponsiveContainer';
import { ChartTooltip, type ChartTooltipItem } from './ChartTooltip';
import { ChartLegend } from './ChartLegend';
import { ChartEmptyState } from './ChartEmptyState';
import { cn } from '@/lib/utils';

export interface CFDSeries {
    key: string;
    label: string;
    color: string;
}

export interface CumulativeFlowChartProps {
    data: Record<string, any>[];
    xKey?: string;
    series?: CFDSeries[];
    height?: number | string;
    densityHeight?: Partial<Record<IconSize, number>>;
    valueFormatter?: (val: number) => string;
    emptyTitle?: string;
    emptyMessage?: string;
    className?: string;
    showLegend?: boolean;
    showGrid?: boolean;
    showTooltip?: boolean;
}

const DEFAULT_CFD_SERIES: CFDSeries[] = [
    { key: 'done', label: 'Done', color: 'var(--chart-2)' },
    { key: 'in_progress', label: 'In Progress', color: 'var(--chart-1)' },
    { key: 'todo', label: 'To Do', color: 'var(--chart-3)' },
];

export function CumulativeFlowChart({
    data,
    xKey = 'date',
    series = DEFAULT_CFD_SERIES,
    height,
    densityHeight,
    valueFormatter = (val) => val.toLocaleString(),
    emptyTitle,
    emptyMessage,
    className,
    showLegend = true,
    showGrid = true,
    showTooltip = true,
}: CumulativeFlowChartProps) {
    const { iconSize } = useIconSize();
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number }>({
        x: 0,
        y: 0,
    });

    if (!data || data.length === 0) {
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
            dotRadius: number;
        }
    > = {
        sm: {
            fontSize: '9px',
            margin: { top: 12, right: 12, bottom: 28, left: 36 },
            dotRadius: 3,
        },
        md: {
            fontSize: '11px',
            margin: { top: 16, right: 16, bottom: 36, left: 44 },
            dotRadius: 4,
        },
        lg: {
            fontSize: '12px',
            margin: { top: 20, right: 20, bottom: 44, left: 52 },
            dotRadius: 5,
        },
    };

    const config = densityConfig[iconSize];

    return (
        <div
            className={cn('flex w-full flex-col', className)}
            data-slot="cumulative-flow-chart"
        >
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

                    const N = data.length;

                    // Calculate stacked cumulative values for each point
                    // stacks[pointIndex] = [0, y1, y2, y3]
                    const stacks = data.map((item) => {
                        const cumulative = [0];
                        let runningTotal = 0;
                        for (const s of series) {
                            runningTotal += Math.max(
                                0,
                                Number(item[s.key]) || 0,
                            );
                            cumulative.push(runningTotal);
                        }
                        return cumulative;
                    });

                    const maxTotalRaw = Math.max(
                        ...stacks.map((stack) => stack[stack.length - 1]),
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

                    const maxTotal = getNiceCeiling(maxTotalRaw);
                    const tickCount = 4;
                    const yTicks = Array.from(
                        { length: tickCount + 1 },
                        (_, i) => Math.round((maxTotal / tickCount) * i),
                    );

                    const getX = (idx: number) => {
                        if (N <= 1) return config.margin.left + plotWidth / 2;
                        return config.margin.left + (idx / (N - 1)) * plotWidth;
                    };

                    const getY = (val: number) => {
                        if (maxTotal <= 0)
                            return config.margin.top + plotHeight;
                        return (
                            config.margin.top +
                            plotHeight -
                            (val / maxTotal) * plotHeight
                        );
                    };

                    // Build area paths for each series band
                    const areaPaths = series.map((s, seriesIdx) => {
                        const topPoints: string[] = [];
                        const bottomPoints: string[] = [];

                        data.forEach((_, idx) => {
                            const x = getX(idx);
                            const topY = getY(stacks[idx][seriesIdx + 1]);
                            const botY = getY(stacks[idx][seriesIdx]);

                            topPoints.push(`${x},${topY}`);
                            bottomPoints.unshift(`${x},${botY}`);
                        });

                        const d = `M ${topPoints.join(' L ')} L ${bottomPoints.join(' L ')} Z`;
                        const topStrokeD = `M ${topPoints.join(' L ')}`;

                        return {
                            series: s,
                            path: d,
                            topStroke: topStrokeD,
                        };
                    });

                    const activeItem =
                        hoveredIndex !== null && data[hoveredIndex]
                            ? data[hoveredIndex]
                            : null;

                    // Tooltip displays reverse order (top series first)
                    const tooltipItems: ChartTooltipItem[] = activeItem
                        ? [
                              ...[...series].reverse().map((s) => ({
                                  label: s.label,
                                  value: valueFormatter(
                                      Number(activeItem[s.key]) || 0,
                                  ),
                                  color: s.color,
                              })),
                              {
                                  label: 'Total',
                                  value: valueFormatter(
                                      stacks[hoveredIndex!][series.length],
                                  ),
                              },
                          ]
                        : [];

                    return (
                        <div
                            className="relative h-full w-full"
                            onMouseLeave={() => setHoveredIndex(null)}
                            onMouseMove={(e) => {
                                const rect =
                                    e.currentTarget.getBoundingClientRect();
                                const mouseX = e.clientX - rect.left;
                                const clampedX = Math.max(
                                    config.margin.left,
                                    Math.min(
                                        config.margin.left + plotWidth,
                                        mouseX,
                                    ),
                                );
                                const relX = clampedX - config.margin.left;
                                const index =
                                    N <= 1
                                        ? 0
                                        : Math.min(
                                              N - 1,
                                              Math.max(
                                                  0,
                                                  Math.round(
                                                      (relX / plotWidth) *
                                                          (N - 1),
                                                  ),
                                              ),
                                          );
                                setHoveredIndex(index);
                                setMousePos({
                                    x: getX(index),
                                    y: getY(stacks[index][series.length] / 2),
                                });
                            }}
                        >
                            <svg
                                width={width}
                                height={containerHeight}
                                className="overflow-visible select-none"
                                aria-label="Cumulative flow diagram"
                            >
                                {/* Grid Lines */}
                                {showGrid &&
                                    yTicks.map((tickVal, i) => {
                                        const yPos = getY(tickVal);
                                        return (
                                            <g key={`cfd-grid-${i}`}>
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

                                {/* Stacked Areas */}
                                {areaPaths.map(
                                    ({ series: s, path, topStroke }, idx) => (
                                        <g key={`cfd-band-${s.key}-${idx}`}>
                                            <path
                                                d={path}
                                                fill={s.color}
                                                className="opacity-75 transition-opacity duration-150 hover:opacity-90"
                                            />
                                            <path
                                                d={topStroke}
                                                fill="none"
                                                stroke={s.color}
                                                strokeWidth={1.5}
                                                className="opacity-95"
                                            />
                                        </g>
                                    ),
                                )}

                                {/* X-axis Ticks / Labels */}
                                {data.map((item, idx) => {
                                    // Skip intermediate labels if too dense
                                    const skipFactor =
                                        N > 12
                                            ? Math.ceil(N / 6)
                                            : N > 6
                                              ? 2
                                              : 1;
                                    if (idx % skipFactor !== 0 && idx !== N - 1)
                                        return null;

                                    const xPos = getX(idx);
                                    const rawDate = String(item[xKey] ?? '');
                                    // Shorten date label (e.g. '2026-10-01' -> '10/01' or 'Oct 01')
                                    const displayDate =
                                        rawDate.length >= 10
                                            ? rawDate.slice(5)
                                            : rawDate;

                                    return (
                                        <g key={`cfd-xlabel-${idx}`}>
                                            <line
                                                x1={xPos}
                                                y1={
                                                    config.margin.top +
                                                    plotHeight
                                                }
                                                x2={xPos}
                                                y2={
                                                    config.margin.top +
                                                    plotHeight +
                                                    4
                                                }
                                                stroke="currentColor"
                                                className="text-border"
                                            />
                                            <text
                                                x={xPos}
                                                y={
                                                    config.margin.top +
                                                    plotHeight +
                                                    16
                                                }
                                                textAnchor="middle"
                                                fill="currentColor"
                                                className="text-muted-foreground font-medium"
                                                style={{
                                                    fontSize: config.fontSize,
                                                }}
                                            >
                                                {displayDate}
                                            </text>
                                        </g>
                                    );
                                })}

                                {/* Hover crosshair and data points */}
                                {hoveredIndex !== null && (
                                    <g pointerEvents="none">
                                        <line
                                            x1={getX(hoveredIndex)}
                                            y1={config.margin.top}
                                            x2={getX(hoveredIndex)}
                                            y2={config.margin.top + plotHeight}
                                            stroke="currentColor"
                                            strokeWidth={1.5}
                                            strokeDasharray="3 3"
                                            className="text-foreground/70"
                                        />
                                        {series.map((s, sIdx) => {
                                            const pointY = getY(
                                                stacks[hoveredIndex][sIdx + 1],
                                            );
                                            return (
                                                <circle
                                                    key={`hover-dot-${s.key}`}
                                                    cx={getX(hoveredIndex)}
                                                    cy={pointY}
                                                    r={config.dotRadius}
                                                    fill={s.color}
                                                    stroke="var(--color-card, #fff)"
                                                    strokeWidth={2}
                                                    className="shadow-sm"
                                                />
                                            );
                                        })}
                                    </g>
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
                    items={[...series].reverse().map((s) => ({
                        label: s.label,
                        color: s.color,
                    }))}
                />
            )}
        </div>
    );
}

export default CumulativeFlowChart;
