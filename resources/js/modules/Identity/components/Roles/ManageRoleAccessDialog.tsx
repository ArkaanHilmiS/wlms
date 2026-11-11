import { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Check, ChevronsUpDown, Shield, ShieldCheck, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Role, useSyncPermissions, useSyncMenus } from '../../hooks/use-roles';
import { usePermissions } from '../../hooks/use-permissions';
import { useMenus } from '../../hooks/use-menus';
import axios from '@/lib/axios';
import { isAxiosError } from 'axios';
import { useTranslate } from '@/hooks/useTranslate';

interface ManageRoleAccessDialogProps {
    role: Role | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ManageRoleAccessDialog({
    role,
    open,
    onOpenChange,
}: ManageRoleAccessDialogProps) {
    const { t } = useTranslate();
    const { data: permissions } = usePermissions();
    const { data: menus } = useMenus();
    const syncPermissions = useSyncPermissions();
    const syncMenus = useSyncMenus();

    const [selectedPermissionIds, setSelectedPermissionIds] = useState<
        string[]
    >([]);
    const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [openMenus, setOpenMenus] = useState(false);

    useEffect(() => {
        if (role && open) {
            setSelectedPermissionIds(role.permissions?.map((p) => p.id) || []);
            setSelectedMenuIds(role.menus?.map((m) => m.id) || []);
            setOpenMenus(false);
            setSearchQuery('');
        }
    }, [role, open]);

    const isModuleManaged = (mod: string) => {
        const managePerm = permissions?.find((item) => item.name === `${mod}:manage`);
        return managePerm ? selectedPermissionIds.includes(managePerm.id) : false;
    };

    const togglePermission = (id: string) => {
        const target = permissions?.find((p) => p.id === id);
        if (!target) return;

        const [targetModule, targetAction] = target.name.split(':');

        // Jika modul sudah di-manage, sub-aksi tidak bisa diubah langsung (otomatis terdisable)
        if (targetAction !== 'manage' && isModuleManaged(targetModule)) {
            return;
        }

        if (targetAction === 'manage') {
            if (selectedPermissionIds.includes(id)) {
                // Matikan manage: hilangkan ID manage
                setSelectedPermissionIds((prev) => prev.filter((pId) => pId !== id));
            } else {
                // Aktifkan manage: tambahkan ID manage dan bersihkan ID sub-aksi modul ini
                const subPermissionIds =
                    permissions
                        ?.filter(
                            (p) =>
                                p.name.startsWith(`${targetModule}:`) &&
                                p.id !== id,
                        )
                        .map((p) => p.id) || [];

                setSelectedPermissionIds((prev) => [
                    ...prev.filter((pId) => !subPermissionIds.includes(pId)),
                    id,
                ]);
            }
        } else {
            setSelectedPermissionIds((prev) =>
                prev.includes(id)
                    ? prev.filter((pId) => pId !== id)
                    : [...prev, id],
            );
        }
    };

    // Kelompokkan permission berdasarkan resource/modul
    const groupedPermissions = useMemo(() => {
        if (!permissions) return {};
        const groups: Record<string, typeof permissions> = {};

        const filtered = searchQuery.trim()
            ? permissions.filter(
                  (p) =>
                      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (p.description &&
                          p.description
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase())),
              )
            : permissions;

        for (const p of filtered) {
            const [module] = p.name.split(':');
            if (!groups[module]) groups[module] = [];
            groups[module].push(p);
        }

        // Urutkan supaya :manage selalu paling atas
        for (const mod in groups) {
            groups[mod].sort((a, b) => {
                const aIsManage = a.name.endsWith(':manage');
                const bIsManage = b.name.endsWith(':manage');
                if (aIsManage && !bIsManage) return -1;
                if (!aIsManage && bIsManage) return 1;
                return a.name.localeCompare(b.name);
            });
        }

        return groups;
    }, [permissions, searchQuery]);

