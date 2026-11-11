import React, { useEffect, useState } from 'react';
import axios from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Clock,
    Calendar,
    Briefcase,
    Paperclip,
    Plus,
    X,
    Save,
} from 'lucide-react';
import { useTranslate } from '@/hooks/useTranslate';

export interface WorkloadPolicySettings {
    sla_days_by_priority: Record<string, number>;
    working_days: number[];
    holidays: string[];
    enable_sprints_default: boolean;
    worklog_max_hours_per_day: number;
    worklog_allow_future_date: boolean;
    attachment_max_mb: number;
    attachment_allowed_extensions: string[];
    similarity_threshold: number;
    sla_warning_days: number;
}

interface PriorityItem {
    id: string;
    name: string;
    slug?: string;
    level?: number;
}

const DEFAULT_SETTINGS: WorkloadPolicySettings = {
    sla_days_by_priority: {
        urgent: 1,
        critical: 1,
        high: 2,
        medium: 5,
        low: 10,
    },
    working_days: [1, 2, 3, 4, 5],
    holidays: [],
    enable_sprints_default: true,
    worklog_max_hours_per_day: 12,
    worklog_allow_future_date: false,
    attachment_max_mb: 5,
    attachment_allowed_extensions: [
        'pdf',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'csv',
        'png',
        'jpg',
        'jpeg',
        'gif',
        'webp',
        'txt',
        'zip',
    ],
    similarity_threshold: 0.35,
    sla_warning_days: 2,
};

const DAYS_OF_WEEK = [
    { day: 1, label: 'Senin' },
    { day: 2, label: 'Selasa' },
    { day: 3, label: 'Rabu' },
    { day: 4, label: 'Kamis' },
    { day: 5, label: 'Jumat' },
    { day: 6, label: 'Sabtu' },
    { day: 7, label: 'Minggu' },
];

const FALLBACK_PRIORITIES: PriorityItem[] = [
    { id: 'urgent', name: 'Urgent', slug: 'urgent' },
    { id: 'critical', name: 'Critical', slug: 'critical' },
    { id: 'high', name: 'High', slug: 'high' },
    { id: 'medium', name: 'Medium', slug: 'medium' },
    { id: 'low', name: 'Low', slug: 'low' },
];

