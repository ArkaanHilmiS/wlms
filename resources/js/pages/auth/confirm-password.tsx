import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/password/confirm';
import {
    index as confirmOptions,
    store as confirmStore,
} from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyConfirmationController';
import PasskeyVerify from '@/components/passkey-verify';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from '@/components/ui/card';
import { useTranslate } from '@/hooks/useTranslate';

export default function ConfirmPassword() {
    const { t } = useTranslate();
    return (
        <>
            <Head title={t('Security Verification')} />

            <div className="mx-auto max-w-xl space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('Security Verification')}</CardTitle>
                        <CardDescription>
                            {t(
                                'You are trying to access a sensitive area or perform a highly secure action. Please confirm your password to verify your identity.',
                            )}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <PasskeyVerify
                            routes={{
                                options: confirmOptions(),
                                submit: confirmStore(),
                            }}
                            label={t('Confirm with passkey')}
                            loadingLabel={t('Confirming...')}
                            separator={t('Or confirm with password')}
                        />

                        <Form {...store.form()} resetOnSuccess={['password']}>
                            {({ processing, errors }) => (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="password">
                                            {t('Password')}
                                        </Label>
                                        <PasswordInput
                                            id="password"
                                            name="password"
                                            placeholder={t(
                                                'Enter your current password',
                                            )}
                                            autoComplete="current-password"
                                            autoFocus
                                            className="w-full"
                                        />
                                        <InputError message={errors.password} />
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <Button
                                            disabled={processing}
                                            data-test="confirm-password-button"
                                        >
                                            {processing && (
                                                <Spinner className="mr-2" />
                                            )}
                                            {t('Confirm Password')}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

ConfirmPassword.layout = {
    breadcrumbs: [
        {
            title: 'Security Verification',
            href: '/user/confirm-password',
        },
    ],
};
