import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { RoleManager } from '@/modules/Identity/components/RoleManager';
import { UserManager } from '@/modules/Identity/components/Users/UserManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCreateDialog } from '@/modules/Identity/components/Users/UserCreateDialog';
import { UserBulkCreateDialog } from '@/modules/Identity/components/Users/UserBulkCreateDialog';
import { RoleCreateDialog } from '@/modules/Identity/components/RoleCreateDialog';

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from '@/components/ui/card';
import { useTranslate } from '@/hooks/useTranslate';

export default function RBACIndex() {
    const { t } = useTranslate();
    const [activeTab, setActiveTabState] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            if (tab) return tab;

            const saved = localStorage.getItem('settings-rbac-tab');
            if (saved) return saved;
        }
        return 'users';
    });

    const setActiveTab = (tab: string) => {
        setActiveTabState(tab);
        if (typeof window !== 'undefined') {
            localStorage.setItem('settings-rbac-tab', tab);
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
            <Head title={t('Users')} />

            <div className="space-y-8">
                <Card>
                    <CardHeader className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="space-y-1">
                            <CardTitle>{t('Users')}</CardTitle>
                            <CardDescription>
                                Invite or manage your organization's users.
                            </CardDescription>
                        </div>
                        <div className="flex-shrink-0">
                            {activeTab === 'users' ? (
                                <div className="flex items-center gap-2">
                                    <UserBulkCreateDialog />
                                    <UserCreateDialog />
                                </div>
                            ) : (
                                <RoleCreateDialog />
                            )}
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
                                    <TabsTrigger value="users">
                                        {t('All users')}
                                    </TabsTrigger>
                                    <TabsTrigger value="roles">
                                        {t('User role manager')}
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="users" className="mt-0">
                                <UserManager />
                            </TabsContent>

                            <TabsContent value="roles" className="mt-0">
                                <RoleManager />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

RBACIndex.layout = {
    breadcrumbs: [
        {
            title: 'RBAC Management',
            href: '/settings/rbac',
        },
    ],
};
