import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { useEffect } from 'react';
import { initEcho } from '@/lib/echo';
import { toast } from 'sonner';

export interface Notification {
    id: string;
    type: string;
    data: any;
    read_at: string | null;
    created_at: string;
}

export interface NotificationsResponse {
    data: Notification[];
    unread_count: number;
}

export const useNotifications = (userId?: string) => {
    const queryClient = useQueryClient();
    const queryKey = ['notifications'];

    const { data, isLoading } = useQuery<NotificationsResponse>({
        queryKey,
        queryFn: async () => {
            const { data } = await axios.get('/api/notifications');
            return data;
        },
        enabled: !!userId,
    });

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            const { data } = await axios.put('/api/notifications/read');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    useEffect(() => {
        if (!userId) return;

        const echo = initEcho();
        if (!echo) return;

        const channel = echo.private(`user.${userId}`);

        channel.listen('NewNotification', (e: any) => {
            queryClient.invalidateQueries({ queryKey });

            // Show toast based on type
            const type = e.type || e.notification?.type;
            const payloadData = e.data || e.notification?.data;

            if (type === 'issue.assigned') {
                toast(
                    `You were assigned to issue #${payloadData?.issue_number}`,
                );
            } else if (type === 'comment.added') {
                toast(
                    `New comment on your issue: ${payloadData?.body_preview}`,
                );
            } else if (type === 'comment.mentioned') {
                toast(
                    `${payloadData?.author_name || 'Someone'} mentioned you in a comment: "${payloadData?.body_preview}"`,
                );
            } else if (type === 'issue.transitioned') {
                toast(`Issue status changed`);
            } else if (type === 'sprint.state_changed') {
                toast(
                    `Sprint ${payloadData?.sprint_name} is now ${payloadData?.new_state}`,
                );
            } else {
                toast('New notification received');
            }
        });

        return () => {
            if (echo) {
                echo.leave(`user.${userId}`);
            }
        };
    }, [userId, queryClient]);

    return {
        notifications: data?.data || [],
        unreadCount: data?.unread_count || 0,
        markAllRead: markAllReadMutation.mutateAsync,
        isLoading,
    };
};
