import React, { useState } from 'react';
import { useIconSize, type IconSize } from '@/hooks/use-appearance';
import { ResponsiveContainer } from './ResponsiveContainer';
import { ChartTooltip, type ChartTooltipItem } from './ChartTooltip';
import { ChartLegend } from './ChartLegend';
import { ChartEmptyState } from './ChartEmptyState';
import { cn } from '@/lib/utils';

export interface BarChartDataItem {
    [key: string]: any;
}

export interface BarChartProps {
    data: BarChartDataItem[];
    xKey?: string;
    dataKey?: string;
    height?: number | string;
    densityHeight?: Partial<Record<IconSize, number>>;
    barColor?: string;
    valueFormatter?: (value: number) => string;
    yAxisLabel?: string;
    xAxisLabel?: string;
    emptyTitle?: string;
    emptyMessage?: string;
    className?: string;
    showGrid?: boolean;
    showTooltip?: boolean;
    showLegend?: boolean;
    legendLabel?: string;
    onBarClick?: (item: BarChartDataItem, index: number) => void;
}

export function BarChart({
    data,
    xKey = 'label',
    dataKey = 'value',
    height,
    densityHeight,
    barColor = 'var(--chart-1)',
    valueFormatter = (val) => val.toLocaleString(),
    yAxisLabel,
    xAxisLabel,
    emptyTitle,
    emptyMessage,
    className,
    showGrid = true,
    showTooltip = true,
    showLegend = false,
    legendLabel,
    onBarClick,
}: BarChartProps) {
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
            maxBarWidth: number;
            fontSize: string;
            margin: {
                top: number;
                right: number;
                bottom: number;
                left: number;
            };
            rx: number;
        }
    > = {
        sm: {
            maxBarWidth: 24,
            fontSize: '9px',
            margin: { top: 12, right: 12, bottom: 28, left: 34 },
            rx: 3,
        },
        md: {
            maxBarWidth: 36,
            fontSize: '11px',
            margin: { top: 16, right: 16, bottom: 36, left: 42 },
            rx: 4,
        },
        lg: {
            maxBarWidth: 48,
            fontSize: '12px',
            margin: { top: 20, right: 20, bottom: 44, left: 50 },
            rx: 6,
        },
    };

    const config = densityConfig[iconSize];

    return (
        <div
            className={cn('flex w-full flex-col', className)}
            data-slot="bar-chart"
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

                    const values = data.map((d) => Number(d[dataKey]) || 0);
                    const rawMax = Math.max(...values, 0);

                    // Determine clean Y-axis ceiling
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

                    const maxVal = getNiceCeiling(rawMax);
                    const tickCount = 4;
                    const yTicks = Array.from(
                        { length: tickCount + 1 },
                        (_, i) => Math.round((maxVal / tickCount) * i),
                    );

                    const slotWidth =
                        data.length > 0 ? plotWidth / data.length : 0;
                    const barWidth = Math.max(
                        4,
                        Math.min(slotWidth * 0.65, config.maxBarWidth),
                    );

                    const activeItem =
                        hoveredIndex !== null && data[hoveredIndex]
                            ? data[hoveredIndex]
                            : null;

                    const tooltipItems: ChartTooltipItem[] = activeItem
                        ? [
                              {
                                  label: legendLabel || String(dataKey),
                                  value: valueFormatter(
                                      Number(activeItem[dataKey]) || 0,
                                  ),
                                  color: activeItem.color || barColor,
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
                                aria-label="Bar chart visualization"
                            >
                                <defs>
                                    <linearGradient
                                        id="bar-hover-highlight"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="0%"
                                            stopColor="white"
                                            stopOpacity="0.25"
                                        />
                                        <stop
                                            offset="100%"
                                            stopColor="white"
                                            stopOpacity="0"
                                        />
                                    </linearGradient>
                                </defs>

                                {/* Y-axis Grid Lines and Ticks */}
                                {showGrid &&
                                    yTicks.map((tickVal, i) => {
                                        const yPos =
                                            config.margin.top +
                                            plotHeight -
                                            (tickVal / maxVal) * plotHeight;
                                        return (
                                            <g key={`ytick-${i}`}>
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

                                {/* Bars */}
                                {data.map((item, idx) => {
                                    const val = Number(item[dataKey]) || 0;
                                    const barHeight =
                                        maxVal > 0
                                            ? (val / maxVal) * plotHeight
                                            : 0;
                                    const xPos =
                                        config.margin.left +
                                        idx * slotWidth +
                                        (slotWidth - barWidth) / 2;
                                    const yPos =
                                        config.margin.top +
                                        (plotHeight - barHeight);
                                    const isHovered = hoveredIndex === idx;
                                    const currentBarColor =
                                        item.color || barColor;

                                    return (
                                        <g
                                            key={`bar-${idx}`}
                                            className="cursor-pointer transition-all duration-150"
                                            onClick={() =>
                                                onBarClick?.(item, idx)
                                            }
                                            onMouseEnter={(e) => {
                                                setHoveredIndex(idx);
                                                const rect =
                                                    e.currentTarget.getBoundingClientRect();
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
                                            {/* Hover indicator background column */}
                                            {isHovered && (
                                                <rect
                                                    x={
                                                        config.margin.left +
                                                        idx * slotWidth
                                                    }
                                                    y={config.margin.top}
                                                    width={slotWidth}
                                                    height={plotHeight}
                                                    className="fill-muted/30 transition-opacity"
                                                    rx={2}
                                                />
                                            )}

                                            {/* The Bar Rect */}
                                            <rect
                                                x={xPos}
                                                y={yPos}
                                                width={barWidth}
                                                height={Math.max(2, barHeight)}
                                                rx={config.rx}
                                                fill={currentBarColor}
                                                className={cn(
                                                    'transition-all duration-150',
                                                    isHovered
                                                        ? 'brightness-110 drop-shadow-xs filter'
                                                        : 'opacity-95',
                                                )}
                                            />

                                            {/* Subtle highlight gradient when hovered */}
                                            {isHovered && barHeight > 4 && (
                                                <rect
                                                    x={xPos}
                                                    y={yPos}
                                                    width={barWidth}
                                                    height={barHeight}
                                                    rx={config.rx}
                                                    fill="url(#bar-hover-highlight)"
                                                    pointerEvents="none"
                                                />
                                            )}

                                            {/* X-axis Label */}
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
                                                {String(item[xKey] ?? '')}
                                            </text>
                                        </g>
                                    );
                                })}

                                {/* Optional Y Axis Label */}
                                {yAxisLabel && (
                                    <text
                                        x={
                                            -(
                                                config.margin.top +
                                                plotHeight / 2
                                            )
                                        }
                                        y={12}
                                        transform="rotate(-90)"
                                        textAnchor="middle"
                                        fill="currentColor"
                                        className="text-muted-foreground text-[10px] font-medium"
                                    >
                                        {yAxisLabel}
                                    </text>
                                )}

                                {/* Optional X Axis Label */}
                                {xAxisLabel && (
                                    <text
                                        x={config.margin.left + plotWidth / 2}
                                        y={containerHeight - 2}
                                        textAnchor="middle"
                                        fill="currentColor"
                                        className="text-muted-foreground text-[10px] font-medium"
                                    >
                                        {xAxisLabel}
                                    </text>
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

            {/* Optional Legend */}
            {showLegend && (
                <ChartLegend
                    items={[
                        {
                            label: legendLabel || String(dataKey),
                            color: barColor,
                        },
                    ]}
                />
            )}
        </div>
    );
}

export default BarChart;
