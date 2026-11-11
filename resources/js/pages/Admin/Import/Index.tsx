import { FormEvent, useEffect, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    FileSpreadsheet,
    FileText,
    FolderKanban,
    ListTodo,
    Loader2,
    RefreshCw,
    XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslate } from '@/hooks/useTranslate';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useGetWorkspaces } from '@/modules/Workload/Workspaces/hooks/useWorkspaces';
import { Workspace } from '@/modules/Workload/Workspaces/types';

interface ImportLog {
    id: string;
    filename: string;
    type: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    total_rows: number;
    success_count: number;
    skipped_count: number;
    errors: string[];
    created_at: string;
    user_name: string;
}

interface ImportIndexProps {
    importLogs?: ImportLog[];
}

export default function ImportIndex({ importLogs = [] }: ImportIndexProps) {
    const { t } = useTranslate();
    const { data: workspaces = [], isLoading: isLoadingWorkspaces } =
        useGetWorkspaces();

    const [selectedErrorLog, setSelectedErrorLog] = useState<ImportLog | null>(
        null,
    );
    const [isRefreshing, setIsRefreshing] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm<{
        type: 'projects' | 'issues';
        workspace_id: string;
        file: File | null;
    }>({
        type: 'projects',
        workspace_id: '',
        file: null,
    });

    // Auto-poll if any log is currently pending or processing
    const hasActiveImports = importLogs.some(
        (log) => log.status === 'PENDING' || log.status === 'PROCESSING',
    );

    useEffect(() => {
        if (!hasActiveImports) return;

        const interval = setInterval(() => {
            router.reload({ only: ['importLogs'] });
        }, 3000);

        return () => clearInterval(interval);
    }, [hasActiveImports]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            only: ['importLogs'],
            onFinish: () => setIsRefreshing(false),
        });
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/admin/import-workload', {
            forceFormData: true,
            onSuccess: (page: any) => {
                if (page.props.flash?.success) {
                    toast.success(page.props.flash.success);
                }
                reset('file');
                router.reload({ only: ['importLogs'] });
            },
            onError: () => {
                toast.error(t('Failed to import data'));
            },
        });
    };

    const renderStatusBadge = (status: ImportLog['status']) => {
        switch (status) {
            case 'PENDING':
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    >
                        <Clock className="h-3 w-3" />
                        {t('Pending')}
                    </Badge>
                );
            case 'PROCESSING':
                return (
                    <Badge
                        variant="secondary"
                        className="animate-pulse gap-1 border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    >
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {t('Processing')}
                    </Badge>
                );
            case 'COMPLETED':
                return (
                    <Badge
                        variant="secondary"
                        className="gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    >
                        <CheckCircle2 className="h-3 w-3" />
                        {t('Completed')}
                    </Badge>
                );
            case 'FAILED':
                return (
                    <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        {t('Failed')}
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <>
            <Head title={t('Import Workload')} />
            <div className="max-w-5xl space-y-8">
                {/* Upload Form Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">
                            {t('Import Workload Data')}
                        </CardTitle>
                        <CardDescription>
                            {t(
                                'Upload .csv or .xlsx file to import Projects or Tasks in background.',
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-6">
                            <div className="space-y-3">
                                <Label>{t('Import Type')}</Label>
                                <Select
                                    value={data.type}
                                    onValueChange={(
                                        val: 'projects' | 'issues',
                                    ) => {
                                        setData('type', val);
                                        if (val !== 'projects') {
                                            setData('workspace_id', '');
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={t(
                                                'Select import type',
                                            )}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="projects">
                                            {t('Projects')}
                                        </SelectItem>
                                        <SelectItem value="issues">
                                            {t('Tasks (Issues)')}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.type && (
                                    <p className="text-destructive text-sm">
                                        {errors.type}
                                    </p>
                                )}
                            </div>

                            {data.type === 'projects' && (
                                <div className="space-y-3">
                                    <Label>{t('Target Workspace')}</Label>
                                    <Select
                                        value={data.workspace_id}
                                        onValueChange={(val) =>
                                            setData('workspace_id', val)
                                        }
                                        disabled={isLoadingWorkspaces}
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                placeholder={t(
                                                    'Select a workspace',
                                                )}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {workspaces.map(
                                                (workspace: Workspace) => (
                                                    <SelectItem
                                                        key={workspace.id}
                                                        value={workspace.id.toString()}
                                                    >
                                                        {workspace.name}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {errors.workspace_id && (
                                        <p className="text-destructive text-sm">
                                            {errors.workspace_id}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="space-y-3">
                                <Label>{t('File (.csv, .xlsx)')}</Label>
                                <Input
                                    type="file"
                                    accept=".csv, .xlsx"
                                    onChange={(e) =>
                                        setData(
                                            'file',
                                            e.target.files
                                                ? e.target.files[0]
                                                : null,
                                        )
                                    }
                                />
                                {errors.file && (
                                    <p className="text-destructive text-sm">
                                        {errors.file}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={
                                    processing ||
                                    !data.file ||
                                    (data.type === 'projects' &&
                                        !data.workspace_id)
                                }
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('Importing...')}
                                    </>
                                ) : (
                                    t('Import Data')
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Import Observability & History Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">
                                {t('Import History & Observability')}
                            </CardTitle>
                            <CardDescription>
                                {t(
                                    'Real-time ingestion metrics, row counts, and error tracking.',
                                )}
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                        >
                            <RefreshCw
                                className={`h-3.5 w-3.5 ${
                                    isRefreshing ? 'animate-spin' : ''
                                }`}
                            />
                            <span>{t('Refresh')}</span>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        {importLogs.length === 0 ? (
                            <div className="text-muted-foreground p-8 text-center text-sm">
                                {t('No import history recorded yet.')}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead className="w-[200px]">
                                                {t('File')}
                                            </TableHead>
                                            <TableHead>{t('Type')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead className="text-center">
                                                {t('Processed')}
                                            </TableHead>
                                            <TableHead className="text-center">
                                                {t('Skipped')}
                                            </TableHead>
                                            <TableHead>
                                                {t('Uploader')}
                                            </TableHead>
                                            <TableHead className="text-right">
                                                {t('Time')}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {importLogs.map((log) => {
                                            const hasErrors =
                                                Array.isArray(log.errors) &&
                                                log.errors.length > 0;

                                            return (
                                                <TableRow key={log.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {log.filename.endsWith(
                                                                '.csv',
                                                            ) ? (
                                                                <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                                                            ) : (
                                                                <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600" />
                                                            )}
                                                            <span
                                                                className="max-w-[180px] truncate"
                                                                title={
                                                                    log.filename
                                                                }
                                                            >
                                                                {log.filename}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="flex items-center gap-1.5 text-xs">
                                                            {log.type ===
                                                            'projects' ? (
                                                                <>
                                                                    <FolderKanban className="text-muted-foreground h-3.5 w-3.5" />
                                                                    {t(
                                                                        'Projects',
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <ListTodo className="text-muted-foreground h-3.5 w-3.5" />
                                                                    {t('Tasks')}
                                                                </>
                                                            )}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {renderStatusBadge(
                                                            log.status,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono text-xs">
                                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                            {log.success_count}
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            {' '}
                                                            / {log.total_rows}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono text-xs">
                                                        {log.skipped_count >
                                                        0 ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    setSelectedErrorLog(
                                                                        log,
                                                                    )
                                                                }
                                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 px-2 text-xs font-semibold"
                                                            >
                                                                <AlertCircle className="mr-1 h-3.5 w-3.5" />
                                                                {
                                                                    log.skipped_count
                                                                }{' '}
                                                                {t('errors')}
                                                            </Button>
                                                        ) : (
                                                            <span className="text-muted-foreground">
                                                                0
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-xs">
                                                        {log.user_name}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-right font-mono text-xs">
                                                        {log.created_at
                                                            ? new Date(
                                                                  log.created_at,
                                                              ).toLocaleString()
                                                            : '-'}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Error Details Modal */}
                <Dialog
                    open={!!selectedErrorLog}
                    onOpenChange={(open) => {
                        if (!open) setSelectedErrorLog(null);
                    }}
                >
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-destructive flex items-center gap-2 text-base">
                                <AlertCircle className="h-5 w-5" />
                                {t('Import Errors & Skipped Rows')}
                            </DialogTitle>
                            <DialogDescription>
                                {selectedErrorLog?.filename} •{' '}
                                {selectedErrorLog?.skipped_count}{' '}
                                {t('rows skipped')}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="bg-muted/50 max-h-72 space-y-2 overflow-y-auto rounded-lg border p-3 font-mono text-xs">
                            {selectedErrorLog?.errors?.map((err, idx) => (
                                <div
                                    key={idx}
                                    className="border-destructive/20 text-destructive border-l-2 pl-2"
                                >
                                    {err}
                                </div>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

ImportIndex.layout = {
    breadcrumbs: [{ title: 'Import Workload', href: '/admin/import-workload' }],
};
