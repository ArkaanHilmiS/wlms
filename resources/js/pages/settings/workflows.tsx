import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from '@/components/ui/card';
import { StatusManager } from '@/modules/Workload/Workflows/components/Statuses/StatusManager';
import { WorkflowManager } from '@/modules/Workload/Workflows/components/Workflows/WorkflowManager';
import { WorkloadPoliciesManager } from '@/modules/Workload/Workflows/components/Policies/WorkloadPoliciesManager';

export default function WorkflowsIndex() {
    const { t } = useTranslate();
    const [activeTab, setActiveTabState] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            if (tab) return tab;

            const saved = localStorage.getItem('settings-workflows-tab');
            if (saved) return saved;
        }
        return 'workflows';
    });

    const setActiveTab = (tab: string) => {
        setActiveTabState(tab);
        if (typeof window !== 'undefined') {
            localStorage.setItem('settings-workflows-tab', tab);
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

    return (
        <>
            <Head title={t('Workflows & Statuses')} />

            <div className="space-y-8">
                <Card>
                    <CardHeader className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="space-y-1">
                            <CardTitle>{t('Workflows & Statuses')}</CardTitle>
                            <CardDescription>
                                {t(
                                    'Manage statuses and workflows for your organization.',
                                )}
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <Tabs
                            value={activeTab}
                            onValueChange={setActiveTab}
                            className="w-full"
                        >
                            <div className="pb-4">
                                <TabsList className="grid w-full max-w-xl grid-cols-3">
                                    <TabsTrigger value="workflows">
                                        {t('Workflows')}
                                    </TabsTrigger>
                                    <TabsTrigger value="statuses">
                                        {t('Statuses')}
                                    </TabsTrigger>
                                    <TabsTrigger value="policies">
                                        {t('SLA & Policies')}
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="workflows" className="mt-0">
                                <WorkflowManager />
                            </TabsContent>

                            <TabsContent value="statuses" className="mt-0">
                                <StatusManager />
                            </TabsContent>

                            <TabsContent value="policies" className="mt-0">
                                <WorkloadPoliciesManager />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

import { index as workflowsIndex } from '@/routes/workflows';
import { useTranslate } from '@/hooks/useTranslate';

WorkflowsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Workflows & Statuses',
            href: workflowsIndex(),
        },
    ],
};
