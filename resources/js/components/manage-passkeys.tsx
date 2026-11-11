import { router } from '@inertiajs/react';
import { KeyRound } from 'lucide-react';
import { destroy } from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyRegistrationController';
import PasskeyItem from '@/components/passkey-item';
import PasskeyRegistration from '@/components/passkey-register';
import { useTranslate } from '@/hooks/useTranslate';
import type { Passkey } from '@/types/auth';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

export type Props = {
    canManagePasskeys?: boolean;
    passkeys?: Passkey[];
};

const EmptyState = () => {
    const { t } = useTranslate();

    return (
        <div className="p-8 text-center">
            <div className="bg-muted mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
                <KeyRound className="text-muted-foreground h-7 w-7" />
            </div>
            <p className="font-medium">{t('No passkeys yet')}</p>
            <p className="text-muted-foreground mt-1 text-sm">
                {t('Add a passkey to sign in without a password')}
            </p>
        </div>
    );
};

export default function ManagePasskeys(props: Props) {
    const { t } = useTranslate();
    const passkeys = props.passkeys ?? [];

    const handleDelete = (id: number, onError: () => void) => {
        router.delete(destroy.url(id), {
            preserveScroll: true,
            onError,
        });
    };

    const handleRegisterSuccess = () => {
        router.reload();
    };

    if (!(props.canManagePasskeys ?? false)) {
        return null;
    }

    return (
        <Card>
            <CardHeader className="pb-6">
                <CardTitle>{t('Passkeys')}</CardTitle>
                <CardDescription>
                    {t('Manage your passkeys for passwordless sign-in.')}
                </CardDescription>
            </CardHeader>

            <CardContent>
                <div className="border-border mb-6 max-w-2xl overflow-hidden rounded-lg border">
                    {passkeys.length > 0 ? (
                        passkeys.map((passkey) => (
                            <PasskeyItem
                                key={passkey.id}
                                passkey={passkey}
                                onDelete={handleDelete}
                            />
                        ))
                    ) : (
                        <EmptyState />
                    )}
                </div>

                <PasskeyRegistration onSuccess={handleRegisterSuccess} />
            </CardContent>
        </Card>
    );
}
