import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTranslate } from '@/hooks/useTranslate';

interface ArchiveWorkspaceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceName: string;
    onConfirm: () => void;
    isPending?: boolean;
}

export function ArchiveWorkspaceDialog({
    open,
    onOpenChange,
    workspaceName,
    onConfirm,
    isPending = false,
}: ArchiveWorkspaceDialogProps) {
    const { t } = useTranslate();
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {t('Are you absolutely sure?')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('This will archive the workspace')}{' '}
                        <strong>{workspaceName}</strong>.
                        {t(
                            'Archived workspaces become read-only and are hidden from active views.',
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>
                        {t('Cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                        }}
                        disabled={isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isPending ? t('Archiving...') : t('Archive')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
