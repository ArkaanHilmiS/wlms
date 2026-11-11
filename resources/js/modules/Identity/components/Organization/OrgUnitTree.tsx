import React from 'react';
import { OrgUnit } from '../../hooks/use-org-units';
import { Button } from '@/components/ui/button';
import {
    ChevronDown,
    ChevronRight,
    Edit2,
    Trash2,
    PlusCircle,
    Building2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
import { useTranslate } from '@/hooks/useTranslate';

interface OrgUnitTreeProps {
    units: OrgUnit[];
    onEdit: (unit: OrgUnit) => void;
    onDelete: (unit: OrgUnit) => void;
}

interface OrgUnitTreeNodeProps {
    unit: OrgUnit;
    depth?: number;
    onEdit: (unit: OrgUnit) => void;
    onDelete: (unit: OrgUnit) => void;
}

function OrgUnitTreeNode({
    unit,
    depth = 0,
    onEdit,
    onDelete,
}: OrgUnitTreeNodeProps) {
    const { t } = useTranslate();
    const [isExpanded, setIsExpanded] = React.useState(true);
    const hasChildren = unit.children && unit.children.length > 0;

    return (
        <div className="w-full">
            <div
                className={cn(
                    'hover:bg-muted/50 group flex items-center justify-between rounded-md px-2 py-2',
                    depth === 0
                        ? 'border-border/50 mt-2 mb-1 border-b pb-3'
                        : '',
                )}
                style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
            >
                <div className="flex flex-1 items-center space-x-2">
                    <button
                        className={cn(
                            'hover:bg-muted text-muted-foreground shrink-0 rounded-sm p-1',
                            !hasChildren && 'invisible',
                        )}
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </button>
                    <Building2 className="text-muted-foreground h-4 w-4 shrink-0" />
                    <span className="font-medium">{unit.name}</span>
                    <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                        {unit.code}
                    </span>
                    {!unit.is_active && (
                        <Badge
                            variant="secondary"
                            className="h-5 px-1.5 text-[10px]"
                        >
                            {t('Inactive')}
                        </Badge>
                    )}
                    {unit.level && (
                        <Badge
                            variant="outline"
                            className="h-5 px-1.5 text-[10px] font-normal"
                        >
                            {unit.level.name}
                        </Badge>
                    )}
                    {unit.max_workspaces !== undefined && unit.max_workspaces > 0 ? (
                        <Badge
                            variant="secondary"
                            className="h-5 px-1.5 text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                        >
                            {unit.max_workspaces} {t('Workspace')}
                        </Badge>
                    ) : (
                        <Badge
                            variant="outline"
                            className="h-5 px-1.5 text-[10px] text-muted-foreground border-dashed font-normal"
                        >
                            0 {t('Workspace')}
                        </Badge>
                    )}
                </div>

                <div className="flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onEdit(unit)}
                        title={t('Edit Unit')}
                    >
                        <Edit2 className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive h-7 w-7"
                                title={t('Delete Unit')}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    {t('Are you absolutely sure?')}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will
                                    permanently delete the unit "{unit.name}".
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>
                                    {t('Cancel')}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => onDelete(unit)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    {t('Delete')}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {hasChildren && isExpanded && (
                <div className="flex flex-col">
                    {unit.children!.map((child) => (
                        <OrgUnitTreeNode
                            key={child.id}
                            unit={child}
                            depth={depth + 1}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function OrgUnitTree({ units, onEdit, onDelete }: OrgUnitTreeProps) {
    const { t } = useTranslate();
    if (!units.length) {
        return (
            <div className="text-muted-foreground flex flex-col items-center justify-center space-y-2 rounded-md border p-12">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-muted-foreground/50 h-8 w-8"
                >
                    <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    <rect width="20" height="14" x="2" y="6" rx="2" />
                </svg>
                <span className="text-sm font-medium">
                    {t(
                        'No organization units found. Create one to get started.',
                    )}
                </span>
            </div>
        );
    }

    // Filter top-level units (those without parent_id or where parent doesn't exist in current array)
    const topLevelUnits = units.filter(
        (unit) =>
            !unit.parent_id || !units.find((u) => u.id === unit.parent_id),
    );

    return (
        <div className="w-full">
            {topLevelUnits.map((unit) => (
                <OrgUnitTreeNode
                    key={unit.id}
                    unit={unit}
                    depth={0}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
}
