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
import { useCreateUser } from '../../hooks/use-users';
import { toast } from 'sonner';
import { useTranslate } from '@/hooks/useTranslate';

export function UserCreateDialog() {
    const { t } = useTranslate();
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const createUser = useCreateUser();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createUser.mutateAsync({
                name,
                email,
                password: password || undefined,
            });
            toast.success(t('User created successfully'));
            setIsOpen(false);
            setName('');
            setEmail('');
            setPassword('');
        } catch (error) {
            toast.error(t('Failed to create user'));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 text-white hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" /> {t('Create User')}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('Create New User')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('Name')}</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. John Doe"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">{t('Email')}</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. john@example.com"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password (optional)</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('Leave blank for no password')}
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={createUser.isPending}
                        className="w-full"
                    >
                        {createUser.isPending ? 'Creating...' : 'Save User'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
