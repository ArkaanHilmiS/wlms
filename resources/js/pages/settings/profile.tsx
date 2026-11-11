import React, { useState } from 'react';
import { Form, Head, usePage } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import ProfileController from '@/actions/App/Modules/Identity/Presentation/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Building2,
    Network,
    Fingerprint,
    Activity,
    ChevronRight,
    Crown,
} from 'lucide-react';
import { edit } from '@/routes/profile';
import type { Auth } from '@/types';
import { send } from '@/routes/verification';
import { useTranslate } from '@/hooks/useTranslate';

type PageProps = {
    auth: Auth;
};

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user as any;

    const [locale, setLocale] = useState(user.locale || 'en');
    const { t } = useTranslate();

    const orgUnit = user.org_unit;

    // Extract hierarchy lineage
    const lineage: any[] = orgUnit?.lineage || (orgUnit ? [orgUnit] : []);

    const rootUnit = lineage.length > 0 ? lineage[0] : null;
    const directParent =
        lineage.length > 1 ? lineage[lineage.length - 2] : null;

    return (
        <>
            <Head title={t('Profile settings')} />

            <div className="max-w-4xl space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('Profile Information')}</CardTitle>
                        <CardDescription>
                            {t("Update your account's profile information.")}
                        </CardDescription>
                    </CardHeader>

                    <Form
                        {...ProfileController.update.form()}
                        options={{ preserveScroll: true }}
                    >
                        {({ processing, errors }) => (
                            <>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">
                                                {t('Name')}
                                            </Label>
                                            <Input
                                                id="name"
                                                className="w-full"
                                                defaultValue={user.name}
                                                name="name"
                                                required
                                                placeholder={t('Full name')}
                                            />
                                            <InputError
                                                className="mt-2"
                                                message={errors.name}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email">
                                                {t('Email address')}
                                            </Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                className="w-full"
                                                defaultValue={user.email}
                                                name="email"
                                                required
                                                placeholder={t('Email address')}
                                            />
                                            <InputError
                                                className="mt-2"
                                                message={errors.email}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="employee_id">
                                                {t('Employee ID (NIP/NIK)')}
                                            </Label>
                                            <Input
                                                id="employee_id"
                                                type="text"
                                                className="w-full"
                                                defaultValue={
                                                    user.employee_id || ''
                                                }
                                                name="employee_id"
                                                placeholder="e.g. 198901..."
                                            />
                                            <InputError
                                                className="mt-2"
                                                message={
                                                    errors.employee_id as string
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="phone">
                                                {t('Phone Number')}
                                            </Label>
                                            <Input
                                                id="phone"
                                                type="tel"
                                                className="w-full"
                                                defaultValue={user.phone || ''}
                                                name="phone"
                                                placeholder="+62 812..."
                                            />
                                            <InputError
                                                className="mt-2"
                                                message={errors.phone as string}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="locale">
                                                {t('Language Preference')}
                                            </Label>
                                            <Select
                                                value={locale}
                                                onValueChange={setLocale}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue
                                                        placeholder={t(
                                                            'Select Language',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="en">
                                                        {t('English (US)')}
                                                    </SelectItem>
                                                    <SelectItem value="id">
                                                        {t('Bahasa Indonesia')}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <input
                                                type="hidden"
                                                name="locale"
                                                value={locale}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="status">
                                                {t('Account Status')}
                                            </Label>
                                            <Input
                                                id="status"
                                                disabled
                                                className="bg-muted/50 w-full"
                                                defaultValue={t(
                                                    user.status || 'ACTIVE',
                                                )}
                                            />
                                            <p className="text-muted-foreground text-[11px]">
                                                {t('Managed by system admin.')}
                                            </p>
                                        </div>
                                    </div>

                                    {mustVerifyEmail &&
                                        user.email_verified_at === null && (
                                            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                                                <p className="text-sm text-amber-800 dark:text-amber-200">
                                                    {t(
                                                        'Your email address is unverified.',
                                                    )}{' '}
                                                    <Link
                                                        href={send()}
                                                        as="button"
                                                        className="font-medium underline hover:text-amber-900 dark:hover:text-amber-100"
                                                    >
                                                        {t(
                                                            'Click here to re-send the verification email.',
                                                        )}
                                                    </Link>
                                                </p>
                                                {status ===
                                                    'verification-link-sent' && (
                                                    <div className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                                                        {t(
                                                            'A new verification link has been sent to your email address.',
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                </CardContent>

                                <CardFooter className="bg-muted/10 justify-end border-t pt-6">
                                    <Button disabled={processing}>
                                        {t('Save Changes')}
                                    </Button>
                                </CardFooter>
                            </>
                        )}
                    </Form>
                </Card>

                {/* Organization Details (Read-only) */}
                <Card className="bg-muted/30 border-dashed">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="text-muted-foreground h-5 w-5" />
                            {t('Organization Identity')}
                        </CardTitle>
                        <CardDescription>
                            {t(
                                'Your structural placement within the company hierarchy.',
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {orgUnit ? (
                            <div className="space-y-6">
                                {/* Hierarchy Breadcrumb */}
                                {lineage.length > 0 && (
                                    <div className="bg-background/50 flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
                                        {lineage.map((node, index) => (
                                            <React.Fragment key={node.id}>
                                                <div
                                                    className={`flex items-center gap-1.5 ${index === lineage.length - 1 ? 'text-primary font-semibold' : 'text-muted-foreground'}`}
                                                >
                                                    {index === 0 && (
                                                        <Crown className="h-3.5 w-3.5" />
                                                    )}
                                                    <span>{node.name}</span>
                                                </div>
                                                {index < lineage.length - 1 && (
                                                    <ChevronRight className="text-muted-foreground/50 h-4 w-4 shrink-0" />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
                                    <div className="border-primary/20 space-y-1 border-l-2 pl-4">
                                        <p className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                                            <Network className="h-4 w-4" />{' '}
                                            {t('Direct Unit Name')}
                                        </p>
                                        <p className="text-base font-semibold">
                                            {orgUnit.name}
                                        </p>
                                        {directParent && (
                                            <p className="text-muted-foreground mt-1 text-xs">
                                                {t('Reports to:')}{' '}
                                                {directParent.name}
                                            </p>
                                        )}
                                    </div>
                                    <div className="border-primary/20 space-y-1 border-l-2 pl-4">
                                        <p className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                                            <Crown className="h-4 w-4" />{' '}
                                            {t('Top Level Organization')}
                                        </p>
                                        <p className="text-base font-semibold">
                                            {rootUnit ? rootUnit.name : '-'}
                                        </p>
                                        {rootUnit && rootUnit.level && (
                                            <p className="text-muted-foreground mt-1 text-xs">
                                                {t('Level:')}{' '}
                                                {rootUnit.level.name}
                                            </p>
                                        )}
                                    </div>
                                    <div className="border-primary/20 space-y-1 border-l-2 pl-4">
                                        <p className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                                            <Fingerprint className="h-4 w-4" />{' '}
                                            {t('Unit Code')}
                                        </p>
                                        <p className="text-base font-semibold">
                                            {orgUnit.code || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="border-primary/20 space-y-1 border-l-2 pl-4">
                                        <p className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                                            <Building2 className="h-4 w-4" />{' '}
                                            {t('Level / Type')}
                                        </p>
                                        <p className="text-base font-semibold">
                                            {orgUnit.level?.name ||
                                                t('Standard Unit')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-muted-foreground flex flex-col items-center py-6 text-center text-sm">
                                <Building2 className="mb-3 h-8 w-8 opacity-20" />
                                <p>
                                    {t(
                                        'You are currently not assigned to any Organization Unit.',
                                    )}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <DeleteUser />
            </div>
        </>
    );
}

Profile.layout = {
    breadcrumbs: [{ title: 'Profile settings', href: edit() }],
};
