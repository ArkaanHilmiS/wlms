import React, { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { isAxiosError } from 'axios';
import type { AxiosError } from 'axios';
import {
    useOrgLevels,
    useCreateOrgLevel,
    useUpdateOrgLevel,
    useDeleteOrgLevel,
    OrgLevel,
} from '../../hooks/use-org-levels';
import { OrgLevelList } from './OrgLevelList';
import { OrgLevelFormDialog, OrgLevelFormData } from './OrgLevelFormDialog';
import { toast } from 'sonner';
import { useTranslate } from '@/hooks/useTranslate';

const DEFAULT_FORM_DATA: OrgLevelFormData = {
    name: '',
    slug: '',
    depth: 0,
    is_leaf: false,
    can_own_workspace: false,
    is_active: true,
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

interface OrgLevelManagerProps {
    createTrigger?: number;
}

export function OrgLevelManager({ createTrigger = 0 }: OrgLevelManagerProps) {
    const { t } = useTranslate();
    const { data: levels = [], isLoading } = useOrgLevels();
    const createLevel = useCreateOrgLevel();
    const updateLevel = useUpdateOrgLevel();
    const deleteLevel = useDeleteOrgLevel();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingLevel, setEditingLevel] = useState<OrgLevel | null>(null);
    const [formData, setFormData] =
        useState<OrgLevelFormData>(DEFAULT_FORM_DATA);

    const openCreateDialog = () => {
        setEditingLevel(null);
        setFormData({ ...DEFAULT_FORM_DATA, depth: levels.length + 1 });
        setIsDialogOpen(true);
    };

    useEffect(() => {
        if (createTrigger > 0) {
            openCreateDialog();
        }
    }, [createTrigger]);

    const openEditDialog = (level: OrgLevel) => {
        setEditingLevel(level);
        setFormData({
            name: level.name,
            slug: level.slug,
            depth: level.depth,
            is_leaf: level.is_leaf,
            can_own_workspace: level.can_own_workspace,
            is_active: level.is_active,
        });
        setIsDialogOpen(true);
    };

    const handleDelete = (level: OrgLevel) => {
        deleteLevel.mutate(level.id, {
            onSuccess: () => toast.success(t('Organization level deleted')),
            onError: (error: Error | AxiosError) =>
                handleAxiosError(error, 'Failed to delete level'),
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            ...formData,
            depth: Number(formData.depth),
        };

        if (editingLevel) {
            updateLevel.mutate(
                { id: editingLevel.id, ...payload },
                {
                    onSuccess: () => {
                        toast.success(t('Organization level updated'));
                        setIsDialogOpen(false);
                    },
                    onError: (error: Error | AxiosError) =>
                        handleAxiosError(error, 'Failed to update level'),
                },
            );
        } else {
            createLevel.mutate(payload, {
                onSuccess: () => {
                    toast.success(t('Organization level created'));
                    setIsDialogOpen(false);
                },
                onError: (error: Error | AxiosError) =>
                    handleAxiosError(error, 'Failed to create level'),
            });
        }
    };

    const isPending = createLevel.isPending || updateLevel.isPending;

    return (
        <div className="space-y-4">
            {isLoading ? (
                <div className="flex h-32 items-center justify-center rounded-md border">
                    <span className="text-muted-foreground text-sm">
                        {t('Loading levels...')}
                    </span>
                </div>
            ) : (
                <OrgLevelList
                    levels={levels}
                    onEdit={openEditDialog}
                    onDelete={handleDelete}
                />
            )}

            <OrgLevelFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                editingLevel={editingLevel}
                isPending={isPending}
                formData={formData}
                onFormDataChange={setFormData}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
