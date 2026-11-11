import { usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    const { name } = usePage().props;
    const brandName = name && name !== 'Laravel' ? name : 'WorkPulse';

    return (
        <div className="flex items-center gap-2.5">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm ring-1 ring-white/20">
                <AppLogoIcon className="size-4.5 fill-current text-white" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-none">
                <span className="font-bold tracking-tight text-foreground">
                    {brandName}
                </span>
                <span className="mt-0.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                    Workload System
                </span>
            </div>
        </div>
    );
}