    const handleSavePermissions = () => {
        if (!role) return;
        syncPermissions.mutate(
            {
                roleId: role.id,
                permissionIds: selectedPermissionIds,
            },
            {
                onSuccess: () => {
                    toast.success(t('Permissions updated successfully'));
                },
                onError: (error) => {
                    if (isAxiosError(error)) {
                        toast.error(
                            error.response?.data?.message ||
                                'Failed to update permissions',
                        );
                    } else {
                        toast.error(
                            t('An error occurred while updating permissions'),
                        );
                    }
                },
            },
        );
    };

    const handleSaveMenus = () => {
        if (!role) return;
        syncMenus.mutate(
            {
                roleId: role.id,
                menuIds: selectedMenuIds,
            },
            {
                onSuccess: () => {
                    toast.success(t('Menus updated successfully'));
                },
                onError: (error) => {
                    if (isAxiosError(error)) {
                        toast.error(
                            error.response?.data?.message ||
                                'Failed to update menus',
                        );
                    } else {
                        toast.error(
                            t('An error occurred while updating menus'),
                        );
                    }
                },
            },
        );
    };

    const toggleMenu = (id: string) => {
        setSelectedMenuIds((prev) =>
            prev.includes(id)
                ? prev.filter((mId) => mId !== id)
                : [...prev, id],
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[650px] flex-col sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Manage Access: {role?.name}
                    </DialogTitle>
                </DialogHeader>

                <Tabs
                    defaultValue="permissions"
                    className="flex min-h-0 w-full flex-1 flex-col"
                >
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="permissions">
                            {t('Permissions')}
                        </TabsTrigger>
                        <TabsTrigger value="menus">{t('Menus')}</TabsTrigger>
                    </TabsList>

                    {/* PERMISSIONS TAB */}
                    <TabsContent
                        value="permissions"
                        className="flex min-h-0 flex-1 flex-col space-y-3 pt-3"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('Search permissions or modules...')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 h-9"
                                />
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">
                                {selectedPermissionIds.length} {t('selected')}
                            </Badge>
                        </div>

                        {/* GROUPED PERMISSIONS LIST */}
                        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
                            {Object.keys(groupedPermissions).length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    {t('No permissions found.')}
                                </div>
                            ) : (
                                Object.entries(groupedPermissions).map(([mod, items]) => {
                                    const hasManage = isModuleManaged(mod);
                                    const manageItem = items.find((p) => p.name.endsWith(':manage'));
                                    const subItems = items.filter((p) => !p.name.endsWith(':manage'));

                                    return (
                                        <div
                                            key={mod}
                                            className="rounded-lg border bg-card p-3 shadow-xs space-y-2.5"
                                        >
                                            <div className="flex items-center justify-between border-b pb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm capitalize">
                                                        {mod}
                                                    </span>
                                                    {hasManage && (
                                                        <Badge
                                                            variant="default"
                                                            className="text-[10px] h-5 bg-emerald-600 hover:bg-emerald-700"
                                                        >
                                                            Full Access
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* MANAGE CHECKBOX */}
                                                {manageItem && (
                                                    <label
                                                        className="flex items-center gap-2 cursor-pointer text-xs font-medium text-primary select-none hover:opacity-80"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Checkbox
                                                            checked={selectedPermissionIds.includes(manageItem.id)}
                                                            onCheckedChange={() => togglePermission(manageItem.id)}
                                                        />
                                                        <span>{manageItem.name} (Manage All)</span>
                                                    </label>
                                                )}
                                            </div>

                                            {/* SUB ACTIONS (view, create, edit, assign, delete, etc.) */}
                                            {subItems.length > 0 && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-1">
                                                    {subItems.map((p) => {
                                                        const isChecked =
                                                            hasManage ||
                                                            selectedPermissionIds.includes(p.id);
                                                        const isDisabled = hasManage;

                                                        return (
                                                            <div
                                                                key={p.id}
                                                                onClick={() => {
                                                                    if (!isDisabled) {
                                                                        togglePermission(p.id);
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    'flex items-start gap-2 p-2 rounded-md border text-xs transition-colors',
                                                                    isDisabled
                                                                        ? 'bg-muted/40 opacity-70 cursor-not-allowed border-dashed'
                                                                        : 'cursor-pointer hover:bg-accent border-border',
                                                                    isChecked && !isDisabled && 'bg-primary/5 border-primary/30',
                                                                )}
                                                            >
                                                                <Checkbox
                                                                    checked={isChecked}
                                                                    disabled={isDisabled}
                                                                    className="mt-0.5 shrink-0"
                                                                    onCheckedChange={() => {
                                                                        if (!isDisabled) {
                                                                            togglePermission(p.id);
                                                                        }
                                                                    }}
                                                                />
                                                                <div className="flex flex-col min-w-0 flex-1">
                                                                    <div className="flex items-center justify-between gap-1">
                                                                        <span className="font-mono text-[11px] font-medium truncate">
                                                                            {p.name}
                                                                        </span>
                                                                        {hasManage && (
                                                                            <span className="text-[10px] text-muted-foreground italic shrink-0">
                                                                                (Tercakup)
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {p.description && (
                                                                        <span className="text-muted-foreground text-[10px] line-clamp-1">
                                                                            {p.description}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="flex justify-end pt-2 border-t">
                            <Button
                                onClick={handleSavePermissions}
                                disabled={syncPermissions.isPending}
                            >
                                {syncPermissions.isPending
                                    ? t('Saving...')
                                    : t('Save Permissions')}
                            </Button>
                        </div>
                    </TabsContent>

                    {/* MENUS TAB */}
                    <TabsContent
                        value="menus"
                        className="flex min-h-0 flex-1 flex-col space-y-4 pt-4"
                    >
                        <div className="flex min-h-0 flex-1 flex-col space-y-3">
                            <label className="text-sm font-medium">
                                {t('Select Menus')}
                            </label>

                            <Popover
                                open={openMenus}
                                onOpenChange={setOpenMenus}
                            >
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openMenus}
                                        className="h-auto min-h-10 w-full justify-between py-2"
                                    >
                                        <div className="flex flex-wrap items-center gap-1">
                                            {selectedMenuIds.length === 0 && (
                                                <span className="text-muted-foreground font-normal">
                                                    {t('Select menus...')}
                                                </span>
                                            )}
                                            {selectedMenuIds.length > 0 &&
                                                selectedMenuIds.length <= 3 &&
                                                selectedMenuIds.map((id) => {
                                                    const m = menus?.find(
                                                        (x) => x.id === id,
                                                    );
                                                    return m ? (
                                                        <Badge
                                                            variant="secondary"
                                                            key={id}
                                                        >
                                                            {m.label}
                                                        </Badge>
                                                    ) : null;
                                                })}
                                            {selectedMenuIds.length > 3 && (
                                                <Badge variant="secondary">
                                                    {selectedMenuIds.length}{' '}
                                                    {t('selected')}
                                                </Badge>
                                            )}
                                        </div>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-[500px] p-0"
                                    align="start"
                                >
                                    <Command>
                                        <CommandInput
                                            placeholder={t('Search menus...')}
                                        />
                                        <CommandList>
                                            <CommandEmpty>
                                                {t('No menus found.')}
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {menus?.map((m) => (
                                                    <CommandItem
                                                        key={m.id}
                                                        value={`${m.label} ${m.key}`}
                                                        onSelect={() =>
                                                            toggleMenu(m.id)
                                                        }
                                                    >
                                                        <Check
                                                            className={cn(
                                                                'mr-2 h-4 w-4',
                                                                selectedMenuIds.includes(
                                                                    m.id,
                                                                )
                                                                    ? 'opacity-100'
                                                                    : 'opacity-0',
                                                            )}
                                                        />
                                                        {m.label}{' '}
                                                        <span className="text-muted-foreground ml-2 text-xs">
                                                            ({m.key})
                                                        </span>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={handleSaveMenus}
                                disabled={syncMenus.isPending}
                            >
                                {syncMenus.isPending
                                    ? t('Saving...')
                                    : t('Save Menus')}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
