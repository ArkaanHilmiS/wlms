import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    FolderGit2,
    LayoutGrid,
    Briefcase,
    HelpCircle,
    CheckSquare,
    Users,
    Folder,
    Settings,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { useTranslate } from '@/hooks/useTranslate';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types';
import type { LucideIcon } from 'lucide-react';

// Type from database API (Simulated)
type DBMenuItem = {
    title: string;
    url: string;
    icon_name: string;
};

// Icon Dictionary to map string from DB to React Component
const ICON_MAP: Record<string, LucideIcon> = {
    dashboard: LayoutGrid,
    workspaces: Briefcase,
    issues: CheckSquare,
    users: Users,
    folder: Folder,
    settings: Settings,
};

export function AppSidebar() {
    const { auth } = usePage().props as unknown as {
        auth: { user: { menus?: DBMenuItem[] } };
    };
    const dashboardUrl = '/dashboard';
    const { t } = useTranslate();

    // 1. DEFAULT MENU (Selalu ada untuk semua user)
    const defaultNavItems: NavItem[] = [
        {
            title: t('Dashboard'),
            href: dashboardUrl,
            icon: LayoutGrid,
        },
    ];

    // 2. DYNAMIC MENUS (Datang dari database/RBAC user via Shared Props)
    const mappedMenusFromDB: DBMenuItem[] = auth?.user?.menus || [];

    // Menerjemahkan DBMenuItem menjadi NavItem (menyisipkan Icon component)
    const dynamicNavItems: NavItem[] = mappedMenusFromDB.map((dbMenu) => {
        const iconName = dbMenu.icon_name ? dbMenu.icon_name.toLowerCase() : '';
        const IconComponent = ICON_MAP[iconName] || HelpCircle;
        return {
            title: t(dbMenu.title),
            href: dbMenu.url,
            icon: IconComponent,
        };
    });

    // 3. GABUNGKAN DENGAN MENCEGAH DUPLIKASI
    // Pastikan menu dinamis tidak me-render ulang menu default (misal: Dashboard)
    const defaultHrefs = defaultNavItems.map((item) => item.href);
    const filteredDynamicNavItems = dynamicNavItems.filter(
        (item) => !defaultHrefs.includes(item.href),
    );

    const mainNavItems: NavItem[] = [
        ...defaultNavItems,
        ...filteredDynamicNavItems,
    ];

    const footerNavItems: NavItem[] = [
        {
            title: t('Repository'),
            href: 'https://github.com/laravel/react-starter-kit',
            icon: FolderGit2,
        },
        {
            title: t('Documentation'),
            href: '/docs',
            icon: BookOpen,
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboardUrl} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {/* NavMain (Dumb Component) merender array final */}
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
