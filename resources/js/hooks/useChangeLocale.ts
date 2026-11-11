import { router } from '@inertiajs/react';

export function useChangeLocale() {
    const changeLocale = (lang: string) => {
        router.post(
            '/locale',
            { locale: lang },
            {
                preserveScroll: true,
            },
        );
    };

    return { changeLocale };
}
