import React from 'react';
import { OrgUnit } from '../../hooks/use-org-units';
import { OrgLevel } from '../../hooks/use-org-levels';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTranslate } from '@/hooks/useTranslate';

export interface OrgUnitFormData {
    name: string;
    code: string;
    parent_id: string;
    org_level_id: string;
    is_active: boolean;
    max_workspaces: number;
}

interface OrgUnitFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingUnit: OrgUnit | null;
    levels: OrgLevel[];
    flatUnits: Array<{ id: string; name: string; depth: number }>;
    isPending: boolean;
    formData: OrgUnitFormData;
    onFormDataChange: (data: OrgUnitFormData) => void;
    onSubmit: (e: React.FormEvent) => void;
}

const renderIndent = (depth: number): string =>
    depth > 0 ? ' '.repeat(depth * 4) + '└─ ' : '';

export function OrgUnitFormDialog({
    open,
    onOpenChange,
    editingUnit,
    levels,
    flatUnits,
    isPending,
    formData,
    onFormDataChange,
    onSubmit,
}: OrgUnitFormDialogProps) {
    const { t } = useTranslate();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {editingUnit
                            ? 'Edit Organization Unit'
                            : 'Add Organization Unit'}
                    </DialogTitle>
                    <DialogDescription>
                        {t(
                            'Configure the properties and hierarchy of this organization unit.',
                        )}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="unit-name">{t('Name')}</Label>
                            <Input
                                id="unit-name"
                                value={formData.name}
                                onChange={(e) =>
                                    onFormDataChange({
                                        ...formData,
                                        name: e.target.value,
                                    })
                                }
                                placeholder="e.g., Engineering Team"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="unit-code">{t('Code')}</Label>
                            <Input
                                id="unit-code"
                                value={formData.code}
                                onChange={(e) =>
                                    onFormDataChange({
                                        ...formData,
                                        code: e.target.value,
                                    })
                                }
                                placeholder="e.g., ENG-01"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="unit-org-level">
                            {t('Organization Level')}
                        </Label>
                        <Combobox
                            id="unit-org-level"
                            options={levels.map((level) => ({
                                value: level.id,
                                label: `${level.name} (Depth: ${level.depth})`,
                            }))}
                            value={formData.org_level_id}
                            onChange={(value: string) =>
                                onFormDataChange({
                                    ...formData,
                                    org_level_id: value,
                                })
                            }
                            placeholder={t('Select a level...')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="unit-parent">
                            Parent Unit (Optional)
                        </Label>
                        <Select
                            value={
                                formData.parent_id === ''
                                    ? 'none'
                                    : formData.parent_id
                            }
                            onValueChange={(value) =>
                                onFormDataChange({
                                    ...formData,
                                    parent_id: value === 'none' ? '' : value,
                                })
                            }
                        >
                            <SelectTrigger id="unit-parent">
                                <SelectValue
                                    placeholder={t(
                                        'Select parent unit (None for root)',
                                    )}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    None (Root Level)
                                </SelectItem>
                                {flatUnits.map((u) => (
                                    <SelectItem
                                        key={u.id}
                                        value={u.id}
                                        disabled={editingUnit?.id === u.id}
                                    >
                                        <span className="text-muted-foreground mr-1 font-mono text-xs whitespace-pre">
                                            {renderIndent(u.depth)}
                                        </span>
                                        {u.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="max_workspaces">
                            {t('Max Workspaces Quota')}
                        </Label>
                        <Input
                            id="max_workspaces"
                            type="number"
                            min="0"
                            value={formData.max_workspaces}
                            onChange={(e) =>
                                onFormDataChange({
                                    ...formData,
                                    max_workspaces: Math.max(
                                        0,
                                        parseInt(e.target.value) || 0,
                                    ),
                                })
                            }
                            placeholder="0"
                        />
                        <p className="text-muted-foreground text-xs">
                            {t(
                                'Jumlah maksimum workspace yang dapat dibuat oleh unit ini (0 = tidak diizinkan membuat workspace).',
                            )}
                        </p>
                    </div>

                    <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>{t('Active Status')}</Label>
                                <p className="text-muted-foreground text-sm">
                                    {t('Is this unit currently active?')}
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
                            {editingUnit ? 'Save Changes' : 'Create Unit'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
