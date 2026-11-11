import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import IconSizeToggle from '@/components/icon-size-toggle';
import { edit as editAppearance } from '@/routes/appearance';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useTranslate } from '@/hooks/useTranslate';

export default function Appearance() {
    const { t } = useTranslate();
    return (
        <>
            <Head title={t('Appearance settings')} />

            <div className="space-y-8">
                {/* Theme Mode Card */}
                <Card>
                    <CardHeader className="border-border border-b pb-6">
                        <CardTitle>{t('Theme Mode')}</CardTitle>
                        <CardDescription>
                            {t(
                                'Choose between light, dark, or system color themes.',
                            )}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="max-w-2xl pt-6">
                        <AppearanceTabs />
                    </CardContent>
                </Card>

                {/* Display Density & Icon Size Card */}
                <Card>
                    <CardHeader className="border-border border-b pb-6">
                        <CardTitle>{t('Icon & Display Size')}</CardTitle>
                        <CardDescription>
                            {t(
                                'Adjust the size of icons, project cards, and interface density globally across the application.',
                            )}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-6">
                        <IconSizeToggle />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Appearance settings',
            href: editAppearance(),
        },
    ],
};
