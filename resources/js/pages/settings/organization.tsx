import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { OrgLevelManager } from '@/modules/Identity/components/Organization/OrgLevelManager';
import { OrgUnitManager } from '@/modules/Identity/components/Organization/OrgUnitManager';

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from '@/components/ui/card';
import { useTranslate } from '@/hooks/useTranslate';

export default function OrganizationSettings() {
    const { t } = useTranslate();
    const [activeTab, setActiveTabState] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            if (tab) return tab;

            const saved = localStorage.getItem('settings-org-tab');
            if (saved) return saved;
        }
        return 'levels';
    });

    const setActiveTab = (tab: string) => {
        setActiveTabState(tab);
        if (typeof window !== 'undefined') {
            localStorage.setItem('settings-org-tab', tab);
            const url = new URL(window.location.href);
            url.searchParams.set('tab', tab);
            window.history.replaceState({}, '', url.toString());
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (!params.get('tab')) {
                const url = new URL(window.location.href);
                url.searchParams.set('tab', activeTab);
                window.history.replaceState({}, '', url.toString());
            }
        }
    }, [activeTab]);
    const [triggerLevel, setTriggerLevel] = useState(0);
    const [triggerUnit, setTriggerUnit] = useState(0);

    return (
        <>
            <Head title={t('Organization Settings')} />

            <div className="space-y-8">
                <Card>
                    <CardHeader className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="space-y-1">
                            <CardTitle>{t('Organization')}</CardTitle>
                            <CardDescription>
                                {t(
                                    'Manage your organizational hierarchy, levels, and units.',
                                )}
                            </CardDescription>
                        </div>
                        <div className="flex-shrink-0">
                            <Button
                                onClick={() =>
                                    activeTab === 'levels'
                                        ? setTriggerLevel((t) => t + 1)
                                        : setTriggerUnit((t) => t + 1)
                                }
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                {activeTab === 'levels'
                                    ? 'Add Level'
                                    : 'Add Unit'}
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <Tabs
                            value={activeTab}
                            onValueChange={setActiveTab}
                            className="w-full"
                        >
                            <div className="pb-4">
                                <TabsList className="grid w-full max-w-md grid-cols-2">
                                    <TabsTrigger value="levels">
                                        {t('Organization Levels')}
                                    </TabsTrigger>
                                    <TabsTrigger value="units">
                                        {t('Organization Units')}
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="levels" className="mt-0">
                                <OrgLevelManager createTrigger={triggerLevel} />
                            </TabsContent>

                            <TabsContent value="units" className="mt-0">
                                <OrgUnitManager createTrigger={triggerUnit} />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
