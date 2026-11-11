import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export type Menu = {
    id: string;
    label: string;
    key: string;
    route?: string;
    icon?: string;
    parent_id?: string | null;
};

export function useMenus() {
    return useQuery({
        queryKey: ['menus'],
        queryFn: async () => {
            const { data } = await axios.get('/api/rbac/menus');
            return data.data as Menu[];
        },
    });
}
