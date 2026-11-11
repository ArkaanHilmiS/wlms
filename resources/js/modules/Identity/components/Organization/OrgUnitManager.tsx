import React, { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { isAxiosError } from 'axios';
import type { AxiosError } from 'axios';
import {
    useOrgUnits,
    useCreateOrgUnit,
    useUpdateOrgUnit,
    useDeleteOrgUnit,
    OrgUnit,
} from '../../hooks/use-org-units';
import { useOrgLevels } from '../../hooks/use-org-levels';
import { OrgUnitTree } from './OrgUnitTree';
import { OrgUnitFormDialog, OrgUnitFormData } from './OrgUnitFormDialog';
import { toast } from 'sonner';
import { useTranslate } from '@/hooks/useTranslate';

const DEFAULT_FORM_DATA: OrgUnitFormData = {
    name: '',
    code: '',
    parent_id: '',
    org_level_id: '',
    is_active: true,
    max_workspaces: 0,
};

const flattenUnits = (
    unitList: OrgUnit[],
    depth = 0,
): Array<{ id: string; name: string; depth: number }> => {
    let result: Array<{ id: string; name: string; depth: number }> = [];
    unitList.forEach((u) => {
        result.push({ id: u.id, name: u.name, depth });
        if (u.children && u.children.length > 0) {
            result = [...result, ...flattenUnits(u.children, depth + 1)];
        }
    });
    return result;
};

const handleAxiosError = (
    error: Error | AxiosError,
    fallback: string,
): void => {
    if (isAxiosError(error)) {
        toast.error(
            (error.response?.data as { message?: string })?.message ?? fallback,
        );
    } else {
        toast.error(error.message || fallback);
    }
};

interface OrgUnitManagerProps {
    createTrigger?: number;
}

export function OrgUnitManager({ createTrigger = 0 }: OrgUnitManagerProps) {
    const { t } = useTranslate();
    const { data: units = [], isLoading: isLoadingUnits } = useOrgUnits();
    const { data: levels = [], isLoading: isLoadingLevels } = useOrgLevels();
    const createUnit = useCreateOrgUnit();
    const updateUnit = useUpdateOrgUnit();
    const deleteUnit = useDeleteOrgUnit();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<OrgUnit | null>(null);
    const [formData, setFormData] =
        useState<OrgUnitFormData>(DEFAULT_FORM_DATA);

    const openCreateDialog = () => {
        setEditingUnit(null);
        setFormData({ ...DEFAULT_FORM_DATA });
        setIsDialogOpen(true);
    };

    useEffect(() => {
        if (createTrigger > 0) {
            openCreateDialog();
        }
    }, [createTrigger]);

    const openEditDialog = (unit: OrgUnit) => {
        setEditingUnit(unit);
        setFormData({
            name: unit.name,
            code: unit.code,
            parent_id: unit.parent_id ?? '',
            org_level_id: unit.org_level_id,
            is_active: unit.is_active,
            max_workspaces: unit.max_workspaces ?? 0,
        });
        setIsDialogOpen(true);
    };

    const handleDelete = (unit: OrgUnit) => {
        deleteUnit.mutate(unit.id, {
            onSuccess: () => toast.success(t('Organization unit deleted')),
            onError: (error: Error | AxiosError) =>
                handleAxiosError(error, 'Failed to delete unit'),
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            name: formData.name,
            code: formData.code,
            org_level_id: formData.org_level_id,
            parent_id: formData.parent_id || null,
            is_active: formData.is_active,
            max_workspaces: formData.max_workspaces,
        };

        if (editingUnit) {
            updateUnit.mutate(
                { id: editingUnit.id, ...payload },
                {
                    onSuccess: () => {
                        toast.success(t('Organization unit updated'));
                        setIsDialogOpen(false);
                    },
                    onError: (error: Error | AxiosError) =>
                        handleAxiosError(error, 'Failed to update unit'),
                },
            );
        } else {
            createUnit.mutate(payload, {
                onSuccess: () => {
                    toast.success(t('Organization unit created'));
                    setIsDialogOpen(false);
                },
                onError: (error: Error | AxiosError) =>
                    handleAxiosError(error, 'Failed to create unit'),
            });
        }
    };

    const flatUnits = flattenUnits(units.filter((u) => !u.parent_id));
    const isPending =
        createUnit.isPending || updateUnit.isPending || isLoadingLevels;

    return (
        <div className="space-y-4">
            {isLoadingUnits ? (
                <div className="flex h-32 items-center justify-center rounded-md border">
                    <span className="text-muted-foreground text-sm">
                        {t('Loading units...')}
                    </span>
                </div>
            ) : (
                <OrgUnitTree
                    units={units}
                    onEdit={openEditDialog}
                    onDelete={handleDelete}
                />
            )}

            <OrgUnitFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                editingUnit={editingUnit}
                levels={levels}
                flatUnits={flatUnits}
                isPending={isPending}
                formData={formData}
                onFormDataChange={setFormData}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
