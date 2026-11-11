import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
    locale?: string;
    onChange: (lang: string) => void;
}

export function LanguageSwitcher({ locale, onChange }: LanguageSwitcherProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Globe className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={() => onChange('en')}
                    className={locale === 'en' ? 'bg-muted' : ''}
                >
                    🇬🇧 English
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => onChange('id')}
                    className={locale === 'id' ? 'bg-muted' : ''}
                >
                    🇮🇩 Indonesia
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