export function WorkloadPoliciesManager() {
    const { t } = useTranslate();
    const [settings, setSettings] =
        useState<WorkloadPolicySettings>(DEFAULT_SETTINGS);
    const [priorities, setPriorities] = useState<PriorityItem[]>([]);
    const [extensionsText, setExtensionsText] = useState(
        DEFAULT_SETTINGS.attachment_allowed_extensions.join(', '),
    );
    const [newHoliday, setNewHoliday] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        let mounted = true;
        const fetchSettings = async () => {
            try {
                setIsLoading(true);
                const { data } = await axios.get('/api/settings/workload');
                if (!mounted) return;
                const loaded: WorkloadPolicySettings = {
                    ...DEFAULT_SETTINGS,
                    ...(data?.data || {}),
                };
                setSettings(loaded);
                setExtensionsText(
                    (loaded.attachment_allowed_extensions || []).join(', '),
                );
                if (Array.isArray(data?.priorities) && data.priorities.length) {
                    setPriorities(data.priorities);
                }
            } catch {
                toast.error(t('Gagal memuat pengaturan kebijakan kerja.'));
            } finally {
                if (mounted) setIsLoading(false);
            }
        };
        fetchSettings();
        return () => {
            mounted = false;
        };
    }, []);

    const activePriorities =
        priorities.length > 0 ? priorities : FALLBACK_PRIORITIES;

    const handleSlaChange = (slug: string, value: string) => {
        const num = Math.max(0, parseInt(value, 10) || 0);
        setSettings((prev) => ({
            ...prev,
            sla_days_by_priority: {
                ...prev.sla_days_by_priority,
                [slug]: num,
            },
        }));
    };

    const toggleWorkingDay = (day: number) => {
        setSettings((prev) => {
            const exists = prev.working_days.includes(day);
            const next = exists
                ? prev.working_days.filter((d) => d !== day)
                : [...prev.working_days, day].sort((a, b) => a - b);
            return {
                ...prev,
                working_days: next.length > 0 ? next : [1],
            };
        });
    };

    const handleAddHoliday = () => {
        if (!newHoliday) return;
        if (settings.holidays.includes(newHoliday)) {
            setNewHoliday('');
            return;
        }
        setSettings((prev) => ({
            ...prev,
            holidays: [...prev.holidays, newHoliday].sort(),
        }));
        setNewHoliday('');
    };

    const handleRemoveHoliday = (dateStr: string) => {
        setSettings((prev) => ({
            ...prev,
            holidays: prev.holidays.filter((h) => h !== dateStr),
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsedExtensions = extensionsText
            .split(',')
            .map((ext) => ext.trim().replace(/^\./, '').toLowerCase())
            .filter(Boolean);

        const payload: WorkloadPolicySettings = {
            ...settings,
            attachment_allowed_extensions:
                parsedExtensions.length > 0
                    ? parsedExtensions
                    : DEFAULT_SETTINGS.attachment_allowed_extensions,
        };

        try {
            setIsSaving(true);
            const { data } = await axios.put('/api/settings/workload', payload);
            if (data?.data) {
                setSettings(data.data);
                setExtensionsText(
                    (data.data.attachment_allowed_extensions || []).join(', '),
                );
            }
            toast.success(
                t('Pengaturan SLA & Kebijakan berhasil disimpan.'),
            );
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message ||
                    t('Gagal menyimpan pengaturan SLA & Kebijakan.'),
            );
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="text-muted-foreground py-6 text-sm">
                {t('Loading policies...')}
            </div>
        );
    }

    return (
        <form onSubmit={handleSave} className="space-y-6">
            {/* 1. Matriks Target SLA per Prioritas */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Clock className="text-primary h-5 w-5" />
                        <CardTitle className="text-base">
                            Matriks Target SLA per Prioritas
                        </CardTitle>
                    </div>
                    <CardDescription>
                        Target penyelesaian tiket (dalam hari kerja) untuk
                        kalkulasi otomatis Due Date saat tiket dibuat.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                        {activePriorities.map((prio) => {
                            const slug = (
                                prio.slug || prio.name
                            ).toLowerCase();
                            const currentVal =
                                settings.sla_days_by_priority?.[slug] ??
                                DEFAULT_SETTINGS.sla_days_by_priority[slug] ??
                                3;
                            return (
                                <div
                                    key={prio.id || slug}
                                    className="space-y-1.5 rounded-lg border p-3"
                                >
                                    <Label
                                        htmlFor={`sla-${slug}`}
                                        className="text-xs font-semibold uppercase tracking-wider"
                                    >
                                        {prio.name}
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id={`sla-${slug}`}
                                            type="number"
                                            min={0}
                                            max={365}
                                            value={currentVal}
                                            onChange={(e) =>
                                                handleSlaChange(
                                                    slug,
                                                    e.target.value,
                                                )
                                            }
                                            className="h-9"
                                        />
                                        <span className="text-muted-foreground text-xs whitespace-nowrap">
                                            hari kerja
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* 2. Kalender Kerja & Hari Libur (Bank Jatim & MII) */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="text-primary h-5 w-5" />
                        <CardTitle className="text-base">
                            Kalender Kerja & Hari Libur (Bank Jatim & MII)
                        </CardTitle>
                    </div>
                    <CardDescription>
                        Tentukan hari operasional kerja dan daftar tanggal libur
                        nasional/cuti bersama yang dikecualikan dari perhitungan
                        SLA.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold">
                            Hari Kerja Aktif
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {DAYS_OF_WEEK.map(({ day, label }) => {
                                const isActive =
                                    settings.working_days.includes(day);
                                return (
                                    <Button
                                        key={day}
                                        type="button"
                                        size="sm"
                                        variant={
                                            isActive ? 'default' : 'outline'
                                        }
                                        onClick={() => toggleWorkingDay(day)}
                                        className="h-8 px-3 text-xs"
                                    >
                                        {day}: {label}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label
                            htmlFor="holiday-date"
                            className="text-xs font-semibold"
                        >
                            Daftar Hari Libur / Cuti Bersama
                        </Label>
                        <div className="flex max-w-sm items-center gap-2">
                            <Input
                                id="holiday-date"
                                type="date"
                                value={newHoliday}
                                onChange={(e) => setNewHoliday(e.target.value)}
                                className="h-9"
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleAddHoliday}
                                className="h-9 shrink-0 gap-1"
                            >
                                <Plus className="h-4 w-4" />
                                Tambah
                            </Button>
                        </div>

                        {settings.holidays.length > 0 ? (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {settings.holidays.map((dateStr) => (
                                    <Badge
                                        key={dateStr}
                                        variant="secondary"
                                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs"
                                    >
                                        <span>{dateStr}</span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleRemoveHoliday(dateStr)
                                            }
                                            className="hover:text-destructive ml-1 rounded-full"
                                            aria-label={`Remove ${dateStr}`}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-xs">
                                Belum ada tanggal libur yang ditambahkan.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 3. Metodologi & Batas Log Kerja (Worklog Policy) */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Briefcase className="text-primary h-5 w-5" />
                        <CardTitle className="text-base">
                            Metodologi & Batas Log Kerja (Worklog Policy)
                        </CardTitle>
                    </div>
                    <CardDescription>
                        Atur mode Agile/Scrum default untuk proyek baru dan
                        validasi pencatatan jam kerja harian tim.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-start space-x-3 rounded-lg border p-3">
                        <Checkbox
                            id="enable_sprints_default"
                            checked={settings.enable_sprints_default}
                            onCheckedChange={(checked) =>
                                setSettings((prev) => ({
                                    ...prev,
                                    enable_sprints_default: Boolean(checked),
                                }))
                            }
                        />
                        <div className="grid gap-1 leading-none">
                            <Label
                                htmlFor="enable_sprints_default"
                                className="cursor-pointer text-sm font-medium"
                            >
                                Aktifkan Sprint (Scrum) secara default pada
                                proyek baru
                            </Label>
                            <p className="text-muted-foreground text-xs">
                                Jika dinonaktifkan, proyek dapat berjalan dalam
                                mode Kanban murni tanpa tab Backlog/Sprint.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="worklog_max_hours_per_day">
                                Batas maksimal jam worklog per orang per hari
                            </Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="worklog_max_hours_per_day"
                                    type="number"
                                    min={1}
                                    max={24}
                                    step={0.5}
                                    value={settings.worklog_max_hours_per_day}
                                    onChange={(e) =>
                                        setSettings((prev) => ({
                                            ...prev,
                                            worklog_max_hours_per_day:
                                                Math.max(
                                                    1,
                                                    Math.min(
                                                        24,
                                                        Number(
                                                            e.target.value,
                                                        ) || 12,
                                                    ),
                                                ),
                                        }))
                                    }
                                    className="max-w-[140px]"
                                />
                                <span className="text-muted-foreground text-xs">
                                    jam / hari
                                </span>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3 rounded-lg border p-3">
                            <Checkbox
                                id="worklog_allow_future_date"
                                checked={settings.worklog_allow_future_date}
                                onCheckedChange={(checked) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        worklog_allow_future_date:
                                            Boolean(checked),
                                    }))
                                }
                            />
                            <div className="grid gap-1 leading-none">
                                <Label
                                    htmlFor="worklog_allow_future_date"
                                    className="cursor-pointer text-sm font-medium"
                                >
                                    Izinkan input worklog untuk tanggal di masa
                                    depan
                                </Label>
                                <p className="text-muted-foreground text-xs">
                                    Cegah salah input tanggal log kerja yang
                                    melebihi hari ini.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 4. Lampiran, Deteksi Kemiripan & Peringatan SLA */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Paperclip className="text-primary h-5 w-5" />
                        <CardTitle className="text-base">
                            Lampiran, Deteksi Kemiripan & Peringatan SLA
                        </CardTitle>
                    </div>
                    <CardDescription>
                        Batas unggahan berkas, sensitivitas deteksi tiket
                        duplikat, dan ambang peringatan tenggat waktu.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="attachment_max_mb">
                            Batas Ukuran Lampiran (MB)
                        </Label>
                        <Input
                            id="attachment_max_mb"
                            type="number"
                            min={1}
                            max={100}
                            value={settings.attachment_max_mb}
                            onChange={(e) =>
                                setSettings((prev) => ({
                                    ...prev,
                                    attachment_max_mb: Math.max(
                                        1,
                                        parseInt(e.target.value, 10) || 5,
                                    ),
                                }))
                            }
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="attachment_allowed_extensions">
                            Ekstensi Berkas yang Diizinkan (pisahkan koma)
                        </Label>
                        <Input
                            id="attachment_allowed_extensions"
                            value={extensionsText}
                            onChange={(e) => setExtensionsText(e.target.value)}
                            placeholder="pdf, docx, xlsx, png, jpg, zip"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="similarity_threshold">
                            Ambang Deteksi Tiket Serupa (Similarity Threshold)
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="similarity_threshold"
                                type="number"
                                min={0.1}
                                max={0.95}
                                step={0.05}
                                value={settings.similarity_threshold}
                                onChange={(e) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        similarity_threshold: Math.max(
                                            0.1,
                                            Math.min(
                                                0.95,
                                                parseFloat(e.target.value) ||
                                                    0.35,
                                            ),
                                        ),
                                    }))
                                }
                                className="max-w-[120px]"
                            />
                            <div className="flex gap-1">
                                {[
                                    { label: 'Longgar (0.25)', val: 0.25 },
                                    { label: 'Normal (0.35)', val: 0.35 },
                                    { label: 'Ketat (0.50)', val: 0.5 },
                                ].map((preset) => (
                                    <Button
                                        key={preset.val}
                                        type="button"
                                        size="sm"
                                        variant={
                                            Math.abs(
                                                settings.similarity_threshold -
                                                    preset.val,
                                            ) < 0.01
                                                ? 'default'
                                                : 'outline'
                                        }
                                        className="h-8 px-2 text-xs"
                                        onClick={() =>
                                            setSettings((prev) => ({
                                                ...prev,
                                                similarity_threshold:
                                                    preset.val,
                                            }))
                                        }
                                    >
                                        {preset.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="sla_warning_days">
                            Notifikasi Due Soon H-berapa hari sebelum deadline
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="sla_warning_days"
                                type="number"
                                min={1}
                                max={30}
                                value={settings.sla_warning_days}
                                onChange={(e) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        sla_warning_days: Math.max(
                                            1,
                                            parseInt(e.target.value, 10) || 2,
                                        ),
                                    }))
                                }
                                className="max-w-[120px]"
                            />
                            <span className="text-muted-foreground text-xs">
                                hari sebelum Due Date
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button type="submit" disabled={isSaving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {isSaving
                        ? t('Menyimpan...')
                        : t('Simpan Kebijakan & SLA')}
                </Button>
            </div>
        </form>
    );
}
