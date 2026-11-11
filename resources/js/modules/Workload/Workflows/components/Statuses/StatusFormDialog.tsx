import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { Status, CreateStatusDto, UpdateStatusDto } from '../../types';
import { useTranslate } from '@/hooks/useTranslate';

interface StatusFormDialogProps {
    status?: Status | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (payload: CreateStatusDto | UpdateStatusDto) => void;
    isLoading?: boolean;
}

export function StatusFormDialog({
    status,
    open,
    onOpenChange,
    onSubmit,
    isLoading,
}: StatusFormDialogProps) {
    const { t } = useTranslate();
    const [name, setName] = useState('');
    const [category, setCategory] = useState('TODO');

    useEffect(() => {
        if (open) {
            setName(status?.name || '');
            setCategory(status?.category || 'TODO');
        }
    }, [open, status]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            name,
            slug: name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, ''),
            category,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {status ? 'Edit Status' : 'Create Status'}
                    </DialogTitle>
                    <DialogDescription>
                        {status
                            ? 'Make changes to the status here.'
                            : 'Add a new status to your workspace.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('Name')}</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. In Progress"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category">{t('Category')}</Label>
                        <select
                            id="category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="TODO">{t('To Do')}</option>
                            <option value="IN_PROGRESS">
                                {t('In Progress')}
                            </option>
                            <option value="DONE">{t('Done')}</option>
                        </select>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !name.trim()}
                        >
                            {isLoading ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
