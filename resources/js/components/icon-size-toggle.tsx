import { cn } from '@/lib/utils';
import { useAppearance, IconSize } from '@/hooks/use-appearance';
import { useTranslate } from '@/hooks/useTranslate';
import { Check, Minimize2, LayoutGrid, Maximize2 } from 'lucide-react';

interface IconSizeOption {
    value: IconSize;
    name: string;
    description: string;
    icon: typeof LayoutGrid;
    avatarSize: string;
    avatarText: string;
    badgeText?: string;
}

export default function IconSizeToggle({
    className = '',
}: {
    className?: string;
}) {
    const { t } = useTranslate();
    const { iconSize, updateIconSize } = useAppearance();

    const options: IconSizeOption[] = [
        {
            value: 'sm',
            name: t('Small / Compact'),
            description: t(
                'Compact 28px icons and tighter grid density. Shows maximum projects and rows on one screen.',
            ),
            icon: Minimize2,
            avatarSize: 'h-7 w-7 text-xs rounded-md',
            avatarText: '28px',
        },
        {
            value: 'md',
            name: t('Medium / Standard'),
            description: t(
                'Balanced 36px icons with standard spacing. Optimal for daily workflow comfort.',
            ),
            icon: LayoutGrid,
            avatarSize: 'h-9 w-9 text-sm rounded-lg',
            avatarText: '36px',
            badgeText: t('Default'),
        },
        {
            value: 'lg',
            name: t('Large / Spacious'),
            description: t(
                'Prominent 48px icons and generous card padding. Ideal for high-DPI displays or touchscreens.',
            ),
            icon: Maximize2,
            avatarSize: 'h-12 w-12 text-base rounded-xl',
            avatarText: '48px',
        },
    ];

    return (
        <div className={cn('grid gap-4 sm:grid-cols-3', className)}>
            {options.map((option) => {
                const isSelected = iconSize === option.value;
                const IconComponent = option.icon;

                return (
                    <div
                        key={option.value}
                        onClick={() => updateIconSize(option.value)}
                        className={cn(
                            'hover:border-primary/50 relative flex cursor-pointer flex-col justify-between rounded-xl border-2 p-4 transition-all duration-200',
                            isSelected
                                ? 'border-primary bg-primary/5 shadow-xs'
                                : 'border-border bg-card hover:bg-muted/30',
                        )}
                    >
                        {/* Selected Checkmark Badge */}
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <IconComponent
                                    className={cn(
                                        'h-4 w-4',
                                        isSelected
                                            ? 'text-primary'
                                            : 'text-muted-foreground',
                                    )}
                                />
                                <span className="text-foreground text-sm font-semibold">
                                    {option.name}
                                </span>
                            </div>
                            {isSelected && (
                                <span className="bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full">
                                    <Check className="h-3 w-3 stroke-[3]" />
                                </span>
                            )}
                            {option.badgeText && !isSelected && (
                                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
                                    {option.badgeText}
                                </span>
                            )}
                        </div>

                        {/* Interactive Visual Preview Box */}
                        <div className="bg-background/80 my-3 flex items-center gap-3 rounded-lg border p-3">
                            <div
                                className={cn(
                                    'bg-primary/10 text-primary border-primary/20 flex shrink-0 items-center justify-center border font-bold',
                                    option.avatarSize,
                                )}
                            >
                                P
                            </div>
                            <div className="flex-1 space-y-1.5 overflow-hidden">
                                <div
                                    className={cn(
                                        'bg-foreground/80 truncate rounded font-medium',
                                        option.value === 'sm'
                                            ? 'h-3 w-3/4'
                                            : option.value === 'lg'
                                              ? 'h-4 w-4/5'
                                              : 'h-3.5 w-3/4',
                                    )}
                                />
                                <div className="bg-muted-foreground/30 h-2 w-1/2 rounded" />
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-muted-foreground mt-1 text-xs">
                            {option.description}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
