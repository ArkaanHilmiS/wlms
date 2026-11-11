import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import {
    Users,
    Trash2,
    Plus,
    CheckCircle2,
    AlertCircle,
    Copy,
    Info,
} from 'lucide-react';
import { useBulkCreateUsers } from '../../hooks/use-users';
import { useRoles } from '../../hooks/use-roles';
import { useOrgUnits } from '../../hooks/use-org-units';
import { toast } from 'sonner';
import { useTranslate } from '@/hooks/useTranslate';

interface ParsedUserRow {
    id: string;
    name: string;
    email: string;
    isValid: boolean;
    error?: string;
}

export function UserBulkCreateDialog() {
    const { t } = useTranslate();
    const [isOpen, setIsOpen] = useState(false);
    const [rawText, setRawText] = useState('');
    const [defaultPassword, setDefaultPassword] = useState('Password123!');
    const [defaultRoleId, setDefaultRoleId] = useState<string>('none');
    const [defaultOrgUnitId, setDefaultOrgUnitId] = useState<string>('none');
    const [skipDuplicates, setSkipDuplicates] = useState(true);
    const [skipInvalid, setSkipInvalid] = useState(true);

    const { data: roles } = useRoles();
    const { data: orgUnits } = useOrgUnits();
    const bulkCreate = useBulkCreateUsers();

    // Flatten orgUnits
    const flatOrgUnits = useMemo(() => {
        const result: { id: string; name: string }[] = [];
        const traverse = (units: any[]) => {
            units.forEach((u) => {
                result.push({ id: u.id, name: u.name });
                if (u.children?.length) {
                    traverse(u.children);
                }
            });
        };
        traverse(orgUnits || []);
        return result;
    }, [orgUnits]);

    const roleOptions = useMemo(
        () => [
            { value: 'none', label: t('No role (Assign later)') },
            ...(roles || []).map((r) => ({
                value: String(r.id),
                label: r.name,
            })),
        ],
        [roles, t],
    );

    const orgUnitOptions = useMemo(
        () => [
            { value: 'none', label: t('No org unit') },
            ...flatOrgUnits.map((u) => ({
                value: String(u.id),
                label: u.name,
            })),
        ],
        [flatOrgUnits, t],
    );

    // Parse raw text into structured rows with real-time validation
    const parsedRows = useMemo<ParsedUserRow[]>(() => {
        if (!rawText.trim()) return [];

        const lines = rawText.split(/\r?\n/);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const seenEmails = new Set<string>();
        const rows: ParsedUserRow[] = [];

        lines.forEach((line, idx) => {
            const cleaned = line.replace(/\u00A0/g, ' ').trim();
            if (!cleaned) return;

            // Support comma, tab, or semicolon delimiter
            let parts: string[] = [];
            if (cleaned.includes('\t')) {
                parts = cleaned.split('\t');
            } else if (cleaned.includes(';')) {
                parts = cleaned.split(';');
            } else {
                parts = cleaned.split(',');
            }

            const name = (parts[0] || '').trim();
            const email = (parts[1] || '').trim().toLowerCase();

            let isValid = true;
            let error = '';

            if (!name) {
                isValid = false;
                error = t('Name is required');
            } else if (!email) {
                isValid = false;
                error = t('Email is required');
            } else if (!emailRegex.test(email)) {
                isValid = false;
                error = t('Invalid email format');
            } else if (seenEmails.has(email)) {
                isValid = false;
                error = t('Duplicate in list');
            } else {
                seenEmails.add(email);
            }

            rows.push({
                id: `row-${idx}`,
                name,
                email,
                isValid,
                error: error || undefined,
            });
        });

        return rows;
    }, [rawText, t]);

    // Stats
    const validRows = useMemo(
        () => parsedRows.filter((r) => r.isValid),
        [parsedRows],
    );
    const invalidRows = useMemo(
        () => parsedRows.filter((r) => !r.isValid),
        [parsedRows],
    );

    const handleUpdateRow = (
        id: string,
        field: 'name' | 'email',
        value: string,
    ) => {
        // Reconstruct rawText with updated value
        const updatedLines = parsedRows.map((r) => {
            if (r.id === id) {
                const newName = field === 'name' ? value : r.name;
                const newEmail = field === 'email' ? value : r.email;
                return `${newName}, ${newEmail}`;
            }
            return `${r.name}, ${r.email}`;
        });
        setRawText(updatedLines.join('\n'));
    };

    const handleDeleteRow = (id: string) => {
        const remaining = parsedRows
            .filter((r) => r.id !== id)
            .map((r) => `${r.name}, ${r.email}`)
            .join('\n');
        setRawText(remaining);
    };

    const handleAddRow = () => {
        const newLine = `New User, user${Date.now()}@example.com`;
        setRawText((prev) => (prev ? `${prev}\n${newLine}` : newLine));
    };

    const handleLoadExample = () => {
        const example = [
            'Budi Santoso, budi.santoso@vendor.com',
            'Siti Rahma, siti.rahma@vendor.com',
            'Ahmad Fauzi, ahmad.fauzi@vendor.com',
        ].join('\n');
        setRawText(example);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const rowsToImport = skipInvalid ? validRows : parsedRows;

        if (rowsToImport.length === 0) {
            toast.error(t('No valid users to import'));
            return;
        }

        if (!skipInvalid && invalidRows.length > 0) {
            toast.error(
                t('Please fix or remove invalid rows before submitting'),
            );
            return;
        }

        try {
            const payload = {
                users: rowsToImport.map((r) => ({
                    name: r.name,
                    email: r.email,
                })),
                default_password: defaultPassword || undefined,
                default_role_id:
                    defaultRoleId !== 'none' ? defaultRoleId : null,
                default_org_unit_id:
                    defaultOrgUnitId !== 'none' ? defaultOrgUnitId : null,
                skip_duplicates: skipDuplicates,
            };

            const response = await bulkCreate.mutateAsync(payload);

            const msg = t(':created users created (:skipped skipped)', {
                created: response.created_count,
                skipped: response.skipped_count,
            });

            toast.success(msg);
            setIsOpen(false);
            setRawText('');
        } catch (error: any) {
            const message =
                error.response?.data?.message ||
                t('Failed to bulk create users');
            toast.error(message);
        }
    };

    const canSubmit =
        validRows.length > 0 &&
        (skipInvalid || invalidRows.length === 0) &&
        !bulkCreate.isPending;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-border">
                    <Users className="mr-2 h-4 w-4" />
                    {t('Bulk Add Users')}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl md:max-w-4xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        {t('Bulk Add Users')}
                    </DialogTitle>
                    <DialogDescription>
                        {t(
                            'Quickly add multiple users by pasting a list. Delimiters like comma, tab, or semicolon are supported.',
                        )}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Section 1: Textarea with quick example */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label
                                htmlFor="bulk-text"
                                className="text-sm font-medium"
                            >
                                {t('Paste User List (Name, Email)')}
                            </Label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleLoadExample}
                                className="text-xs text-blue-600 hover:text-blue-700"
                            >
                                <Copy className="mr-1 h-3.5 w-3.5" />
                                {t('Load Example Format')}
                            </Button>
                        </div>
                        <Textarea
                            id="bulk-text"
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            rows={4}
                            placeholder="John Doe, john@vendor.com&#10;Jane Smith, jane@vendor.com"
                            className="font-mono text-xs"
                        />
                        <p className="text-muted-foreground flex items-center gap-1 text-xs">
                            <Info className="h-3.5 w-3.5" />
                            {t(
                                'Tip: You can copy and paste directly from Excel columns.',
                            )}
                        </p>
                    </div>

                    {/* Section 2: Global Configuration */}
                    <div className="bg-muted/30 grid grid-cols-1 gap-4 rounded-lg border p-3.5 sm:grid-cols-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">
                                {t('Default Role')}
                            </Label>
                            <Combobox
                                options={roleOptions}
                                value={defaultRoleId}
                                onChange={(val) =>
                                    setDefaultRoleId(val || 'none')
                                }
                                placeholder={t('Select role')}
                                emptyText={t('No role found.')}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">
                                {t('Default Org Unit')}
                            </Label>
                            <Combobox
                                options={orgUnitOptions}
                                value={defaultOrgUnitId}
                                onChange={(val) =>
                                    setDefaultOrgUnitId(val || 'none')
                                }
                                placeholder={t('Select unit')}
                                emptyText={t('No org unit found.')}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">
                                {t('Initial Password')}
                            </Label>
                            <Input
                                type="text"
                                value={defaultPassword}
                                onChange={(e) =>
                                    setDefaultPassword(e.target.value)
                                }
                                className="h-9 text-xs"
                                placeholder="Password123!"
                            />
                        </div>
                    </div>

                    {/* Section 3: Live Preview Table & Inline Error Reporting */}
                    {parsedRows.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">
                                        {t('Preview & Verification')}
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className="rounded-full px-2.5 py-0.5 text-xs font-normal"
                                    >
                                        {parsedRows.length} {t('rows')}
                                    </Badge>
                                    <Badge
                                        variant="secondary"
                                        className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                                    >
                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                        {validRows.length} {t('valid')}
                                    </Badge>
                                    {invalidRows.length > 0 && (
                                        <Badge
                                            variant="destructive"
                                            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                                        >
                                            <AlertCircle className="mr-1 h-3 w-3" />
                                            {invalidRows.length} {t('invalid')}
                                        </Badge>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddRow}
                                    className="h-7 text-xs"
                                >
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    {t('Add Row')}
                                </Button>
                            </div>

                            <div className="max-h-60 overflow-y-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-28 text-xs">
                                                {t('Status')}
                                            </TableHead>
                                            <TableHead className="w-[35%] min-w-[180px] text-xs">
                                                {t('Name')}
                                            </TableHead>
                                            <TableHead className="w-[50%] min-w-[240px] text-xs">
                                                {t('Email')}
                                            </TableHead>
                                            <TableHead className="w-12 text-center text-xs" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parsedRows.map((row) => (
                                            <TableRow
                                                key={row.id}
                                                className={
                                                    !row.isValid
                                                        ? 'bg-destructive/5 hover:bg-destructive/10'
                                                        : ''
                                                }
                                            >
                                                <TableCell className="py-1.5">
                                                    {row.isValid ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="border-emerald-500/30 bg-emerald-50 text-[11px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                                        >
                                                            {t('Valid')}
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="destructive"
                                                            className="text-[11px]"
                                                            title={row.error}
                                                        >
                                                            {row.error}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-1.5">
                                                    <Input
                                                        value={row.name}
                                                        onChange={(e) =>
                                                            handleUpdateRow(
                                                                row.id,
                                                                'name',
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="h-8 w-full text-xs"
                                                    />
                                                </TableCell>
                                                <TableCell className="py-1.5">
                                                    <Input
                                                        value={row.email}
                                                        onChange={(e) =>
                                                            handleUpdateRow(
                                                                row.id,
                                                                'email',
                                                                e.target.value,
                                                            )
                                                        }
                                                        className={`h-8 w-full text-xs ${
                                                            !row.isValid &&
                                                            row.error?.includes(
                                                                'email',
                                                            )
                                                                ? 'border-destructive focus-visible:ring-destructive'
                                                                : ''
                                                        }`}
                                                    />
                                                </TableCell>
                                                <TableCell className="py-1.5 text-center">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleDeleteRow(
                                                                row.id,
                                                            )
                                                        }
                                                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Section 4: Options */}
                            <div className="flex flex-col gap-2 pt-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="skip-dup"
                                        checked={skipDuplicates}
                                        onCheckedChange={(c) =>
                                            setSkipDuplicates(Boolean(c))
                                        }
                                    />
                                    <Label
                                        htmlFor="skip-dup"
                                        className="text-xs"
                                    >
                                        {t('Skip existing database emails')}
                                    </Label>
                                </div>

                                {invalidRows.length > 0 && (
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="skip-invalid"
                                            checked={skipInvalid}
                                            onCheckedChange={(c) =>
                                                setSkipInvalid(Boolean(c))
                                            }
                                        />
                                        <Label
                                            htmlFor="skip-invalid"
                                            className="text-muted-foreground text-xs"
                                        >
                                            {t(
                                                'Ignore invalid rows and import valid ones',
                                            )}
                                        </Label>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:justify-end">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsOpen(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={!canSubmit || validRows.length === 0}
                            className="bg-blue-600 text-white hover:bg-blue-700"
                        >
                            {bulkCreate.isPending && (
                                <Spinner className="mr-2 h-4 w-4" />
                            )}
                            {t('Import :count Users', {
                                count: validRows.length,
                            })}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ⁠Quinton Jaury, quinton.jaury@mii.co.id
// ⁠Mochammad Aditya Putra Suhendar, Mochammad.Suhendar@mii.co.id
// ⁠Danu Febriansyah, danu.febriansyah@mii.co.id
// ⁠Abu Wildan Mucholladin, Abu.Mucholladin@mii.co.id
// ⁠Fabiansyah Cahyo Kuncoro Pradipta, fabiansyah.pradipta@mii.co.id
// ⁠Bayu Yudha Pratama, bayu.pratama@mii.co.id
// ⁠Abiela Titan Susilo, abiela.susilo@mii.co.id
// ⁠Tri Juni Cantayuda Marsetia, Tri.Marsetia@mii.co.id
// ⁠Nashrullah, nashrullah.nashrull@mii.co.id

// NIP : 120858
// NIP: 120853
// NIP : 120787
// NIP: 18098
// NIP: 18295
// NIP: 120852
// NIP: 120848
// NIP: 120846
// NIP: 120845