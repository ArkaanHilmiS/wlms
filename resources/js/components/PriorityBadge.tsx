import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowRight, ArrowUp, LucideIcon } from 'lucide-react';

interface PriorityBadgeProps {
    name: string;
    category?: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function PriorityBadge({
    name,
    category,
    className,
    size = 'md',
}: PriorityBadgeProps) {
    let Icon: LucideIcon = ArrowRight;
    let colorClass =
        'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700';

    const normalizedCategory = category?.toUpperCase() || name.toUpperCase();

    if (
        normalizedCategory.includes('HIGH') ||
        normalizedCategory.includes('CRITICAL') ||
        normalizedCategory.includes('HIGHEST')
    ) {
        Icon = ArrowUp;
        colorClass =
            'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50';
    } else if (
        normalizedCategory.includes('LOW') ||
        normalizedCategory.includes('TRIVIAL') ||
        normalizedCategory.includes('LOWEST')
    ) {
        Icon = ArrowDown;
        colorClass =
            'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50';
    } else if (
        normalizedCategory.includes('MEDIUM') ||
        normalizedCategory.includes('NORMAL')
    ) {
        Icon = ArrowRight;
        colorClass =
            'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50';
    }

    const sizeClasses =
        size === 'sm'
            ? 'text-[10px] px-1.5 py-0 h-4.5 gap-0.5'
            : size === 'lg'
              ? 'text-xs px-2.5 py-0.5 h-6 gap-1.5'
              : 'text-xs px-2 py-0.5 h-5 gap-1';

    const iconSizes =
        size === 'sm'
            ? 'w-2.5 h-2.5'
            : size === 'lg'
              ? 'w-3.5 h-3.5'
              : 'w-3 h-3';

    return (
        <Badge
            variant="outline"
            className={cn(
                'inline-flex shrink-0 items-center border-0 font-medium',
                sizeClasses,
                colorClass,
                className,
            )}
        >
            <Icon className={iconSizes} />
            <span>{name}</span>
        </Badge>
    );
}
