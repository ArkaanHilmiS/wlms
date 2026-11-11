import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
    Download,
    File,
    FileArchive,
    FileImage,
    FileText,
    Loader2,
    Paperclip,
    Trash2,
    UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslate } from '@/hooks/useTranslate';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { usePage } from '@inertiajs/react';
import { SharedData } from '@/types';
import { usePermission } from '@/hooks/usePermission';

export interface Attachment {
    id: string;
    issue_id: string;
    comment_id?: string | null;
    filename: string;
    file_size: number;
    mime_type: string;
    created_at: string;
    uploader_name: string;
    uploader_id: number;
    download_url: string;
}

interface IssueAttachmentSectionProps {
    issueId: string;
}

export const IssueAttachmentSection: React.FC<IssueAttachmentSectionProps> = ({
    issueId,
}) => {
    const { t } = useTranslate();
    const { auth } = usePage<SharedData>().props;
    const { hasRole } = usePermission();
    const currentUserId = auth.user?.id;

    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const fetchAttachments = async () => {
        try {
            setIsLoading(true);
            const { data } = await axios.get(
                `/api/issues/${issueId}/attachments`,
            );
            setAttachments(data.data || []);
        } catch {
            // failed to load attachments
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (issueId) {
            fetchAttachments();
        }
    }, [issueId]);

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const getFileIcon = (mimeType: string, filename: string) => {
        if (
            mimeType.startsWith('image/') ||
            /\.(png|jpe?g|gif|webp|svg)$/i.test(filename)
        ) {
            return <FileImage className="h-5 w-5 shrink-0 text-emerald-500" />;
        }
        if (
            mimeType.includes('pdf') ||
            mimeType.includes('word') ||
            mimeType.includes('text') ||
            /\.(pdf|docx?|txt|md)$/i.test(filename)
        ) {
            return <FileText className="h-5 w-5 shrink-0 text-blue-500" />;
        }
        if (
            mimeType.includes('zip') ||
            mimeType.includes('tar') ||
            mimeType.includes('compressed') ||
            /\.(zip|gz|tar|rar|7z)$/i.test(filename)
        ) {
            return <FileArchive className="h-5 w-5 shrink-0 text-amber-500" />;
        }
        return <File className="text-muted-foreground h-5 w-5 shrink-0" />;
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 5MB limit check (5 * 1024 * 1024 = 5,242,880 bytes)
        if (file.size > 5 * 1024 * 1024) {
            toast.error(
                t(
                    'File size exceeds the 5 MB limit. Please select a smaller file.',
                ),
            );
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', file);

            const { data } = await axios.post(
                `/api/issues/${issueId}/attachments`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } },
            );

            toast.success(t('Attachment uploaded successfully.'));
            setAttachments((prev) => [data.data, ...prev]);
        } catch (err: any) {
            const message =
                err.response?.data?.message ||
                t('Failed to upload attachment.');
            toast.error(message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (id: string) => {
        try {
            setDeletingId(id);
            await axios.delete(`/api/attachments/${id}`);
            setAttachments((prev) => prev.filter((a) => a.id !== id));
            toast.success(t('Attachment deleted.'));
        } catch (err: any) {
            toast.error(
                err.response?.data?.message ||
                    t('Failed to delete attachment.'),
            );
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-4 pt-2">
            {/* Upload Area */}
            <div className="border-border/80 bg-muted/20 hover:bg-muted/40 relative flex flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition-colors">
                <UploadCloud className="text-muted-foreground mb-2 h-8 w-8" />
                <p className="text-foreground text-sm font-medium">
                    {t('Click or drag file to attach')}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                    {t(
                        'Supported files up to 5 MB per attachment (Private Storage)',
                    )}
                </p>
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                    className="absolute inset-0 cursor-pointer opacity-0"
                />
                {isUploading && (
                    <div className="bg-background/80 absolute inset-0 flex items-center justify-center gap-2 rounded-xl backdrop-blur-xs">
                        <Loader2 className="text-primary h-5 w-5 animate-spin" />
                        <span className="text-xs font-medium">
                            {t('Uploading attachment...')}
                        </span>
                    </div>
                )}
            </div>

            {/* Attachments List */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
                        <Paperclip className="h-3.5 w-3.5" />
                        <span>
                            {t('Attachments')} ({attachments.length})
                        </span>
                    </h4>
                </div>

                {isLoading ? (
                    <div className="text-muted-foreground py-6 text-center text-xs">
                        {t('Loading attachments...')}
                    </div>
                ) : attachments.length === 0 ? (
                    <div className="text-muted-foreground bg-muted/10 rounded-lg border border-dashed py-6 text-center text-xs">
                        {t('No attachments uploaded yet.')}
                    </div>
                ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                        {attachments.map((item) => {
                            const canDelete =
                                Number(currentUserId) ===
                                    Number(item.uploader_id) ||
                                hasRole('superadmin') ||
                                hasRole('workspace admin');

                            return (
                                <div
                                    key={item.id}
                                    className="bg-card hover:bg-accent/40 group flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors"
                                >
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        {getFileIcon(
                                            item.mime_type,
                                            item.filename,
                                        )}
                                        <div className="min-w-0">
                                            <p
                                                className="text-foreground truncate text-xs font-medium"
                                                title={item.filename}
                                            >
                                                {item.filename}
                                            </p>
                                            <p className="text-muted-foreground text-[11px]">
                                                {formatBytes(item.file_size)} •{' '}
                                                {item.uploader_name}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-1">
                                        <a
                                            href={item.download_url}
                                            download={item.filename}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0"
                                                title={t('Download file')}
                                            >
                                                <Download className="text-muted-foreground hover:text-foreground h-3.5 w-3.5" />
                                            </Button>
                                        </a>

                                        {canDelete && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={
                                                            deletingId ===
                                                            item.id
                                                        }
                                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 w-7 p-0"
                                                        title={t(
                                                            'Delete attachment',
                                                        )}
                                                    >
                                                        {deletingId ===
                                                        item.id ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        )}
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>
                                                            {t(
                                                                'Delete attachment',
                                                            )}
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            {t(
                                                                'Are you sure you want to delete this attachment?',
                                                            )}{' '}
                                                            (
                                                            <span className="text-foreground font-medium">
                                                                {item.filename}
                                                            </span>
                                                            )
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>
                                                            {t('Cancel')}
                                                        </AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() =>
                                                                handleDelete(
                                                                    item.id,
                                                                )
                                                            }
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        >
                                                            {t('Delete')}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
