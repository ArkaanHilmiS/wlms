import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface CreateSprintFormData {
    project_id: string;
    name: string;
    goal: string;
}

interface CreateSprintFormProps {
    onSubmit: (data: CreateSprintFormData) => void;
    isLoading?: boolean;
    defaultProjectId?: string;
}

export function CreateSprintForm({
    onSubmit,
    isLoading,
    defaultProjectId = '',
}: CreateSprintFormProps) {
    const [formData, setFormData] = useState<CreateSprintFormData>({
        project_id: defaultProjectId,
        name: '',
        goal: '',
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
                <Label htmlFor="project_id">Project ID</Label>
                <Input
                    id="project_id"
                    name="project_id"
                    value={formData.project_id}
                    onChange={handleChange}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="name">Sprint Name</Label>
                <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="goal">Goal (Optional)</Label>
                <Input
                    id="goal"
                    name="goal"
                    value={formData.goal}
                    onChange={handleChange}
                />
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Sprint'}
                </Button>
            </div>
        </form>
    );
}
