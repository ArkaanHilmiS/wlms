import React, { useState } from 'react';
import { useIconSize, type IconSize } from '@/hooks/use-appearance';
import { ResponsiveContainer } from './ResponsiveContainer';
import { ChartTooltip, type ChartTooltipItem } from './ChartTooltip';
import { ChartLegend, type ChartLegendItem } from './ChartLegend';
import { ChartEmptyState } from './ChartEmptyState';
import { cn } from '@/lib/utils';

export interface DonutSliceItem {
    label: string;
    value: number;
    color?: string;
    [key: string]: any;
}

export interface DonutDistributionChartProps {
    data: DonutSliceItem[];
    centerLabel?: string;
    centerValue?: string | number;
    innerRadiusRatio?: number;
    height?: number | string;
    densityHeight?: Partial<Record<IconSize, number>>;
    valueFormatter?: (val: number) => string;
    emptyTitle?: string;
    emptyMessage?: string;
    className?: string;
    showLegend?: boolean;
    showTooltip?: boolean;
    onSliceClick?: (item: DonutSliceItem, index: number) => void;
}

const DEFAULT_CHART_COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
];

export function DonutDistributionChart({
    data,
    centerLabel = 'Total',
    centerValue,
    innerRadiusRatio = 0.65,
    height,
    densityHeight,
    valueFormatter = (val) => val.toLocaleString(),
    emptyTitle,
    emptyMessage,
    className,
    showLegend = true,
    showTooltip = true,
    onSliceClick,
}: DonutDistributionChartProps) {
    const { iconSize } = useIconSize();
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number }>({
        x: 0,
        y: 0,
    });

    const totalValue = data
        ? data.reduce((sum, d) => sum + (Number(d.value) || 0), 0)
        : 0;

    if (!data || data.length === 0 || totalValue === 0) {
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
            centerValueClass: string;
            centerLabelClass: string;
        }
    > = {
        sm: {
            centerValueClass: 'text-lg font-bold',
            centerLabelClass: 'text-[10px] text-muted-foreground',
        },
        md: {
            centerValueClass: 'text-2xl font-bold',
            centerLabelClass: 'text-xs text-muted-foreground',
        },
        lg: {
            centerValueClass: 'text-3xl font-extrabold',
            centerLabelClass: 'text-sm text-muted-foreground',
        },
    };

    const config = densityConfig[iconSize];

    return (
        <div
            className={cn('flex w-full flex-col items-center', className)}
            data-slot="donut-distribution-chart"
        >
            <ResponsiveContainer
                height={height}
                densityHeight={densityHeight}
                className="overflow-visible"
            >
                {({ width, height: containerHeight }) => {
                    const cx = width / 2;
                    const cy = containerHeight / 2;
                    const maxRadius = Math.min(cx, cy) - 10;
                    const outerRadius = Math.max(10, maxRadius);
                    const innerRadius = outerRadius * innerRadiusRatio;

                    // Compute arc paths
                    const itemsWithAngles = (() => {
                        let currentAngle = -Math.PI / 2; // start from top (12 o'clock)
                        const gapAngle = data.length > 1 ? 0.025 : 0;

                        return data.map((item, idx) => {
                            const val = Math.max(0, Number(item.value) || 0);
                            const sliceRatio =
                                totalValue > 0 ? val / totalValue : 0;
                            const sweepAngle = Math.max(
                                0,
                                sliceRatio * 2 * Math.PI - gapAngle,
                            );

                            const startAngle = currentAngle + gapAngle / 2;
                            const endAngle = startAngle + sweepAngle;
                            currentAngle += sliceRatio * 2 * Math.PI;

                            const color =
                                item.color ||
                                DEFAULT_CHART_COLORS[
                                    idx % DEFAULT_CHART_COLORS.length
                                ];

                            // Generate SVG path
                            let path = '';
                            if (sweepAngle >= 2 * Math.PI - 0.001) {
                                // Complete circle donut
                                path = `
                                    M ${cx} ${cy - outerRadius}
                                    A ${outerRadius} ${outerRadius} 0 1 1 ${cx} ${cy + outerRadius}
                                    A ${outerRadius} ${outerRadius} 0 1 1 ${cx} ${cy - outerRadius}
                                    M ${cx} ${cy - innerRadius}
                                    A ${innerRadius} ${innerRadius} 0 1 0 ${cx} ${cy + innerRadius}
                                    A ${innerRadius} ${innerRadius} 0 1 0 ${cx} ${cy - innerRadius}
                                    Z
                                `;
                            } else if (val > 0) {
                                const x1 =
                                    cx + outerRadius * Math.cos(startAngle);
                                const y1 =
                                    cy + outerRadius * Math.sin(startAngle);
                                const x2 =
                                    cx + outerRadius * Math.cos(endAngle);
                                const y2 =
                                    cy + outerRadius * Math.sin(endAngle);

                                const x3 =
                                    cx + innerRadius * Math.cos(endAngle);
                                const y3 =
                                    cy + innerRadius * Math.sin(endAngle);
                                const x4 =
                                    cx + innerRadius * Math.cos(startAngle);
                                const y4 =
                                    cy + innerRadius * Math.sin(startAngle);

                                const largeArcFlag =
                                    sweepAngle > Math.PI ? 1 : 0;

                                path = `
                                    M ${x1} ${y1}
                                    A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}
                                    L ${x3} ${y3}
                                    A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}
                                    Z
                                `;
                            }

                            return {
                                item,
                                val,
                                percent: sliceRatio * 100,
                                color,
                                path,
                                midAngle: startAngle + sweepAngle / 2,
                            };
                        });
                    })();

                    const activeSlice =
                        hoveredIndex !== null && itemsWithAngles[hoveredIndex]
                            ? itemsWithAngles[hoveredIndex]
                            : null;

                    const tooltipItems: ChartTooltipItem[] = activeSlice
                        ? [
                              {
                                  label: activeSlice.item.label,
                                  value: `${valueFormatter(activeSlice.val)} (${activeSlice.percent.toFixed(1)}%)`,
                                  color: activeSlice.color,
                              },
                          ]
                        : [];

                    const activeCenterValue = activeSlice
                        ? valueFormatter(activeSlice.val)
                        : centerValue !== undefined
                          ? centerValue
                          : valueFormatter(totalValue);

                    const activeCenterLabel = activeSlice
                        ? activeSlice.item.label
                        : centerLabel;

                    return (
                        <div
                            className="relative h-full w-full"
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            <svg
                                width={width}
                                height={containerHeight}
                                className="overflow-visible select-none"
                                aria-label="Donut distribution chart"
                            >
                                {itemsWithAngles.map((slice, idx) => {
                                    if (!slice.path) return null;
                                    const isHovered = hoveredIndex === idx;

                                    return (
                                        <g
                                            key={`slice-${idx}`}
                                            className="cursor-pointer transition-all duration-150"
                                            onClick={() =>
                                                onSliceClick?.(slice.item, idx)
                                            }
                                            onMouseEnter={(e) => {
                                                setHoveredIndex(idx);
                                                const midRadius =
                                                    (outerRadius +
                                                        innerRadius) /
                                                    2;
                                                const px =
                                                    cx +
                                                    midRadius *
                                                        Math.cos(
                                                            slice.midAngle,
                                                        );
                                                const py =
                                                    cy +
                                                    midRadius *
                                                        Math.sin(
                                                            slice.midAngle,
                                                        );
                                                setMousePos({ x: px, y: py });
                                            }}
                                            onMouseMove={(e) => {
                                                const midRadius =
                                                    (outerRadius +
                                                        innerRadius) /
                                                    2;
                                                const px =
                                                    cx +
                                                    midRadius *
                                                        Math.cos(
                                                            slice.midAngle,
                                                        );
                                                const py =
                                                    cy +
                                                    midRadius *
                                                        Math.sin(
                                                            slice.midAngle,
                                                        );
                                                setMousePos({ x: px, y: py });
                                            }}
                                        >
                                            <path
                                                d={slice.path}
                                                fill={slice.color}
                                                className={cn(
                                                    'transition-all duration-150',
                                                    isHovered
                                                        ? 'origin-center scale-[1.02] opacity-100 brightness-110 drop-shadow-sm'
                                                        : 'opacity-90',
                                                )}
                                                style={{
                                                    transformOrigin: `${cx}px ${cy}px`,
                                                }}
                                            />
                                        </g>
                                    );
                                })}

                                {/* Center Text (Total / Hovered Info) */}
                                <g pointerEvents="none">
                                    <text
                                        x={cx}
                                        y={cy - 2}
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        fill="currentColor"
                                        className={cn(
                                            'text-foreground tracking-tight tabular-nums transition-all',
                                            config.centerValueClass,
                                        )}
                                    >
                                        {activeCenterValue}
                                    </text>
                                    <text
                                        x={cx}
                                        y={cy + 18}
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        fill="currentColor"
                                        className={cn(
                                            'max-w-[120px] truncate transition-all',
                                            config.centerLabelClass,
                                        )}
                                    >
                                        {activeCenterLabel}
                                    </text>
                                </g>
                            </svg>

                            {/* Tooltip */}
                            {showTooltip && (
                                <ChartTooltip
                                    active={hoveredIndex !== null}
                                    x={mousePos.x}
                                    y={mousePos.y}
                                    title={
                                        activeSlice
                                            ? activeSlice.item.label
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
                    items={data.map((d, i) => {
                        const val = Number(d.value) || 0;
                        const pct =
                            totalValue > 0
                                ? ((val / totalValue) * 100).toFixed(0)
                                : '0';
                        return {
                            label: d.label,
                            color:
                                d.color ||
                                DEFAULT_CHART_COLORS[
                                    i % DEFAULT_CHART_COLORS.length
                                ],
                            value: `${valueFormatter(val)} (${pct}%)`,
                        };
                    })}
                />
            )}
        </div>
    );
}

export default DonutDistributionChart;
