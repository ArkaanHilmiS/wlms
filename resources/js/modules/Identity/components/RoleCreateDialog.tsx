import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useCreateRole } from '../hooks/use-roles';
import { toast } from 'sonner';
import { useTranslate } from '@/hooks/useTranslate';

type RoleScope = 'GLOBAL' | 'WORKSPACE' | 'PROJECT';

export function RoleCreateDialog() {
    const { t } = useTranslate();
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');
    const [scope, setScope] = useState<RoleScope>('GLOBAL');

    const createRole = useCreateRole();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createRole.mutateAsync({ name, scope });
            toast.success(t('Role created successfully'));
            setIsOpen(false);
            setName('');
            setScope('GLOBAL');
        } catch (error) {
            toast.error(t('Failed to create role'));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 text-white hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" /> {t('Create Role')}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('Create New Role')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('Role Name')}</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Developer"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="scope">{t('Scope')}</Label>
                        <select
                            id="scope"
                            value={scope}
                            onChange={(e) =>
                                setScope(e.target.value as RoleScope)
                            }
                            className="border-input bg-background flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm"
                        >
                            <option value="GLOBAL">{t('Global')}</option>
                            <option value="WORKSPACE">{t('Workspace')}</option>
                            <option value="PROJECT">{t('Project')}</option>
                        </select>
                    </div>
                    <Button
                        type="submit"
                        disabled={createRole.isPending}
                        className="w-full"
                    >
                        {createRole.isPending ? 'Creating...' : 'Save Role'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
