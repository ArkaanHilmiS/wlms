import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';

export function useTranslate() {
    const { locale, translations } = usePage<SharedData>().props;

    const t = (key: string, replacements?: Record<string, string | number>) => {
        let translation = translations?.[key] || key;

        if (replacements) {
            Object.keys(replacements).forEach((replaceKey) => {
                translation = translation.replace(
                    new RegExp(`:${replaceKey}`, 'g'),
                    String(replacements[replaceKey]),
                );
            });
        }

        return translation;
    };

    return { t, locale };
}
