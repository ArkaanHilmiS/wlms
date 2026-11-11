import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    FileText,
    Edit2,
    Plus,
    Trash2,
    ExternalLink,
    Folder,
    Search,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslate } from '@/hooks/useTranslate';

interface DocCategory {
    id: string;
    name: string;
    slug: string;
    pages_count?: number;
}

interface DocPage {
    id: string;
    title: string;
    slug: string;
    is_published: boolean;
    updated_at: string;
    category?: { name: string };
}

interface Props {
    pages?: DocPage[];
    categories?: DocCategory[];
}

type SortField = 'title' | 'category' | 'status' | 'updated_at';
type SortOrder = 'asc' | 'desc';

export default function DocumentationSettings({
    pages = [],
    categories = [],
}: Props) {
    const { t } = useTranslate();

    // Tab state (persistent via query params)
    const [activeTab, setActiveTabState] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            if (tab) return tab;

            const saved = localStorage.getItem('settings-docs-tab');
            if (saved) return saved;
        }
        return 'pages';
    });

    const setActiveTab = (tab: string) => {
        setActiveTabState(tab);
        if (typeof window !== 'undefined') {
            localStorage.setItem('settings-docs-tab', tab);
            const url = new URL(window.location.href);
            url.searchParams.set('tab', tab);
            window.history.replaceState({}, '', url.toString());
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (!params.get('tab')) {
                const url = new URL(window.location.href);
                url.searchParams.set('tab', activeTab);
                window.history.replaceState({}, '', url.toString());
            }
        }
    }, [activeTab]);

    // Search, Filter, Sort & Pagination State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [sortField, setSortField] = useState<SortField>('updated_at');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [perPage, setPerPage] = useState<number>(10);
    const [currentPage, setCurrentPage] = useState<number>(1);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
        setCurrentPage(1);
    };

    // Filter & Sort Calculation
    const filteredAndSortedPages = useMemo(() => {
        let result = [...pages];

        // Search query filter (title, slug, category)
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(
                (p) =>
                    p.title.toLowerCase().includes(q) ||
                    p.slug.toLowerCase().includes(q) ||
                    (p.category?.name &&
                        p.category.name.toLowerCase().includes(q)),
            );
        }

        // Category filter
        if (selectedCategory !== 'all') {
            result = result.filter(
                (p) => p.category?.name === selectedCategory,
            );
        }

        // Status filter
        if (selectedStatus !== 'all') {
            const isPublished = selectedStatus === 'published';
            result = result.filter((p) => p.is_published === isPublished);
        }

        // Sorting
        result.sort((a, b) => {
            let valA: string | number = '';
            let valB: string | number = '';

            if (sortField === 'title') {
                valA = a.title.toLowerCase();
                valB = b.title.toLowerCase();
            } else if (sortField === 'category') {
                valA = (a.category?.name || '').toLowerCase();
                valB = (b.category?.name || '').toLowerCase();
            } else if (sortField === 'status') {
                valA = a.is_published ? 1 : 0;
                valB = b.is_published ? 1 : 0;
            } else if (sortField === 'updated_at') {
                valA = new Date(a.updated_at).getTime();
                valB = new Date(b.updated_at).getTime();
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [
        pages,
        searchQuery,
        selectedCategory,
        selectedStatus,
        sortField,
        sortOrder,
    ]);

    // Pagination calculations
    const totalItems = filteredAndSortedPages.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    const safeCurrentPage = Math.min(currentPage, totalPages);

    const paginatedPages = useMemo(() => {
        const start = (safeCurrentPage - 1) * perPage;
        return filteredAndSortedPages.slice(start, start + perPage);
    }, [filteredAndSortedPages, safeCurrentPage, perPage]);

    const startItem =
        totalItems === 0 ? 0 : (safeCurrentPage - 1) * perPage + 1;
    const endItem = Math.min(totalItems, safeCurrentPage * perPage);

    // Create modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [categoryName, setCategoryName] = useState('');
    const [isPublished, setIsPublished] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete modal state
    const [pageToDelete, setPageToDelete] = useState<DocPage | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Category modal state
    const [isCreateCatOpen, setIsCreateCatOpen] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [isSubmittingCat, setIsSubmittingCat] = useState(false);

    // Delete category modal state
    const [catToDelete, setCatToDelete] = useState<DocCategory | null>(null);
    const [isDeletingCat, setIsDeletingCat] = useState(false);

    const handleTitleChange = (val: string) => {
        setTitle(val);
        const generatedSlug = val
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        setSlug(generatedSlug);
    };

    const handleCreatePage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error('Judul halaman wajib diisi.');
            return;
        }

        setIsSubmitting(true);
        router.post(
            '/settings/docs',
            {
                title: title.trim(),
                slug: slug.trim() || undefined,
                category_id:
                    categoryId && categoryId !== 'NEW' ? categoryId : null,
                category_name:
                    categoryId === 'NEW' ? categoryName.trim() : null,
                is_published: isPublished,
            },
            {
                onSuccess: () => {
                    setIsCreateOpen(false);
                    toast.success(
                        'Halaman berhasil dibuat, mengalihkan ke editor TipTap...',
                    );
                },
                onError: (errors) => {
                    const firstMsg = Object.values(errors)[0] as string;
                    toast.error(
                        firstMsg || 'Gagal membuat halaman dokumentasi.',
                    );
                },
                onFinish: () => setIsSubmitting(false),
            },
        );
    };

    const handleDeletePage = () => {
        if (!pageToDelete) return;

        setIsDeleting(true);
        router.delete(`/settings/docs/${pageToDelete.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setPageToDelete(null);
                toast.success('Halaman dokumentasi berhasil dihapus.');
            },
            onError: () => {
                toast.error('Gagal menghapus halaman dokumentasi.');
            },
            onFinish: () => setIsDeleting(false),
        });
    };

    const handleCreateCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCatName.trim()) {
            toast.error('Nama kategori wajib diisi.');
            return;
        }

        setIsSubmittingCat(true);
        router.post(
            '/settings/doc-categories',
            { name: newCatName.trim() },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsCreateCatOpen(false);
                    setNewCatName('');
                    toast.success('Kategori berhasil ditambahkan.');
                },
                onError: (errors) => {
                    const firstMsg = Object.values(errors)[0] as string;
                    toast.error(firstMsg || 'Gagal menambahkan kategori.');
                },
                onFinish: () => setIsSubmittingCat(false),
            },
        );
    };

    const handleDeleteCategory = () => {
        if (!catToDelete) return;

        setIsDeletingCat(true);
        router.delete(`/settings/doc-categories/${catToDelete.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setCatToDelete(null);
                toast.success('Kategori berhasil dihapus.');
            },
            onError: () => {
                toast.error('Gagal menghapus kategori.');
            },
            onFinish: () => setIsDeletingCat(false),
        });
    };

    // Quick-toggle publication state
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const handleTogglePublish = (page: DocPage) => {
        setTogglingId(page.id);
        router.put(
            `/settings/docs/${page.id}`,
            { is_published: !page.is_published },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(
                        !page.is_published
                            ? 'Halaman berhasil dipublikasikan.'
                            : 'Status halaman diubah ke Draft.',
                    );
                },
                onError: () => {
                    toast.error('Gagal memperbarui status publikasi.');
                },
                onFinish: () => setTogglingId(null),
            },
        );
    };

    return (
        <>
            <Head title={t('Documentation Settings')} />

            <div className="space-y-8">
                <Card>
                    <CardHeader className="border-border flex flex-col items-start justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center">
                        <div className="space-y-1">
                            <CardTitle>{t('Documentation')}</CardTitle>
                            <CardDescription>
                                {t(
                                    'Kelola halaman dokumentasi, SOP, dan buku panduan WorkPulse dengan TipTap editor.',
                                )}
                            </CardDescription>
                        </div>
                        <div className="flex-shrink-0">
                            {activeTab === 'pages' ? (
                                <Button
                                    onClick={() => setIsCreateOpen(true)}
                                    className="gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    {t('Tambah Halaman')}
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => setIsCreateCatOpen(true)}
                                    className="gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    {t('Tambah Kategori')}
                                </Button>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="pt-6">
                        <Tabs
                            value={activeTab}
                            onValueChange={setActiveTab}
                            className="w-full"
                        >
                            <div className="pb-4">
                                <TabsList className="grid w-full max-w-xs grid-cols-2">
                                    <TabsTrigger value="pages">
                                        {t('Halaman')} ({pages.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="categories">
                                        {t('Kategori')} ({categories.length})
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            {/* Tab 1: Daftar Halaman dengan Search, Filter, Sort & Pagination */}
                            <TabsContent
                                value="pages"
                                className="mt-0 space-y-4"
                            >
                                {/* Search Bar & Filter Controls */}
                                <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                                    <div className="relative max-w-sm flex-1">
                                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                        <Input
                                            placeholder="Cari judul, slug, atau kategori..."
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                            className="h-9 pl-9"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={selectedCategory}
                                            onValueChange={(val) => {
                                                setSelectedCategory(val);
                                                setCurrentPage(1);
                                            }}
                                        >
                                            <SelectTrigger className="h-9 w-[160px]">
                                                <SelectValue placeholder="Semua Kategori" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Semua Kategori
                                                </SelectItem>
                                                {categories.map((c) => (
                                                    <SelectItem
                                                        key={c.id}
                                                        value={c.name}
                                                    >
                                                        {c.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Select
                                            value={selectedStatus}
                                            onValueChange={(val) => {
                                                setSelectedStatus(val);
                                                setCurrentPage(1);
                                            }}
                                        >
                                            <SelectTrigger className="h-9 w-[140px]">
                                                <SelectValue placeholder="Semua Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Semua Status
                                                </SelectItem>
                                                <SelectItem value="published">
                                                    Published
                                                </SelectItem>
                                                <SelectItem value="draft">
                                                    Draft
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Table with Clickable Sort Headers */}
                                <div className="border-border overflow-hidden rounded-lg border">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-muted/50 text-muted-foreground border-border border-b">
                                            <tr>
                                                <th
                                                    className="hover:text-foreground cursor-pointer px-5 py-3 font-medium transition-colors select-none"
                                                    onClick={() =>
                                                        handleSort('title')
                                                    }
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <span>
                                                            Judul Halaman
                                                        </span>
                                                        {sortField ===
                                                        'title' ? (
                                                            sortOrder ===
                                                            'asc' ? (
                                                                <ArrowUp className="text-primary h-3.5 w-3.5" />
                                                            ) : (
                                                                <ArrowDown className="text-primary h-3.5 w-3.5" />
                                                            )
                                                        ) : (
                                                            <ArrowUpDown className="text-muted-foreground/40 h-3.5 w-3.5" />
                                                        )}
                                                    </div>
                                                </th>
                                                <th
                                                    className="hover:text-foreground cursor-pointer px-5 py-3 font-medium transition-colors select-none"
                                                    onClick={() =>
                                                        handleSort('category')
                                                    }
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <span>Kategori</span>
                                                        {sortField ===
                                                        'category' ? (
                                                            sortOrder ===
                                                            'asc' ? (
                                                                <ArrowUp className="text-primary h-3.5 w-3.5" />
                                                            ) : (
                                                                <ArrowDown className="text-primary h-3.5 w-3.5" />
                                                            )
                                                        ) : (
                                                            <ArrowUpDown className="text-muted-foreground/40 h-3.5 w-3.5" />
                                                        )}
                                                    </div>
                                                </th>
                                                <th
                                                    className="hover:text-foreground cursor-pointer px-5 py-3 font-medium transition-colors select-none"
                                                    onClick={() =>
                                                        handleSort('status')
                                                    }
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <span>Status</span>
                                                        {sortField ===
                                                        'status' ? (
                                                            sortOrder ===
                                                            'asc' ? (
                                                                <ArrowUp className="text-primary h-3.5 w-3.5" />
                                                            ) : (
                                                                <ArrowDown className="text-primary h-3.5 w-3.5" />
                                                            )
                                                        ) : (
                                                            <ArrowUpDown className="text-muted-foreground/40 h-3.5 w-3.5" />
                                                        )}
                                                    </div>
                                                </th>
                                                <th
                                                    className="hover:text-foreground cursor-pointer px-5 py-3 font-medium transition-colors select-none"
                                                    onClick={() =>
                                                        handleSort('updated_at')
                                                    }
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <span>Diperbarui</span>
                                                        {sortField ===
                                                        'updated_at' ? (
                                                            sortOrder ===
                                                            'asc' ? (
                                                                <ArrowUp className="text-primary h-3.5 w-3.5" />
                                                            ) : (
                                                                <ArrowDown className="text-primary h-3.5 w-3.5" />
                                                            )
                                                        ) : (
                                                            <ArrowUpDown className="text-muted-foreground/40 h-3.5 w-3.5" />
                                                        )}
                                                    </div>
                                                </th>
                                                <th className="px-5 py-3 text-right font-medium">
                                                    Aksi
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-border divide-y">
                                            {paginatedPages.map((page) => (
                                                <tr
                                                    key={page.id}
                                                    className="hover:bg-muted/30 transition-colors"
                                                >
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-2.5">
                                                            <FileText className="text-primary h-4 w-4 shrink-0" />
                                                            <div>
                                                                <span className="text-foreground block font-medium">
                                                                    {page.title}
                                                                </span>
                                                                <span className="text-muted-foreground font-mono text-xs">
                                                                    /docs/
                                                                    {page.slug}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-muted-foreground px-5 py-3.5">
                                                        {page.category?.name ||
                                                            '-'}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                togglingId ===
                                                                page.id
                                                            }
                                                            onClick={() =>
                                                                handleTogglePublish(
                                                                    page,
                                                                )
                                                            }
                                                            className="inline-flex cursor-pointer transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                                                            title={
                                                                page.is_published
                                                                    ? 'Klik untuk ubah ke Draft'
                                                                    : 'Klik untuk Publikasikan'
                                                            }
                                                        >
                                                            {page.is_published ? (
                                                                <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset dark:bg-green-500/10 dark:text-green-400">
                                                                    Published
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-500/10 ring-inset dark:bg-white/5 dark:text-gray-400">
                                                                    Draft
                                                                </span>
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td className="text-muted-foreground px-5 py-3.5 text-xs whitespace-nowrap">
                                                        {new Date(
                                                            page.updated_at,
                                                        ).toLocaleDateString(
                                                            'id-ID',
                                                            {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                year: 'numeric',
                                                            },
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Link
                                                                href={`/docs/${page.slug}`}
                                                                target="_blank"
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 px-2"
                                                                    title="Pratinjau Halaman"
                                                                >
                                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </Link>
                                                            <Link
                                                                href={`/settings/docs/${page.id}/edit`}
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 gap-1.5"
                                                                >
                                                                    <Edit2 className="h-3.5 w-3.5" />{' '}
                                                                    Edit
                                                                </Button>
                                                            </Link>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                                                                onClick={() =>
                                                                    setPageToDelete(
                                                                        page,
                                                                    )
                                                                }
                                                                title="Hapus"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {paginatedPages.length === 0 && (
                                                <tr>
                                                    <td
                                                        colSpan={5}
                                                        className="text-muted-foreground px-5 py-8 text-center"
                                                    >
                                                        {searchQuery ||
                                                        selectedCategory !==
                                                            'all' ||
                                                        selectedStatus !== 'all'
                                                            ? 'Tidak ada dokumen yang cocok dengan filter pencarian.'
                                                            : 'Belum ada halaman dokumentasi. Klik "Tambah Halaman" untuk membuat.'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Footer Bar */}
                                {totalItems > 0 && (
                                    <div className="text-muted-foreground flex flex-col items-center justify-between gap-4 pt-2 text-xs sm:flex-row">
                                        <div className="flex items-center gap-4">
                                            <span>
                                                Menampilkan{' '}
                                                <strong className="text-foreground font-semibold">
                                                    {startItem}
                                                </strong>{' '}
                                                -{' '}
                                                <strong className="text-foreground font-semibold">
                                                    {endItem}
                                                </strong>{' '}
                                                dari{' '}
                                                <strong className="text-foreground font-semibold">
                                                    {totalItems}
                                                </strong>{' '}
                                                dokumen
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <span>Baris:</span>
                                                <Select
                                                    value={String(perPage)}
                                                    onValueChange={(val) => {
                                                        setPerPage(Number(val));
                                                        setCurrentPage(1);
                                                    }}
                                                >
                                                    <SelectTrigger className="h-7 w-[68px] text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="10">
                                                            10
                                                        </SelectItem>
                                                        <SelectItem value="20">
                                                            20
                                                        </SelectItem>
                                                        <SelectItem value="50">
                                                            50
                                                        </SelectItem>
                                                        <SelectItem value="100">
                                                            100
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span>
                                                Halaman{' '}
                                                <strong className="text-foreground font-semibold">
                                                    {safeCurrentPage}
                                                </strong>{' '}
                                                dari{' '}
                                                <strong className="text-foreground font-semibold">
                                                    {totalPages}
                                                </strong>
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 w-7 p-0"
                                                    disabled={
                                                        safeCurrentPage <= 1
                                                    }
                                                    onClick={() =>
                                                        setCurrentPage((p) =>
                                                            Math.max(1, p - 1),
                                                        )
                                                    }
                                                    title="Halaman Sebelumnya"
                                                >
                                                    <ChevronLeft className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 w-7 p-0"
                                                    disabled={
                                                        safeCurrentPage >=
                                                        totalPages
                                                    }
                                                    onClick={() =>
                                                        setCurrentPage((p) =>
                                                            Math.min(
                                                                totalPages,
                                                                p + 1,
                                                            ),
                                                        )
                                                    }
                                                    title="Halaman Selanjutnya"
                                                >
                                                    <ChevronRight className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </TabsContent>

                            {/* Tab 2: Kategori */}
                            <TabsContent value="categories" className="mt-0">
                                <div className="border-border overflow-hidden rounded-lg border">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-muted/50 text-muted-foreground border-border border-b">
                                            <tr>
                                                <th className="px-5 py-3 font-medium">
                                                    Nama Kategori
                                                </th>
                                                <th className="px-5 py-3 font-medium">
                                                    Slug
                                                </th>
                                                <th className="px-5 py-3 font-medium">
                                                    Jumlah Dokumen
                                                </th>
                                                <th className="px-5 py-3 text-right font-medium">
                                                    Aksi
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-border divide-y">
                                            {categories.map((cat) => (
                                                <tr
                                                    key={cat.id}
                                                    className="hover:bg-muted/30 transition-colors"
                                                >
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-2.5">
                                                            <Folder className="text-primary h-4 w-4 shrink-0" />
                                                            <span className="text-foreground font-medium">
                                                                {cat.name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="text-muted-foreground px-5 py-3.5 font-mono text-xs">
                                                        {cat.slug}
                                                    </td>
                                                    <td className="text-muted-foreground px-5 py-3.5 text-xs">
                                                        <span className="bg-muted text-foreground inline-flex items-center rounded-md px-2 py-1 text-xs font-medium">
                                                            {cat.pages_count ??
                                                                0}{' '}
                                                            dokumen
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                                                            onClick={() =>
                                                                setCatToDelete(
                                                                    cat,
                                                                )
                                                            }
                                                            title="Hapus Kategori"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {categories.length === 0 && (
                                                <tr>
                                                    <td
                                                        colSpan={4}
                                                        className="text-muted-foreground px-5 py-8 text-center"
                                                    >
                                                        Belum ada kategori
                                                        terdaftar. Klik "Tambah
                                                        Kategori" untuk membuat.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>

            {/* Modal Tambah Halaman */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <form onSubmit={handleCreatePage}>
                        <DialogHeader>
                            <DialogTitle>
                                Tambah Halaman Dokumentasi
                            </DialogTitle>
                            <DialogDescription>
                                Masukkan judul dan kategori dokumen. Halaman
                                baru akan langsung dibuka di TipTap editor.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="title">Judul Halaman *</Label>
                                <Input
                                    id="title"
                                    placeholder="contoh: Panduan Penggunaan Workspace"
                                    value={title}
                                    onChange={(e) =>
                                        handleTitleChange(e.target.value)
                                    }
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="slug">Slug URL</Label>
                                <Input
                                    id="slug"
                                    placeholder="contoh: panduan-workspace"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                />
                                <p className="text-muted-foreground text-xs">
                                    Akan dapat diakses di{' '}
                                    <code className="text-foreground">
                                        /docs/{slug || '...'}
                                    </code>
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="category">Kategori</Label>
                                <Select
                                    value={categoryId}
                                    onValueChange={setCategoryId}
                                >
                                    <SelectTrigger
                                        id="category"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Pilih Kategori (atau Buat Baru)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem
                                                key={cat.id}
                                                value={cat.id}
                                            >
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                        <SelectItem value="NEW">
                                            + Kategori Baru...
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {categoryId === 'NEW' && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="categoryName">
                                        Nama Kategori Baru *
                                    </Label>
                                    <Input
                                        id="categoryName"
                                        placeholder="contoh: Integrasi API"
                                        value={categoryName}
                                        onChange={(e) =>
                                            setCategoryName(e.target.value)
                                        }
                                        required
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isPublished"
                                    checked={isPublished}
                                    onChange={(e) =>
                                        setIsPublished(e.target.checked)
                                    }
                                    className="border-border text-primary focus:ring-primary h-4 w-4 rounded"
                                />
                                <Label
                                    htmlFor="isPublished"
                                    className="cursor-pointer font-normal"
                                >
                                    Langsung publikasikan (Published)
                                </Label>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateOpen(false)}
                                disabled={isSubmitting}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || !title.trim()}
                            >
                                {isSubmitting
                                    ? 'Membuat...'
                                    : 'Buat & Tulis Dokumen'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Konfirmasi Hapus Halaman */}
            <Dialog
                open={!!pageToDelete}
                onOpenChange={(open) => !open && setPageToDelete(null)}
            >
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Hapus Halaman Dokumentasi?</DialogTitle>
                        <DialogDescription>
                            Halaman <strong>{pageToDelete?.title}</strong> akan
                            dihapus permanen. Tindakan ini tidak dapat
                            dibatalkan.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setPageToDelete(null)}
                            disabled={isDeleting}
                        >
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeletePage}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Tambah Kategori */}
            <Dialog open={isCreateCatOpen} onOpenChange={setIsCreateCatOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <form onSubmit={handleCreateCategory}>
                        <DialogHeader>
                            <DialogTitle>Tambah Kategori</DialogTitle>
                            <DialogDescription>
                                Masukkan nama kategori baru untuk mengelompokkan
                                dokumen.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="newCatName">
                                    Nama Kategori *
                                </Label>
                                <Input
                                    id="newCatName"
                                    placeholder="contoh: Standar Operasional Prosedur"
                                    value={newCatName}
                                    onChange={(e) =>
                                        setNewCatName(e.target.value)
                                    }
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateCatOpen(false)}
                                disabled={isSubmittingCat}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmittingCat || !newCatName.trim()}
                            >
                                {isSubmittingCat
                                    ? 'Menyimpan...'
                                    : 'Simpan Kategori'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Konfirmasi Hapus Kategori */}
            <Dialog
                open={!!catToDelete}
                onOpenChange={(open) => !open && setCatToDelete(null)}
            >
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Hapus Kategori?</DialogTitle>
                        <DialogDescription>
                            Kategori <strong>{catToDelete?.name}</strong> akan
                            dihapus. Dokumen di dalam kategori ini akan otomatis
                            dialihkan ke kategori General agar data tidak
                            hilang.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setCatToDelete(null)}
                            disabled={isDeletingCat}
                        >
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteCategory}
                            disabled={isDeletingCat}
                        >
                            {isDeletingCat ? 'Menghapus...' : 'Ya, Hapus'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

DocumentationSettings.layout = {
    breadcrumbs: [
        { title: 'Settings', href: '/settings/profile' },
        { title: 'Documentation', href: '/settings/docs' },
    ],
};
