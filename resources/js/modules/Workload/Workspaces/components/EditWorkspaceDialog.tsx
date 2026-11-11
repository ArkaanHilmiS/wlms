import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslate } from '@/hooks/useTranslate';

interface EditWorkspaceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId?: string;
    initialName: string;
    onSubmit: (name: string) => void;
    isPending?: boolean;
}

export function EditWorkspaceDialog({
    open,
    onOpenChange,
    workspaceId,
    initialName,
    onSubmit,
    isPending = false,
}: EditWorkspaceDialogProps) {
    const { t } = useTranslate();
    const [name, setName] = useState(initialName);
    const [enableSprints, setEnableSprints] = useState(true);
    const [initialEnableSprints, setInitialEnableSprints] = useState(true);

    // Reset name when dialog opens/closes or initialName changes
    useEffect(() => {
        if (open) {
            setName(initialName);
            if (workspaceId) {
                axios
                    .get(`/api/workspaces/${workspaceId}/settings`)
                    .then((res) => {
                        const enabled =
                            res.data?.data?.enable_sprints !== false;
                        setEnableSprints(enabled);
                        setInitialEnableSprints(enabled);
                    })
                    .catch(() => {});
            }
        }
    }, [open, initialName, workspaceId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        if (workspaceId && enableSprints !== initialEnableSprints) {
            await axios
                .put(`/api/workspaces/${workspaceId}/settings`, {
                    enable_sprints: enableSprints,
                })
                .catch(() => {});
            setInitialEnableSprints(enableSprints);
        }

        if (name === initialName) {
            onOpenChange(false);
            return;
        }
        onSubmit(name);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t('Edit Workspace')}</DialogTitle>
                        <DialogDescription>
                            {t('Change the name of your workspace.')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-6">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">
                                {t('Workspace Name')}
                            </Label>
                            <Input
                                id="edit-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('e.g. Project Alpha')}
                                disabled={isPending}
                                autoFocus
                            />
                        </div>
                        {workspaceId && (
                            <div className="flex items-start space-x-3 rounded-lg border p-3">
                                <Checkbox
                                    id="ws-enable-sprints"
                                    checked={enableSprints}
                                    onCheckedChange={(checked) =>
                                        setEnableSprints(Boolean(checked))
                                    }
                                    disabled={isPending}
                                />
                                <div className="grid gap-1 leading-none">
                                    <Label
                                        htmlFor="ws-enable-sprints"
                                        className="cursor-pointer text-sm font-medium"
                                    >
                                        {t('Enable Sprints (Scrum Mode)')}
                                    </Label>
                                    <p className="text-muted-foreground text-xs">
                                        {t(
                                            'Uncheck to use pure Kanban mode without Backlog & Sprint tabs across all projects in this workspace.',
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isPending}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                isPending ||
                                !name.trim() ||
                                (name === initialName &&
                                    enableSprints === initialEnableSprints)
                            }
                        >
                            {isPending ? t('Saving...') : t('Save Changes')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
