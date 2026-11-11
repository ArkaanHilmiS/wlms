import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Issue } from '@/types/issue';
import { useTranslate } from '@/hooks/useTranslate';

export interface LogWorkPayload {
    time_spent_seconds: number;
    description: string;
    started_at: string;
}

interface LogWorkDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: LogWorkPayload) => void;
    issue?: Issue | null;
    isLoading?: boolean;
}

export const LogWorkDialog: React.FC<LogWorkDialogProps> = ({
    isOpen,
    onClose,
    onSubmit,
    issue,
    isLoading,
}) => {
    const { t } = useTranslate();
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');
    const [description, setDescription] = useState('');
    const [startedAt, setStartedAt] = useState('');

    useEffect(() => {
        if (isOpen) {
            setHours('');
            setMinutes('');
            setDescription('');

            // Set default to current time in local ISO format (YYYY-MM-DDTHH:mm)
            const now = new Date();
            const offset = now.getTimezoneOffset() * 60000;
            const localISOTime = new Date(now.getTime() - offset)
                .toISOString()
                .slice(0, 16);
            setStartedAt(localISOTime);
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const h = parseInt(hours || '0', 10);
        const m = parseInt(minutes || '0', 10);
        const time_spent_seconds = h * 3600 + m * 60;

        if (time_spent_seconds <= 0) {
            toast.error(t('Validation Error'), {
                description: 'Time spent must be greater than 0',
            });
            return;
        }

        const payload: LogWorkPayload = {
            time_spent_seconds,
            description,
            started_at: new Date(startedAt).toISOString(),
        };

        onSubmit(payload);
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent
                className="sm:max-w-[425px]"
                onInteractOutside={(e) => {
                    e.preventDefault();
                }}
            >
                <DialogHeader>
                    <DialogTitle>
                        {t('Log Work -')} {issue?.title}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="hours">{t('Hours')}</Label>
                            <Input
                                id="hours"
                                type="number"
                                min="0"
                                value={hours}
                                onChange={(e) => setHours(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="minutes">{t('Minutes')}</Label>
                            <Input
                                id="minutes"
                                type="number"
                                min="0"
                                max="59"
                                value={minutes}
                                onChange={(e) => setMinutes(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="startedAt">{t('Started At')}</Label>
                        <Input
                            id="startedAt"
                            type="datetime-local"
                            value={startedAt}
                            onChange={(e) => setStartedAt(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="workDescription">
                            {t('Description')}
                        </Label>
                        <Textarea
                            id="workDescription"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('What did you work on?')}
                            rows={3}
                            required
                        />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save Worklog'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
