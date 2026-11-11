import { useSyncExternalStore } from 'react';

export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = ResolvedAppearance | 'system';
export type IconSize = 'sm' | 'md' | 'lg';

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => void;
    readonly iconSize: IconSize;
    readonly updateIconSize: (size: IconSize) => void;
};

const listeners = new Set<() => void>();
let currentAppearance: Appearance = 'system';
let currentIconSize: IconSize = 'md';

const prefersDark = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const setCookie = (name: string, value: string, days = 365): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const getStoredAppearance = (): Appearance => {
    if (typeof window === 'undefined') {
        return 'system';
    }

    return (localStorage.getItem('appearance') as Appearance) || 'system';
};

const getStoredIconSize = (): IconSize => {
    if (typeof window === 'undefined') {
        return 'md';
    }

    const stored = (localStorage.getItem('icon_size') ||
        localStorage.getItem('wlms_projects_icon_size')) as IconSize;
    if (stored && ['sm', 'md', 'lg'].includes(stored)) {
        return stored;
    }

    return 'md';
};

const isDarkMode = (appearance: Appearance): boolean => {
    return appearance === 'dark' || (appearance === 'system' && prefersDark());
};

const applyTheme = (appearance: Appearance): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const isDark = isDarkMode(appearance);

    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
};

const applyIconSize = (size: IconSize): void => {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.setAttribute('data-icon-size', size);
    document.documentElement.classList.remove(
        'icon-size-sm',
        'icon-size-md',
        'icon-size-lg',
    );
    document.documentElement.classList.add(`icon-size-${size}`);
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

const mediaQuery = (): MediaQueryList | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.matchMedia('(prefers-color-scheme: dark)');
};

const handleSystemThemeChange = (): void => applyTheme(currentAppearance);

const handleStorageChange = (e: StorageEvent): void => {
    if (
        (e.key === 'icon_size' || e.key === 'wlms_projects_icon_size') &&
        e.newValue
    ) {
        if (['sm', 'md', 'lg'].includes(e.newValue)) {
            currentIconSize = e.newValue as IconSize;
            applyIconSize(currentIconSize);
            notify();
        }
    }
    if (e.key === 'appearance' && e.newValue) {
        currentAppearance = e.newValue as Appearance;
        applyTheme(currentAppearance);
        notify();
    }
};

export function initializeTheme(): void {
    if (typeof window === 'undefined') {
        return;
    }

    if (!localStorage.getItem('appearance')) {
        localStorage.setItem('appearance', 'system');
        setCookie('appearance', 'system');
    }

    if (!localStorage.getItem('icon_size')) {
        localStorage.setItem('icon_size', 'md');
        setCookie('icon_size', 'md');
    }

    currentAppearance = getStoredAppearance();
    currentIconSize = getStoredIconSize();
    applyTheme(currentAppearance);
    applyIconSize(currentIconSize);

    // Set up system theme change listener
    mediaQuery()?.addEventListener('change', handleSystemThemeChange);

    // Set up cross-tab storage sync
    window.addEventListener('storage', handleStorageChange);
}

export function useAppearance(): UseAppearanceReturn {
    const appearance: Appearance = useSyncExternalStore(
        subscribe,
        () => currentAppearance,
        () => 'system',
    );

    const iconSize: IconSize = useSyncExternalStore(
        subscribe,
        () => currentIconSize,
        () => 'md',
    );

    const resolvedAppearance: ResolvedAppearance = isDarkMode(appearance)
        ? 'dark'
        : 'light';

    const updateAppearance = (mode: Appearance): void => {
        currentAppearance = mode;

        // Store in localStorage for client-side persistence...
        localStorage.setItem('appearance', mode);

        // Store in cookie for SSR...
        setCookie('appearance', mode);

        applyTheme(mode);
        notify();
    };

    const updateIconSize = (size: IconSize): void => {
        currentIconSize = size;

        // Store in localStorage for client-side persistence...
        localStorage.setItem('icon_size', size);
        localStorage.setItem('wlms_projects_icon_size', size);

        // Store in cookie for SSR...
        setCookie('icon_size', size);

        applyIconSize(size);
        notify();
    };

    return {
        appearance,
        resolvedAppearance,
        updateAppearance,
        iconSize,
        updateIconSize,
    } as const;
}

export function useIconSize(): {
    readonly iconSize: IconSize;
    readonly updateIconSize: (size: IconSize) => void;
} {
    const { iconSize, updateIconSize } = useAppearance();
    return { iconSize, updateIconSize } as const;
}
