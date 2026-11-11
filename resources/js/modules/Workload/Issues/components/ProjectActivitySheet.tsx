import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Activity } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslate } from '@/hooks/useTranslate';

interface ProjectActivitySheetProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
}

interface ActivityItem {
    id: string;
    issue_id: string;
    issue_title: string;
    actor?: {
        id: string;
        name: string;
    };
    field_changed: string;
    old_value?: string;
    new_value?: string;
    created_at: string;
}

export const ProjectActivitySheet: React.FC<ProjectActivitySheetProps> = ({
    projectId,
    isOpen,
    onClose,
}) => {
    const { t } = useTranslate();
    const { data: activities = [], isLoading } = useQuery<ActivityItem[]>({
        queryKey: ['projects', projectId, 'activity'],
        queryFn: async () => {
            const { data } = await axios.get(
                `/api/projects/${projectId}/activity`,
            );
            return data.data || data;
        },
        enabled: isOpen && !!projectId,
    });

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-md">
                <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        {t('Activity History')}
                    </SheetTitle>
                    <SheetDescription>
                        {t('Recent activities in this project.')}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-4 p-6">
                    {isLoading ? (
                        <div className="text-muted-foreground py-4 text-center text-sm">
                            {t('Loading activities...')}
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="text-muted-foreground py-4 text-center text-sm">
                            {t('No activities found.')}
                        </div>
                    ) : (
                        activities.map((activity) => (
                            <div
                                key={activity.id}
                                className="bg-muted/40 flex flex-col space-y-1 rounded-lg border p-3"
                            >
                                <p className="text-sm">
                                    <span className="font-medium">
                                        {activity.actor?.name || 'System'}
                                    </span>{' '}
                                    {activity.field_changed === 'status_id'
                                        ? 'mengubah status'
                                        : activity.field_changed ===
                                            'assignee_id'
                                          ? 'mengubah penugasan'
                                          : 'memperbarui'}
                                    <span className="ml-1 font-medium">
                                        "{activity.issue_title}"
                                    </span>
                                </p>
                                <span className="text-muted-foreground text-xs">
                                    {format(
                                        new Date(activity.created_at),
                                        'MMM d, yyyy HH:mm',
                                    )}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};
