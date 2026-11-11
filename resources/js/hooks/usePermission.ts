import { usePage } from '@inertiajs/react';

export function usePermission() {
    const { auth } = usePage().props as any;
    const permissions: string[] = auth?.user?.permissions ?? [];
    const roles: string[] = auth?.user?.roles ?? [];

    const can = (permission: string): boolean => {
        if (
            permissions.includes('*') ||
            roles.some((r) => r.toLowerCase() === 'superadmin')
        ) {
            return true;
        }

        if (permissions.includes(permission)) {
            return true;
        }

        // Sub-aksi otomatis tercakup oleh :manage (contoh: analytics:manage mencakup analytics:view)
        const [module] = permission.split(':');
        if (permissions.includes(`${module}:manage`)) {
            return true;
        }

        return false;
    };

    const hasRole = (roleName: string): boolean =>
        roles.some((r) => r.toLowerCase() === roleName.toLowerCase()) ||
        permissions.includes('*');

    return { can, hasRole, permissions, roles };
}
