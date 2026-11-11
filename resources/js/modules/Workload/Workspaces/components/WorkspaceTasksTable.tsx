import React, { useState, useMemo } from 'react';
import { useWorkspaceIssues } from '../hooks/useWorkspaceIssues';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
import {
    IssueFormDialog,
    SelectOption,
} from '@/modules/Workload/Issues/components/IssueFormDialog';
import {
    Plus,
    Search,
    Pencil,
    ChevronLeft,
    ChevronRight,
    User,
    FolderKanban,
    Download,
    FileSpreadsheet,
    FileText,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    CreateIssuePayload,
    UpdateIssuePayload,
} from '@/modules/Workload/Issues/hooks/useIssues';
import { Input } from '@/components/ui/input';
import { PriorityBadge } from '@/components/PriorityBadge';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import axios from '@/lib/axios';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslate } from '@/hooks/useTranslate';
import { usePermission } from '@/hooks/usePermission';
import { useIconSize } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { Project } from '@/modules/Workload/Projects/types';
import { Issue } from '@/types/issue';
import { Checkbox } from '@/components/ui/checkbox';
import { useBulkUpdateIssues } from '@/modules/Workload/Issues/hooks/useIssues';

interface WorkspaceTasksLookups {
    users?: SelectOption[];
    statuses?: SelectOption[];
    priorities?: SelectOption[];
    issueTypes?: SelectOption[];
    [key: string]: unknown;
}

interface WorkspaceTasksTableProps {
    workspaceId: string;
    projects: Project[];
    lookups?: WorkspaceTasksLookups;
    currentUserId?: string;
    canManageIssues?: boolean;
    initialAssigneeFilter?: string;
}

