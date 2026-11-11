import React from 'react';
import { OrgLevel } from '../../hooks/use-org-levels';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTranslate } from '@/hooks/useTranslate';

export interface OrgLevelFormData {
    name: string;
    slug: string;
    depth: number;
    is_leaf: boolean;
    can_own_workspace: boolean;
    is_active: boolean;
}

interface OrgLevelFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingLevel: OrgLevel | null;
    isPending: boolean;
    formData: OrgLevelFormData;
    onFormDataChange: (data: OrgLevelFormData) => void;
    onSubmit: (e: React.FormEvent) => void;
}

export function OrgLevelFormDialog({
    open,
    onOpenChange,
    editingLevel,
    isPending,
    formData,
    onFormDataChange,
    onSubmit,
}: OrgLevelFormDialogProps) {
    const { t } = useTranslate();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {editingLevel
                            ? 'Edit Organization Level'
                            : 'Add Organization Level'}
                    </DialogTitle>
                    <DialogDescription>
                        {t(
                            'Configure the properties of this organization level.',
                        )}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="level-name">{t('Name')}</Label>
                            <Input
                                id="level-name"
                                value={formData.name}
                                onChange={(e) =>
                                    onFormDataChange({
                                        ...formData,
                                        name: e.target.value,
                                    })
                                }
                                placeholder="e.g., Department"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="level-slug">{t('Slug')}</Label>
                            <Input
                                id="level-slug"
                                value={formData.slug}
                                onChange={(e) =>
                                    onFormDataChange({
                                        ...formData,
                                        slug: e.target.value,
                                    })
                                }
                                placeholder="e.g., department"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="level-depth">
                            Hierarchy Depth (1 = Highest)
                        </Label>
                        <Input
                            id="level-depth"
                            type="number"
                            min={1}
                            value={formData.depth}
                            onChange={(e) =>
                                onFormDataChange({
                                    ...formData,
                                    depth: parseInt(e.target.value) || 1,
                                })
                            }
                            required
                        />
                    </div>

                    <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>{t('Active Status')}</Label>
                                <p className="text-muted-foreground text-sm">
                                    {t('Is this level currently active?')}
                                </p>
                            </div>
                            <Switch
                                checked={formData.is_active}
                                onCheckedChange={(checked: boolean) =>
                                    onFormDataChange({
                                        ...formData,
                                        is_active: checked,
                                    })
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>{t('Leaf Node')}</Label>
                                <p className="text-muted-foreground text-sm">
                                    {t(
                                        'Is this the lowest level in the hierarchy?',
                                    )}
                                </p>
                            </div>
                            <Switch
                                checked={formData.is_leaf}
                                onCheckedChange={(checked: boolean) =>
                                    onFormDataChange({
                                        ...formData,
                                        is_leaf: checked,
                                    })
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>{t('Workspace Owner')}</Label>
                                <p className="text-muted-foreground text-sm">
                                    {t(
                                        'Can units at this level own workspaces?',
                                    )}
                                </p>
                            </div>
                            <Switch
                                checked={formData.can_own_workspace}
                                onCheckedChange={(checked: boolean) =>
                                    onFormDataChange({
                                        ...formData,
                                        can_own_workspace: checked,
                                    })
                                }
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {editingLevel ? 'Save Changes' : 'Create Level'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
