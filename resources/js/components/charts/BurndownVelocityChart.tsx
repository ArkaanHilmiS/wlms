import React, { useState } from 'react';
import { useIconSize, type IconSize } from '@/hooks/use-appearance';
import { useTranslate } from '@/hooks/useTranslate';
import { ResponsiveContainer } from './ResponsiveContainer';
import { ChartTooltip, type ChartTooltipItem } from './ChartTooltip';
import { ChartLegend } from './ChartLegend';
import { ChartEmptyState } from './ChartEmptyState';
import { cn } from '@/lib/utils';

export interface BurndownPoint {
    day: string;
    ideal_points: number;
    actual_points: number;
}

export interface VelocityPoint {
    sprint_name: string;
    completed_points: number;
    target_points?: number;
}

export interface BurndownVelocityChartProps {
    burndownData?: BurndownPoint[];
    velocityData?: VelocityPoint[];
    defaultMode?: 'burndown' | 'velocity';
    height?: number | string;
    densityHeight?: Partial<Record<IconSize, number>>;
    valueFormatter?: (val: number) => string;
    emptyTitle?: string;
    emptyMessage?: string;
    className?: string;
    showLegend?: boolean;
    showToggle?: boolean;
    showTooltip?: boolean;
}

export function BurndownVelocityChart({
    burndownData = [],
    velocityData = [],
    defaultMode,
    height,
    densityHeight,
    valueFormatter = (val) => `${val.toLocaleString()} pts`,
    emptyTitle,
    emptyMessage,
    className,
    showLegend = true,
    showToggle = true,
    showTooltip = true,
}: BurndownVelocityChartProps) {
    const { t } = useTranslate();
    const { iconSize } = useIconSize();

    const hasBurndown = burndownData && burndownData.length > 0;
    const hasVelocity = velocityData && velocityData.length > 0;

    const initialMode: 'burndown' | 'velocity' =
        defaultMode ?? (hasBurndown ? 'burndown' : 'velocity');
    const [mode, setMode] = useState<'burndown' | 'velocity'>(initialMode);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number }>({
        x: 0,
        y: 0,
    });

    if (!hasBurndown && !hasVelocity) {
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
            buttonClass: string;
        }
    > = {
        sm: {
            fontSize: '9px',
            margin: { top: 12, right: 12, bottom: 28, left: 36 },
            dotRadius: 3,
            buttonClass: 'h-6 text-[10px] px-2',
        },
        md: {
            fontSize: '11px',
            margin: { top: 16, right: 16, bottom: 36, left: 44 },
            dotRadius: 4,
            buttonClass: 'h-7 text-xs px-2.5',
        },
        lg: {
            fontSize: '12px',
            margin: { top: 20, right: 20, bottom: 44, left: 52 },
            dotRadius: 5,
            buttonClass: 'h-8 text-sm px-3',
        },
    };

    const config = densityConfig[iconSize];

    return (
        <div
            className={cn('flex w-full flex-col gap-2', className)}
            data-slot="burndown-velocity-chart"
        >
            {/* View Mode Toggle */}
            {showToggle && hasBurndown && hasVelocity && (
                <div className="flex items-center justify-end">
                    <div className="bg-muted border-border/60 inline-flex rounded-lg border p-0.5">
                        <button
                            type="button"
                            onClick={() => {
                                setMode('burndown');
                                setHoveredIndex(null);
                            }}
                            className={cn(
                                'rounded-md font-medium transition-all',
                                config.buttonClass,
                                mode === 'burndown'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {t('Sprint Burndown')}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setMode('velocity');
                                setHoveredIndex(null);
                            }}
                            className={cn(
                                'rounded-md font-medium transition-all',
                                config.buttonClass,
                                mode === 'velocity'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {t('Sprint Velocity')}
                        </button>
                    </div>
                </div>
            )}

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

                    const getNiceCeiling = (val: number) => {
                        if (val <= 0) return 10;
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

                    if (mode === 'burndown') {
                        const N = burndownData.length;
                        const allValues = burndownData.flatMap((d) => [
                            d.ideal_points ?? 0,
                            d.actual_points ?? 0,
                        ]);
                        const maxValRaw = Math.max(...allValues, 0);
                        const maxVal = getNiceCeiling(maxValRaw);

                        const tickCount = 4;
                        const yTicks = Array.from(
                            { length: tickCount + 1 },
                            (_, i) => Math.round((maxVal / tickCount) * i),
                        );

                        const getX = (idx: number) => {
                            if (N <= 1)
                                return config.margin.left + plotWidth / 2;
                            return (
                                config.margin.left + (idx / (N - 1)) * plotWidth
                            );
                        };

                        const getY = (val: number) => {
                            if (maxVal <= 0)
                                return config.margin.top + plotHeight;
                            return (
                                config.margin.top +
                                plotHeight -
                                (val / maxVal) * plotHeight
                            );
                        };

                        // Ideal Line Path
                        const idealPoints = burndownData.map(
                            (d, i) => `${getX(i)},${getY(d.ideal_points)}`,
                        );
                        const idealPathD = `M ${idealPoints.join(' L ')}`;

                        // Actual Line Path & Area
                        const actualPoints = burndownData.map(
                            (d, i) => `${getX(i)},${getY(d.actual_points)}`,
                        );
                        const actualPathD = `M ${actualPoints.join(' L ')}`;
                        const actualAreaD = `${actualPathD} L ${getX(N - 1)},${config.margin.top + plotHeight} L ${getX(0)},${config.margin.top + plotHeight} Z`;

                        const activeItem =
                            hoveredIndex !== null && burndownData[hoveredIndex]
                                ? burndownData[hoveredIndex]
                                : null;

                        const tooltipItems: ChartTooltipItem[] = activeItem
                            ? [
                                  {
                                      label: t('Actual Remaining'),
                                      value: valueFormatter(
                                          activeItem.actual_points,
                                      ),
                                      color: 'var(--chart-1)',
                                  },
                                  {
                                      label: t('Ideal Burndown'),
                                      value: valueFormatter(
                                          activeItem.ideal_points,
                                      ),
                                      color: 'var(--chart-3)',
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
                                        y: getY(
                                            burndownData[index].actual_points,
                                        ),
                                    });
                                }}
                            >
                                <svg
                                    width={width}
                                    height={containerHeight}
                                    className="overflow-visible select-none"
                                    aria-label="Sprint burndown chart"
                                >
                                    <defs>
                                        <linearGradient
                                            id="burndown-actual-grad"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="0%"
                                                stopColor="var(--chart-1)"
                                                stopOpacity="0.25"
                                            />
                                            <stop
                                                offset="100%"
                                                stopColor="var(--chart-1)"
                                                stopOpacity="0.02"
                                            />
                                        </linearGradient>
                                    </defs>

                                    {/* Grid Lines */}
                                    {yTicks.map((tickVal, i) => {
                                        const yPos = getY(tickVal);
                                        return (
                                            <g key={`bd-grid-${i}`}>
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

                                    {/* Actual Area */}
                                    <path
                                        d={actualAreaD}
                                        fill="url(#burndown-actual-grad)"
                                        className="transition-opacity"
                                    />

                                    {/* Ideal Dashed Line */}
                                    <path
                                        d={idealPathD}
                                        fill="none"
                                        stroke="var(--chart-3)"
                                        strokeWidth={2}
                                        strokeDasharray="4 4"
                                        className="opacity-80"
                                    />

                                    {/* Actual Line */}
                                    <path
                                        d={actualPathD}
                                        fill="none"
                                        stroke="var(--chart-1)"
                                        strokeWidth={2.5}
                                        className="opacity-95"
                                    />

                                    {/* Circles on Actual Data Points */}
                                    {burndownData.map((d, i) => (
                                        <circle
                                            key={`pt-${i}`}
                                            cx={getX(i)}
                                            cy={getY(d.actual_points)}
                                            r={
                                                hoveredIndex === i
                                                    ? config.dotRadius + 1.5
                                                    : config.dotRadius
                                            }
                                            fill="var(--chart-1)"
                                            stroke="var(--color-card, #fff)"
                                            strokeWidth={2}
                                            className="transition-all duration-100"
                                        />
                                    ))}

                                    {/* X-axis Labels */}
                                    {burndownData.map((d, i) => {
                                        const skip =
                                            N > 14 ? Math.ceil(N / 7) : 1;
                                        if (i % skip !== 0 && i !== N - 1)
                                            return null;

                                        return (
                                            <text
                                                key={`xlabel-${i}`}
                                                x={getX(i)}
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
                                                {d.day}
                                            </text>
                                        );
                                    })}

                                    {/* Cursor line */}
                                    {hoveredIndex !== null && (
                                        <line
                                            x1={getX(hoveredIndex)}
                                            y1={config.margin.top}
                                            x2={getX(hoveredIndex)}
                                            y2={config.margin.top + plotHeight}
                                            stroke="currentColor"
                                            strokeWidth={1.5}
                                            strokeDasharray="3 3"
                                            className="text-foreground/60"
                                            pointerEvents="none"
                                        />
                                    )}
                                </svg>

                                {showTooltip && (
                                    <ChartTooltip
                                        active={hoveredIndex !== null}
                                        x={mousePos.x}
                                        y={mousePos.y}
                                        title={
                                            activeItem
                                                ? activeItem.day
                                                : undefined
                                        }
                                        items={tooltipItems}
                                        containerWidth={width}
                                        containerHeight={containerHeight}
                                    />
                                )}
                            </div>
                        );
                    } else {
                        /* VELOCITY MODE */
                        const values = velocityData.map(
                            (v) => v.completed_points,
                        );
                        const maxValRaw = Math.max(...values, 0);
                        const maxVal = getNiceCeiling(maxValRaw);

                        const avgVelocity =
                            values.length > 0
                                ? Math.round(
                                      values.reduce((a, b) => a + b, 0) /
                                          values.length,
                                  )
                                : 0;

                        const tickCount = 4;
                        const yTicks = Array.from(
                            { length: tickCount + 1 },
                            (_, i) => Math.round((maxVal / tickCount) * i),
                        );

                        const slotWidth =
                            velocityData.length > 0
                                ? plotWidth / velocityData.length
                                : 0;
                        const barWidth = Math.max(
                            8,
                            Math.min(slotWidth * 0.6, 48),
                        );

                        const activeItem =
                            hoveredIndex !== null && velocityData[hoveredIndex]
                                ? velocityData[hoveredIndex]
                                : null;

                        const tooltipItems: ChartTooltipItem[] = activeItem
                            ? [
                                  {
                                      label: t('Sprint Velocity'),
                                      value: valueFormatter(
                                          activeItem.completed_points,
                                      ),
                                      color: 'var(--chart-2)',
                                  },
                                  ...(activeItem.target_points
                                      ? [
                                            {
                                                label: t('Target Points'),
                                                value: valueFormatter(
                                                    activeItem.target_points,
                                                ),
                                                color: 'var(--chart-4)',
                                            },
                                        ]
                                      : []),
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
                                    aria-label="Sprint velocity chart"
                                >
                                    {/* Grid Lines */}
                                    {yTicks.map((tickVal, i) => {
                                        const yPos =
                                            config.margin.top +
                                            plotHeight -
                                            (tickVal / maxVal) * plotHeight;
                                        return (
                                            <g key={`vel-grid-${i}`}>
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

                                    {/* Average velocity dashed reference line */}
                                    {avgVelocity > 0 && maxVal > 0 && (
                                        <g>
                                            <line
                                                x1={config.margin.left}
                                                y1={
                                                    config.margin.top +
                                                    plotHeight -
                                                    (avgVelocity / maxVal) *
                                                        plotHeight
                                                }
                                                x2={
                                                    config.margin.left +
                                                    plotWidth
                                                }
                                                y2={
                                                    config.margin.top +
                                                    plotHeight -
                                                    (avgVelocity / maxVal) *
                                                        plotHeight
                                                }
                                                stroke="var(--chart-4)"
                                                strokeWidth={1.5}
                                                strokeDasharray="4 3"
                                            />
                                            <text
                                                x={
                                                    config.margin.left +
                                                    plotWidth
                                                }
                                                y={
                                                    config.margin.top +
                                                    plotHeight -
                                                    (avgVelocity / maxVal) *
                                                        plotHeight -
                                                    4
                                                }
                                                textAnchor="end"
                                                fill="var(--chart-4)"
                                                className="text-[10px] font-semibold"
                                            >
                                                Avg: {avgVelocity} pts
                                            </text>
                                        </g>
                                    )}

                                    {/* Velocity Bars */}
                                    {velocityData.map((item, idx) => {
                                        const barHeight =
                                            maxVal > 0
                                                ? (item.completed_points /
                                                      maxVal) *
                                                  plotHeight
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
                                                key={`vel-bar-${idx}`}
                                                className="cursor-pointer transition-all duration-150"
                                                onMouseEnter={() => {
                                                    setHoveredIndex(idx);
                                                    setMousePos({
                                                        x: xPos + barWidth / 2,
                                                        y: yPos,
                                                    });
                                                }}
                                                onMouseMove={() => {
                                                    setMousePos({
                                                        x: xPos + barWidth / 2,
                                                        y: yPos,
                                                    });
                                                }}
                                            >
                                                <rect
                                                    x={xPos}
                                                    y={yPos}
                                                    width={barWidth}
                                                    height={Math.max(
                                                        2,
                                                        barHeight,
                                                    )}
                                                    rx={4}
                                                    fill="var(--chart-2)"
                                                    className={cn(
                                                        'transition-all duration-150',
                                                        isHovered
                                                            ? 'brightness-110 drop-shadow-xs'
                                                            : 'opacity-90',
                                                    )}
                                                />
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
                                                        fontSize:
                                                            config.fontSize,
                                                    }}
                                                >
                                                    {item.sprint_name}
                                                </text>
                                            </g>
                                        );
                                    })}
                                </svg>

                                {showTooltip && (
                                    <ChartTooltip
                                        active={hoveredIndex !== null}
                                        x={mousePos.x}
                                        y={mousePos.y}
                                        title={
                                            activeItem
                                                ? activeItem.sprint_name
                                                : undefined
                                        }
                                        items={tooltipItems}
                                        containerWidth={width}
                                        containerHeight={containerHeight}
                                    />
                                )}
                            </div>
                        );
                    }
                }}
            </ResponsiveContainer>

            {/* Legend */}
            {showLegend && (
                <ChartLegend
                    items={
                        mode === 'burndown'
                            ? [
                                  {
                                      label: t('Actual Remaining'),
                                      color: 'var(--chart-1)',
                                  },
                                  {
                                      label: t('Ideal Burndown'),
                                      color: 'var(--chart-3)',
                                  },
                              ]
                            : [
                                  {
                                      label: t('Completed Points'),
                                      color: 'var(--chart-2)',
                                  },
                                  {
                                      label: t('Average Velocity'),
                                      color: 'var(--chart-4)',
                                  },
                              ]
                    }
                />
            )}
        </div>
    );
}

export default BurndownVelocityChart;
