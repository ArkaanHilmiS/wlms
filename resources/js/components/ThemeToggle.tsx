import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { useTranslate } from '@/hooks/useTranslate';

export function ThemeToggle() {
    const { t } = useTranslate();
    const { appearance, resolvedAppearance, updateAppearance } =
        useAppearance();

    const options: { value: Appearance; label: string; icon: typeof Sun }[] =
        [
            { value: 'light', label: t('Light'), icon: Sun },
            { value: 'dark', label: t('Dark'), icon: Moon },
            { value: 'system', label: t('System'), icon: Monitor },
        ];

    const CurrentIcon = resolvedAppearance === 'dark' ? Moon : Sun;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    title={t('Theme')}
                    aria-label={t('Theme')}
                >
                    <CurrentIcon className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {options.map(({ value, label, icon: Icon }) => (
                    <DropdownMenuItem
                        key={value}
                        onClick={() => updateAppearance(value)}
                        className={appearance === value ? 'bg-muted' : ''}
                    >
                        <Icon className="mr-2 h-4 w-4" />
                        {label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
