import React, { useEffect, useRef, useState } from 'react';
import { useIconSize, type IconSize } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

export interface ResponsiveContainerDimensions {
    width: number;
    height: number;
    iconSize: IconSize;
}

export interface ResponsiveContainerProps {
    children:
        | React.ReactNode
        | ((dimensions: ResponsiveContainerDimensions) => React.ReactNode);
    height?: number | string;
    densityHeight?: Partial<Record<IconSize, number>>;
    minHeight?: number;
    aspectRatio?: number;
    className?: string;
    style?: React.CSSProperties;
}

const DEFAULT_DENSITY_HEIGHTS: Record<IconSize, number> = {
    sm: 180,
    md: 240,
    lg: 320,
};

export function ResponsiveContainer({
    children,
    height,
    densityHeight,
    minHeight,
    aspectRatio,
    className,
    style,
}: ResponsiveContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { iconSize } = useIconSize();
    const [width, setWidth] = useState<number>(0);

    const baseDensityHeight =
        densityHeight?.[iconSize] ?? DEFAULT_DENSITY_HEIGHTS[iconSize];

    let computedHeight: number | string = height ?? baseDensityHeight;
    if (
        minHeight &&
        typeof computedHeight === 'number' &&
        computedHeight < minHeight
    ) {
        computedHeight = minHeight;
    }

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const updateDimensions = () => {
            const rect = element.getBoundingClientRect();
            if (rect.width > 0) {
                setWidth(rect.width);
            }
        };

        updateDimensions();

        if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const inlineSize = entry.contentRect.width;
                    if (inlineSize > 0) {
                        setWidth(inlineSize);
                    }
                }
            });
            resizeObserver.observe(element);
            return () => {
                resizeObserver.disconnect();
            };
        } else {
            window.addEventListener('resize', updateDimensions);
            return () => {
                window.removeEventListener('resize', updateDimensions);
            };
        }
    }, []);

    const numericHeight =
        typeof computedHeight === 'number'
            ? computedHeight
            : aspectRatio && width > 0
              ? width / aspectRatio
              : baseDensityHeight;

    const dimensions: ResponsiveContainerDimensions = {
        width: width || 400,
        height: numericHeight,
        iconSize,
    };

    const containerStyle: React.CSSProperties = {
        height:
            typeof computedHeight === 'number'
                ? `${computedHeight}px`
                : computedHeight,
        aspectRatio: aspectRatio ? `${aspectRatio}` : undefined,
        minHeight: minHeight ? `${minHeight}px` : undefined,
        ...style,
    };

    return (
        <div
            ref={containerRef}
            className={cn(
                'relative w-full overflow-hidden select-none',
                className,
            )}
            style={containerStyle}
            data-slot="chart-responsive-container"
            data-icon-size={iconSize}
        >
            {typeof children === 'function' ? children(dimensions) : children}
        </div>
    );
}

export default ResponsiveContainer;
