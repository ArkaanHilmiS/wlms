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
import { CreateProjectForm, CreateProjectFormData } from './CreateProjectForm';
import { useCreateProject } from '@/hooks/projects/use-create-project';
import { toast } from 'sonner';

interface CreateProjectDialogProps {
    children?: React.ReactNode;
    defaultWorkspaceId?: string;
}

export function CreateProjectDialog({
    children,
    defaultWorkspaceId,
}: CreateProjectDialogProps) {
    const [open, setOpen] = useState(false);
    const createProjectMutation = useCreateProject();

    const handleSubmit = (data: CreateProjectFormData) => {
        createProjectMutation.mutate(data, {
            onSuccess: () => {
                toast.success('Project created successfully');
                setOpen(false);
            },
            onError: (error) => {
                toast.error('Failed to create project');
                console.error(error);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || <Button>Create Project</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Project</DialogTitle>
                    <DialogDescription>
                        Add a new project to your workspace. Click save when
                        you're done.
                    </DialogDescription>
                </DialogHeader>
                <CreateProjectForm
                    onSubmit={handleSubmit}
                    isLoading={createProjectMutation.isPending}
                    defaultWorkspaceId={defaultWorkspaceId}
                />
            </DialogContent>
        </Dialog>
    );
}
