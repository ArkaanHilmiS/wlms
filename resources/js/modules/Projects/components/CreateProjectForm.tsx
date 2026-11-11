import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface CreateProjectFormData {
    workspace_id: string;
    key: string;
    name: string;
    description: string;
    lead_id: string;
}

interface CreateProjectFormProps {
    onSubmit: (data: CreateProjectFormData) => void;
    isLoading?: boolean;
    defaultWorkspaceId?: string;
}

export function CreateProjectForm({
    onSubmit,
    isLoading,
    defaultWorkspaceId = '',
}: CreateProjectFormProps) {
    const [formData, setFormData] = useState<CreateProjectFormData>({
        workspace_id: defaultWorkspaceId,
        key: '',
        name: '',
        description: '',
        lead_id: '',
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="workspace_id">Workspace ID</Label>
                <Input
                    id="workspace_id"
                    name="workspace_id"
                    value={formData.workspace_id}
                    onChange={handleChange}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="key">Project Key</Label>
                <Input
                    id="key"
                    name="key"
                    value={formData.key}
                    onChange={handleChange}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="lead_id">Lead ID (Optional)</Label>
                <Input
                    id="lead_id"
                    name="lead_id"
                    value={formData.lead_id}
                    onChange={handleChange}
                />
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Project'}
                </Button>
            </div>
        </form>
    );
}
