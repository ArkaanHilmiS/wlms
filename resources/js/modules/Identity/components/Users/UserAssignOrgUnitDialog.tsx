import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Building2 } from 'lucide-react';
import type { User } from '../../hooks/use-users';
import { useTranslate } from '@/hooks/useTranslate';

// Since OrgUnits might be loaded globally or passed from parent, let's assume we pass them
interface UserAssignOrgUnitDialogProps {
    user: User;
    orgUnits: { id: string; name: string }[];
    isSubmitting: boolean;
    onSubmit: (payload: {
        id: string;
        org_unit_id: string | null;
    }) => Promise<void>;
}

export function UserAssignOrgUnitDialog({
    user,
    orgUnits,
    isSubmitting,
    onSubmit,
}: UserAssignOrgUnitDialogProps) {
    const { t } = useTranslate();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState<string>(
        user.org_unit_id ?? '',
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await onSubmit({
                id: String(user.id),
                org_unit_id: selectedUnit || null,
            });
            setIsOpen(false);
        } catch (error) {
            // Error handling done by parent
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Building2 className="mr-2 h-4 w-4" />
                    {t('Assign Unit')}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {t('Assign Unit for')} {user.name}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="unit">
                            {t('Select Organization Unit')}
                        </Label>
                        <select
                            id="unit"
                            value={selectedUnit}
                            onChange={(e) => setSelectedUnit(e.target.value)}
                            className="border-input bg-background flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm"
                        >
                            <option value="">-- No Unit (Unassigned) --</option>
                            {orgUnits.map((unit) => (
                                <option key={unit.id} value={unit.id}>
                                    {unit.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full"
                    >
                        {isSubmitting ? 'Saving...' : 'Save Unit'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
