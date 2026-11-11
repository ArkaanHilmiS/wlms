import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreateSprintForm, CreateSprintFormData } from './CreateSprintForm';
import { useCreateSprint } from '@/hooks/sprints/use-create-sprint';
import { toast } from 'sonner';

interface CreateSprintDialogProps {
    children?: React.ReactNode;
    defaultProjectId?: string;
}

export function CreateSprintDialog({
    children,
    defaultProjectId,
}: CreateSprintDialogProps) {
    const [open, setOpen] = useState(false);
    const createSprintMutation = useCreateSprint();

    const handleSubmit = (data: CreateSprintFormData) => {
        createSprintMutation.mutate(data, {
            onSuccess: () => {
                toast.success('Sprint created successfully');
                setOpen(false);
            },
            onError: (error) => {
                toast.error('Failed to create sprint');
                console.error(error);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || <Button>Create Sprint</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Sprint</DialogTitle>
                    <DialogDescription>
                        Plan a new sprint for your project. Click save when
                        you're done.
                    </DialogDescription>
                </DialogHeader>
                <CreateSprintForm
                    onSubmit={handleSubmit}
                    isLoading={createSprintMutation.isPending}
                    defaultProjectId={defaultProjectId}
                />
            </DialogContent>
        </Dialog>
    );
}