export const WorkspaceTasksTable: React.FC<WorkspaceTasksTableProps> = ({
    workspaceId,
    projects,
    lookups,
    currentUserId,
    canManageIssues,
    initialAssigneeFilter,
}) => {
    const { t } = useTranslate();
    const { can } = usePermission();
    const canCreateTask = canManageIssues ?? can('issues:manage');
    const { iconSize, updateIconSize } = useIconSize();
    const queryClient = useQueryClient();

    // Filters State
    const [selectedProject, setSelectedProject] = useState<string>('all');
    const [selectedAssignee, setSelectedAssignee] = useState<string>(
        initialAssigneeFilter || 'all',
    );
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Pagination State
    const [perPage, setPerPage] = useState<number>(10);
    const [currentPage, setCurrentPage] = useState<number>(1);

    // Form Modal State (Create & Edit)
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Bulk Update State
    const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
    const { mutateAsync: bulkUpdateIssues, isPending: isBulkUpdating } =
        useBulkUpdateIssues();

    // Export State & Handler
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (format: 'xlsx' | 'csv') => {
        setIsExporting(true);
        toast.info(t('Generating export...'));

        try {
            const params: Record<string, string> = {
                format,
            };

            if (selectedProject !== 'all') {
                params.project_id = selectedProject;
            }
            if (selectedAssignee !== 'all') {
                if (selectedAssignee === 'assigned_to_me' && currentUserId) {
                    params.assignee_id = currentUserId;
                } else {
                    params.assignee_id = selectedAssignee;
                }
            }
            if (statusFilter !== 'all') {
                params.status_category = statusFilter;
            }
            if (searchQuery.trim()) {
                params.search = searchQuery.trim();
            }

            const response = await axios.get(
                `/api/workspaces/${workspaceId}/issues/export`,
                {
                    params,
                    responseType: 'blob',
                },
            );

            const blob = new Blob([response.data], {
                type:
                    format === 'xlsx'
                        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        : 'text/csv',
            });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `tasks_${new Date().toISOString().slice(0, 10)}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            toast.success(t('Export downloaded successfully.'));
        } catch {
            toast.error(t('Failed to export data.'));
        } finally {
            setIsExporting(false);
        }
    };

    // Fetch All Workspace Issues
    const { data: issues = [], isLoading } = useWorkspaceIssues(workspaceId);

    // Available users / assignees
    const users: SelectOption[] = lookups?.users || [];
    const projectOptions: SelectOption[] = projects.map((p) => ({
        id: p.id,
        name: p.name,
    }));

    // Filter Logic
    const filteredIssues = useMemo(() => {
        return issues.filter((issue: Issue) => {
            // Project filter
            if (
                selectedProject !== 'all' &&
                String(issue.project_id) !== String(selectedProject)
            ) {
                return false;
            }

            // Assignee filter
            if (selectedAssignee === 'assigned_to_me') {
                if (String(issue.assignee_id) !== String(currentUserId))
                    return false;
            } else if (selectedAssignee === 'unassigned') {
                if (issue.assignee_id) return false;
            } else if (selectedAssignee !== 'all') {
                if (String(issue.assignee_id) !== String(selectedAssignee))
                    return false;
            }

            // Status category filter
            if (statusFilter !== 'all') {
                const category = issue.status?.category?.toUpperCase();
                if (category !== statusFilter) return false;
            }

            // Search query filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const titleMatch = issue.title?.toLowerCase().includes(query);
                const idMatch = issue.id?.toLowerCase().includes(query);
                if (!titleMatch && !idMatch) return false;
            }

            return true;
        });
    }, [
        issues,
        selectedProject,
        selectedAssignee,
        statusFilter,
        searchQuery,
        currentUserId,
    ]);

    // Pagination Calculations
    const totalItems = filteredIssues.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    const safeCurrentPage = Math.min(currentPage, totalPages);

    const paginatedIssues = useMemo(() => {
        const start = (safeCurrentPage - 1) * perPage;
        return filteredIssues.slice(start, start + perPage);
    }, [filteredIssues, safeCurrentPage, perPage]);

    // Reset pagination to page 1 on filter change
    const handleFilterChange = (setter: (val: string) => void, val: string) => {
        setter(val);
        setCurrentPage(1);
    };

    // Open Create Modal
    const handleOpenCreate = () => {
        setEditingIssue(null);
        setIsFormOpen(true);
    };

    // Open Edit Modal
    const handleOpenEdit = (issue: Issue) => {
        setEditingIssue(issue);
        setIsFormOpen(true);
    };

    // Handle Create or Update Submit
    const handleFormSubmit = async (
        payload: CreateIssuePayload | UpdateIssuePayload,
    ) => {
        setIsSubmitting(true);
        try {
            if (editingIssue) {
                // Update existing issue
                await axios.put(`/api/issues/${editingIssue.id}`, payload);
                toast.success(t('Task updated successfully'));
            } else {
                // Create new issue
                const createPayload = payload as CreateIssuePayload;
                const targetProjectId =
                    createPayload.project_id || projects[0]?.id;
                if (!targetProjectId) {
                    toast.error(t('Project is required'));
                    return;
                }
                await axios.post(
                    `/api/projects/${targetProjectId}/issues`,
                    createPayload,
                );
                toast.success(t('Task created successfully'));
            }

            queryClient.invalidateQueries({
                queryKey: ['workspaces', workspaceId, 'issues'],
            });
            setIsFormOpen(false);
            setEditingIssue(null);
        } catch (error: unknown) {
            const message =
                error && typeof error === 'object' && 'response' in error
                    ? (error as { response?: { data?: { message?: string } } })
                          .response?.data?.message
                    : undefined;
            toast.error(message || t('Failed to save task'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-card flex flex-col items-stretch justify-between gap-3 rounded-xl border p-4 shadow-xs lg:flex-row lg:items-center">
                <div className="flex flex-1 flex-wrap items-center gap-2">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-64">
                        <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                        <Input
                            type="search"
                            placeholder={t('Search task title or key...')}
                            className="h-9 pl-8 text-xs"
                            value={searchQuery}
                            onChange={(e) =>
                                handleFilterChange(
                                    setSearchQuery,
                                    e.target.value,
                                )
                            }
                        />
                    </div>

                    {/* Filter Project */}
                    <div className="w-full sm:w-48">
                        <Select
                            value={selectedProject}
                            onValueChange={(val) =>
                                handleFilterChange(setSelectedProject, val)
                            }
                        >
                            <SelectTrigger className="h-9 text-xs">
                                <div className="flex items-center gap-1.5 truncate">
                                    <FolderKanban className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                                    <SelectValue
                                        placeholder={t('All Projects')}
                                    />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    {t('All Projects')}
                                </SelectItem>
                                {projects.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Filter Assignee */}
                    <div className="w-full sm:w-48">
                        <Select
                            value={selectedAssignee}
                            onValueChange={(val) =>
                                handleFilterChange(setSelectedAssignee, val)
                            }
                        >
                            <SelectTrigger className="h-9 text-xs">
                                <div className="flex items-center gap-1.5 truncate">
                                    <User className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                                    <SelectValue
                                        placeholder={t('All Assignees')}
                                    />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    {t('All Assignees')}
                                </SelectItem>
                                {currentUserId && (
                                    <SelectItem value="assigned_to_me">
                                        {t('Assigned to Me')}
                                    </SelectItem>
                                )}
                                <SelectItem value="unassigned">
                                    {t('Unassigned')}
                                </SelectItem>
                                {users.map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                        {u.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Status Category Filter */}
                    <div className="w-full sm:w-36">
                        <Select
                            value={statusFilter}
                            onValueChange={(val) =>
                                handleFilterChange(setStatusFilter, val)
                            }
                        >
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder={t('All Statuses')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    {t('All Statuses')}
                                </SelectItem>
                                <SelectItem value="TODO">
                                    {t('To Do')}
                                </SelectItem>
                                <SelectItem value="IN_PROGRESS">
                                    {t('In Progress')}
                                </SelectItem>
                                <SelectItem value="DONE">
                                    {t('Done')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Density Selector & Create Task Button */}
                <div className="flex shrink-0 items-center justify-end gap-2">
                    <div className="bg-muted/60 flex items-center gap-1.5 rounded-lg border p-1">
                        <span className="text-muted-foreground hidden px-1 text-[11px] font-medium md:inline">
                            {t('Density')}:
                        </span>
                        <Button
                            variant={iconSize === 'sm' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-7 px-2.5 text-xs font-semibold"
                            onClick={() => updateIconSize('sm')}
                            title={t('Small density')}
                        >
                            S
                        </Button>
                        <Button
                            variant={iconSize === 'md' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-7 px-2.5 text-xs font-semibold"
                            onClick={() => updateIconSize('md')}
                            title={t('Medium density')}
                        >
                            M
                        </Button>
                        <Button
                            variant={iconSize === 'lg' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-7 px-2.5 text-xs font-semibold"
                            onClick={() => updateIconSize('lg')}
                            title={t('Large density')}
                        >
                            L
                        </Button>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 shrink-0 gap-1.5 text-xs"
                                disabled={isExporting}
                            >
                                <Download className="h-3.5 w-3.5" />
                                <span>
                                    {isExporting
                                        ? t('Exporting...')
                                        : t('Export')}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() => handleExport('xlsx')}
                                className="cursor-pointer gap-2 text-xs"
                            >
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                <span>Excel (.xlsx)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleExport('csv')}
                                className="cursor-pointer gap-2 text-xs"
                            >
                                <FileText className="h-4 w-4 text-blue-600" />
                                <span>CSV (.csv)</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {canCreateTask && (
                        <Button
                            size="sm"
                            className="h-9 shrink-0 text-xs"
                            onClick={handleOpenCreate}
                        >
                            <Plus className="mr-1.5 h-4 w-4" />
                            {t('Create Task')}
                        </Button>
                    )}
                </div>
            </div>

            {/* Tasks Data Table */}
            <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px] px-4">
                                <Checkbox
                                    checked={
                                        paginatedIssues.length > 0 &&
                                        paginatedIssues.every((i: Issue) =>
                                            selectedIssueIds.includes(
                                                String(i.id),
                                            ),
                                        )
                                    }
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            const ids = new Set([
                                                ...selectedIssueIds,
                                                ...paginatedIssues.map(
                                                    (i: Issue) => String(i.id),
                                                ),
                                            ]);
                                            setSelectedIssueIds(
                                                Array.from(ids),
                                            );
                                        } else {
                                            const idsToRemove = new Set(
                                                paginatedIssues.map(
                                                    (i: Issue) => String(i.id),
                                                ),
                                            );
                                            setSelectedIssueIds(
                                                selectedIssueIds.filter(
                                                    (id) =>
                                                        !idsToRemove.has(id),
                                                ),
                                            );
                                        }
                                    }}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            <TableHead className="w-[180px]">
                                {t('Project')}
                            </TableHead>
                            <TableHead>{t('Task Title')}</TableHead>
                            <TableHead className="w-[150px]">
                                {t('Status')}
                            </TableHead>
                            <TableHead className="w-[130px]">
                                {t('Priority')}
                            </TableHead>
                            <TableHead className="w-[160px]">
                                {t('Assignee')}
                            </TableHead>
                            <TableHead className="w-[150px]">
                                {t('Due Date')}
                            </TableHead>
                            <TableHead className="w-[80px] text-right">
                                {t('Action')}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="text-muted-foreground py-12 text-center text-sm"
                                >
                                    {t('Loading tasks...')}
                                </TableCell>
                            </TableRow>
                        ) : paginatedIssues.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="text-muted-foreground py-12 text-center text-sm"
                                >
                                    {t(
                                        'No tasks found matching your filter criteria.',
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedIssues.map((issue: Issue) => {
                                const proj =
                                    projects.find(
                                        (p) => p.id === issue.project_id,
                                    ) || issue.project;

                                return (
                                    <TableRow
                                        key={issue.id}
                                        className={`hover:bg-muted/40 transition-colors ${
                                            iconSize === 'sm'
                                                ? 'h-11 text-xs'
                                                : iconSize === 'lg'
                                                  ? 'h-16 text-sm'
                                                  : 'h-13'
                                        }`}
                                    >
                                        <TableCell className="px-4">
                                            <Checkbox
                                                checked={selectedIssueIds.includes(
                                                    String(issue.id),
                                                )}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setSelectedIssueIds(
                                                            (prev) => [
                                                                ...prev,
                                                                String(
                                                                    issue.id,
                                                                ),
                                                            ],
                                                        );
                                                    } else {
                                                        setSelectedIssueIds(
                                                            (prev) =>
                                                                prev.filter(
                                                                    (id) =>
                                                                        id !==
                                                                        String(
                                                                            issue.id,
                                                                        ),
                                                                ),
                                                        );
                                                    }
                                                }}
                                                aria-label="Select row"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {proj ? (
                                                <Badge
                                                    variant="outline"
                                                    className="bg-background max-w-[160px] truncate text-xs font-normal"
                                                    title={proj.name}
                                                >
                                                    {proj.name}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">
                                                    -
                                                </span>
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <div
                                                onClick={() =>
                                                    handleOpenEdit(issue)
                                                }
                                                className="text-foreground hover:text-primary line-clamp-1 cursor-pointer text-sm font-medium hover:underline"
                                                title={issue.title}
                                            >
                                                {issue.title}
                                            </div>
                                            {issue.id && (
                                                <span className="text-muted-foreground font-mono text-[11px]">
                                                    {issue.id.slice(0, 8)}
                                                </span>
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <span className="bg-muted text-foreground inline-flex items-center rounded px-2 py-0.5 text-xs font-medium">
                                                {issue.status?.name ||
                                                    t('Unknown')}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            {issue.priority ? (
                                                <PriorityBadge
                                                    name={issue.priority.name}
                                                    category={
                                                        issue.priority.category
                                                    }
                                                    size={iconSize}
                                                />
                                            ) : (
                                                <span className="text-muted-foreground text-xs">
                                                    -
                                                </span>
                                            )}
                                        </TableCell>

                                        <TableCell className="text-muted-foreground text-xs">
                                            {issue.assignee?.name || (
                                                <span className="text-muted-foreground/60 italic">
                                                    {t('Unassigned')}
                                                </span>
                                            )}
                                        </TableCell>

                                        <TableCell className="text-xs whitespace-nowrap">
                                            {issue.due_date ? (
                                                (() => {
                                                    const todayStr = new Date()
                                                        .toISOString()
                                                        .slice(0, 10);
                                                    const dueStr =
                                                        issue.due_date.slice(
                                                            0,
                                                            10,
                                                        );
                                                    const isDone =
                                                        issue.status?.category?.toUpperCase() ===
                                                        'DONE';
                                                    const isOverdue =
                                                        issue.is_overdue ??
                                                        (!isDone &&
                                                            dueStr < todayStr);
                                                    return (
                                                        <div className="flex items-center gap-1.5">
                                                            <span
                                                                className={
                                                                    isOverdue
                                                                        ? 'font-medium text-red-600 dark:text-red-400'
                                                                        : 'text-muted-foreground'
                                                                }
                                                            >
                                                                {dueStr}
                                                            </span>
                                                            {isOverdue && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="border-red-500/20 bg-red-500/10 px-1.5 py-0 text-[10px] font-semibold text-red-600 dark:text-red-400"
                                                                >
                                                                    {t(
                                                                        'Overdue',
                                                                    )}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    -
                                                </span>
                                            )}
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() =>
                                                    handleOpenEdit(issue)
                                                }
                                                title={t('Edit / Update Task')}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>

                {/* Pagination Controls Footer */}
                <div className="bg-card text-muted-foreground flex flex-col items-center justify-between gap-4 border-t px-4 py-3 text-xs sm:flex-row">
                    <div className="flex items-center gap-3">
                        <span>
                            {t('Showing')}{' '}
                            <strong className="text-foreground">
                                {totalItems === 0
                                    ? 0
                                    : (safeCurrentPage - 1) * perPage + 1}
                            </strong>{' '}
                            {t('to')}{' '}
                            <strong className="text-foreground">
                                {Math.min(
                                    safeCurrentPage * perPage,
                                    totalItems,
                                )}
                            </strong>{' '}
                            {t('of')}{' '}
                            <strong className="text-foreground">
                                {totalItems}
                            </strong>{' '}
                            {t('tasks')}
                        </span>

                        <div className="ml-2 flex items-center gap-1.5">
                            <span>{t('Rows per page:')}</span>
                            <Select
                                value={perPage.toString()}
                                onValueChange={(val) => {
                                    setPerPage(Number(val));
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="bg-background h-7 w-18 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className="mr-2">
                            {t('Page')}{' '}
                            <strong className="text-foreground">
                                {safeCurrentPage}
                            </strong>{' '}
                            {t('of')}{' '}
                            <strong className="text-foreground">
                                {totalPages}
                            </strong>
                        </span>

                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={safeCurrentPage <= 1}
                            onClick={() =>
                                setCurrentPage((p) => Math.max(1, p - 1))
                            }
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={safeCurrentPage >= totalPages}
                            onClick={() =>
                                setCurrentPage((p) =>
                                    Math.min(totalPages, p + 1),
                                )
                            }
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Floating Action Bar */}
            {selectedIssueIds.length > 0 && (
                <div className="bg-card animate-in slide-in-from-bottom-5 fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full border px-6 py-3 shadow-lg">
                    <span className="text-sm font-medium whitespace-nowrap">
                        {selectedIssueIds.length} {t('tasks selected')}
                    </span>
                    <div className="bg-border h-4 w-px" />

                    <Select
                        onValueChange={async (val) => {
                            try {
                                await bulkUpdateIssues({
                                    issueIds: selectedIssueIds,
                                    payload: { status_id: val },
                                });
                                toast.success(t('Tasks updated successfully'));
                                setSelectedIssueIds([]);
                            } catch (e) {
                                toast.error(t('Failed to update tasks'));
                            }
                        }}
                    >
                        <SelectTrigger className="h-8 w-[130px] border-none text-xs shadow-none focus:ring-0">
                            <SelectValue placeholder={t('Update Status')} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {lookups?.statuses?.map((s: SelectOption) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                    {s.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        onValueChange={async (val) => {
                            try {
                                await bulkUpdateIssues({
                                    issueIds: selectedIssueIds,
                                    payload: {
                                        assignee_id:
                                            val === 'unassigned' ? null : val,
                                    },
                                });
                                toast.success(t('Tasks assigned successfully'));
                                setSelectedIssueIds([]);
                            } catch (e) {
                                toast.error(t('Failed to assign tasks'));
                            }
                        }}
                    >
                        <SelectTrigger className="h-8 w-[140px] border-none text-xs shadow-none focus:ring-0">
                            <SelectValue placeholder={t('Update Assignee')} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            <SelectItem value="unassigned">
                                {t('Unassigned')}
                            </SelectItem>
                            {users.map((u: SelectOption) => (
                                <SelectItem key={u.id} value={String(u.id)}>
                                    {u.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 text-xs"
                            >
                                {t('Delete')}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    {t('Delete Selected Tasks')}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t(
                                        'Are you sure you want to delete selected tasks?',
                                    )}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>
                                    {t('Cancel')}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={async () => {
                                        try {
                                            const promises =
                                                selectedIssueIds.map((id) =>
                                                    axios.delete(
                                                        `/api/issues/${id}`,
                                                    ),
                                                );
                                            await Promise.all(promises);
                                            queryClient.invalidateQueries({
                                                queryKey: [
                                                    'workspaces',
                                                    workspaceId,
                                                    'issues',
                                                ],
                                            });
                                            toast.success(
                                                t('Tasks deleted successfully'),
                                            );
                                            setSelectedIssueIds([]);
                                        } catch {
                                            toast.error(
                                                t('Failed to delete tasks'),
                                            );
                                        }
                                    }}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    {t('Delete')}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}

            {/* Create & Edit Modal Dialog */}
            <IssueFormDialog
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setEditingIssue(null);
                }}
                onSubmit={handleFormSubmit}
                issue={editingIssue}
                isLoading={isSubmitting}
                projects={projectOptions}
                issueTypes={lookups?.issueTypes || []}
                priorities={lookups?.priorities || []}
                statuses={lookups?.statuses || []}
                assignees={users}
            />
        </div>
    );
};
