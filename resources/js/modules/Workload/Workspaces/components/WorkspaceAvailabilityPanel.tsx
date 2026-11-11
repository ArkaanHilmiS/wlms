import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslate } from '@/hooks/useTranslate';
import { Workspace } from '../types';
import { useWorkspaceAvailability } from '../hooks/useWorkspaceAvailability';

interface WorkspaceAvailabilityPanelProps {
    workspaces: Workspace[];
}

const ROLE_LABEL_KEYS: Record<string, string> = {
    admin: 'Admin',
    member: 'Member',
    viewer: 'Viewer',
};

const formatHours = (value: number): string =>
    Number.isInteger(value) ? String(value) : value.toFixed(1);

/**
 * Rekap jam tersedia tiap anggota per ruang kerja. Ditampilkan di atas daftar
 * ruang kerja supaya beban orang terlihat sebelum tugas ditugaskan.
 */
export function WorkspaceAvailabilityPanel({
    workspaces,
}: WorkspaceAvailabilityPanelProps) {
    const { t } = useTranslate();
    const [collapsed, setCollapsed] = useState(false);

    const activeWorkspaces = workspaces.filter(
        (ws) => ws.status !== 'ARCHIVED',
    );
    const results = useWorkspaceAvailability(
        activeWorkspaces.map((ws) => ws.id),
    );

    if (activeWorkspaces.length === 0) {
        return null;
    }

    const isLoading = results.some((r) => r.isLoading);
    const unit = t('hrs');

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Clock className="h-4 w-4" />
                        {t('Member Availability')}
                    </CardTitle>
                    <CardDescription>
                        {t(
                            'Available hours per person this week, so you can plan before assigning tasks.',
                        )}
                    </CardDescription>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0"
                    onClick={() => setCollapsed((v) => !v)}
                    aria-expanded={!collapsed}
                >
                    {collapsed ? (
                        <>
                            <ChevronDown className="mr-1 h-4 w-4" />
                            {t('Show')}
                        </>
                    ) : (
                        <>
                            <ChevronUp className="mr-1 h-4 w-4" />
                            {t('Hide')}
                        </>
                    )}
                </Button>
            </CardHeader>

            {!collapsed && (
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="space-y-2 p-6">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-8 w-full" />
                            ))}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Member')}</TableHead>
                                    <TableHead>{t('Workspace')}</TableHead>
                                    <TableHead>{t('Role')}</TableHead>
                                    <TableHead className="text-right">
                                        {t('Capacity / day')}
                                    </TableHead>
                                    <TableHead className="text-right">
                                        {t('Capacity / week')}
                                    </TableHead>
                                    <TableHead className="text-right">
                                        {t('Allocated')}
                                    </TableHead>
                                    <TableHead className="text-right">
                                        {t('Available')}
                                    </TableHead>
                                    <TableHead className="text-right">
                                        {t('Open tasks')}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeWorkspaces.map((ws, index) => {
                                    const result = results[index];
                                    const members = result?.data ?? [];

                                    if (result?.isError) {
                                        return (
                                            <TableRow key={ws.id}>
                                                <TableCell
                                                    colSpan={8}
                                                    className="text-destructive text-sm"
                                                >
                                                    {ws.name}:{' '}
                                                    {t(
                                                        'Failed to load availability.',
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }

                                    if (members.length === 0) {
                                        return (
                                            <TableRow key={ws.id}>
                                                <TableCell
                                                    colSpan={8}
                                                    className="text-muted-foreground text-sm"
                                                >
                                                    {ws.name}:{' '}
                                                    {t(
                                                        'No members in this workspace yet.',
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }

                                    return members.map((m) => {
                                        const overloaded =
                                            m.available_hours <= 0;
                                        const roleKey =
                                            ROLE_LABEL_KEYS[
                                                m.role.toLowerCase()
                                            ];
                                        return (
                                            <TableRow
                                                key={`${ws.id}-${m.user_id}`}
                                            >
                                                <TableCell>
                                                    <div className="font-medium">
                                                        {m.name}
                                                    </div>
                                                    <div className="text-muted-foreground text-xs">
                                                        {m.email}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {ws.name}
                                                </TableCell>
                                                <TableCell className="text-sm capitalize">
                                                    {roleKey
                                                        ? t(roleKey)
                                                        : m.role}
                                                </TableCell>
                                                <TableCell className="text-right text-sm tabular-nums">
                                                    {formatHours(
                                                        m.daily_capacity_hours,
                                                    )}{' '}
                                                    {unit}
                                                </TableCell>
                                                <TableCell className="text-right text-sm tabular-nums">
                                                    {formatHours(
                                                        m.weekly_capacity_hours,
                                                    )}{' '}
                                                    {unit}
                                                </TableCell>
                                                <TableCell className="text-right text-sm tabular-nums">
                                                    {formatHours(
                                                        m.allocated_hours,
                                                    )}{' '}
                                                    {unit}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge
                                                        variant={
                                                            overloaded
                                                                ? 'destructive'
                                                                : 'secondary'
                                                        }
                                                        className="tabular-nums"
                                                        title={
                                                            overloaded
                                                                ? t(
                                                                      'Overloaded',
                                                                  )
                                                                : undefined
                                                        }
                                                    >
                                                        {formatHours(
                                                            m.available_hours,
                                                        )}{' '}
                                                        {unit}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right text-sm tabular-nums">
                                                    {m.open_task_count}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    });
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
