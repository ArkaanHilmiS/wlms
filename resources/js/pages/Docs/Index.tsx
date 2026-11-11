import { useEffect } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import {
    ThumbsUp,
    ThumbsDown,
    ArrowLeft,
    ArrowRight,
    Book,
    List,
    LifeBuoy,
    ArrowUpRight,
    Edit3,
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface DocsProps {
    page?: {
        id: number | string;
        title: string;
        slug: string;
        content: Record<string, unknown> | string | null;
        updated_at: string;
    } | null;
    menu: {
        id: number | string;
        name: string;
        pages: {
            id: number | string;
            title: string;
            slug: string;
        }[];
    }[];
}

export default function DocsIndex({ page, menu }: DocsProps) {
    const { auth } = usePage().props as unknown as {
        auth?: { user?: { permissions?: string[]; roles?: string[] } };
    };
    const isSuperAdmin =
        auth?.user?.permissions?.includes('*') ||
        auth?.user?.roles?.some(
            (r: string) => r.toLowerCase() === 'superadmin',
        );

    const safeContent = page?.content ?? '';

    const editor = useEditor({
        extensions: [StarterKit],
        content: safeContent,
        editable: false,
    });

    useEffect(() => {
        if (editor && safeContent) {
            editor.commands.setContent(safeContent);
        }
    }, [safeContent, editor]);

    if (!page) {
        return (
            <>
                <Head title="Documentation" />
                <div className="bg-background min-h-full">
                    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-8 lg:py-12">
                        <div className="bg-card border-border mb-8 rounded-2xl border p-8 text-center shadow-sm md:p-10">
                            <h1 className="text-foreground mb-4 text-2xl font-bold tracking-tight md:text-3xl">
                                Belum Ada Dokumentasi
                            </h1>
                            <p className="text-muted-foreground">
                                Saat ini belum ada halaman dokumentasi yang
                                tersedia.
                            </p>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title={page.title} />
            <style>{`
                /* Modern Typography & Layout Matching Figma Mockup */
                .markdown-body h1 { display: none; /* Hide H1 since it's now in the layout header */ }
                .markdown-body > p:first-of-type, .markdown-body > p:nth-of-type(2) { display: none; /* Hide intro paras */ }
                
                .markdown-body h2 { font-size: 1.125rem; line-height: 1.75rem; font-weight: 700; letter-spacing: -0.01em; margin-top: 2.5em; margin-bottom: 1em; color: var(--foreground); display: flex; align-items: center; gap: 0.75rem; border-bottom: none; }
                .markdown-body h2::before { content: " "; display: block; width: 0.25rem; height: 1.25rem; background: var(--primary); border-radius: 2px; }
                
                .markdown-body p { margin-bottom: 1.25em; line-height: 1.7; color: var(--foreground); font-size: 0.95rem; }
                
                /* Tables */
                .markdown-body table { width: 100%; margin-bottom: 2em; border-collapse: separate; border-spacing: 0; font-size: 0.875rem; border-radius: var(--radius); overflow: hidden; border: 1px solid var(--border); }
                .markdown-body th, .markdown-body td { padding: 1rem 1.25rem; text-align: left; vertical-align: top; border-bottom: 1px solid var(--border); }
                .markdown-body th:not(:last-child), .markdown-body td:not(:last-child) { border-right: 1px solid var(--border); }
                .markdown-body tr:last-child td { border-bottom: none; }
                .markdown-body th { background: var(--muted); font-weight: 600; color: var(--foreground); }
                
                /* Numbered Lists - Workflow Style */
                .markdown-body ol { list-style-type: none; counter-reset: step-counter; padding-left: 0; display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2em; margin-top: 1.5em; }
                .markdown-body ol li { counter-increment: step-counter; position: relative; padding: 1.25rem 1.25rem 1.25rem 4rem; border: 1px solid var(--border); border-radius: var(--radius); background: transparent; }
                .markdown-body ol li::before { content: counter(step-counter); position: absolute; left: 1.25rem; top: 1.25rem; width: 1.75rem; height: 1.75rem; background: var(--foreground); color: var(--background); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.875rem; }
                
                .markdown-body ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1.25em; color: var(--foreground); }
                .markdown-body li { margin-bottom: 0.5em; line-height: 1.6; font-size: 0.95rem; }
                
                .markdown-body code { background: var(--muted); padding: 0.2em 0.4em; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.85em; color: var(--foreground); }
                .markdown-body pre { background: var(--muted); padding: 1rem; border-radius: var(--radius); overflow-x: auto; margin-bottom: 1.5em; border: 1px solid var(--border); }
                .markdown-body pre code { background: none; padding: 0; border: none; font-size: 0.875em; }
                
                /* TipTap Focus Outline removal */
                .ProseMirror:focus { outline: none; }
            `}</style>

            <div className="bg-background min-h-full">
                <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-8 lg:py-12">
                    {/* Global Header in a Card */}
                    <div className="bg-card border-border mb-8 rounded-2xl border p-8 shadow-sm md:p-10">
                        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
                            <div className="flex gap-2">
                                <span className="border-border bg-muted text-muted-foreground inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                                    WorkPulse Docs
                                </span>
                                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                    Standard Operating Procedure
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
                                <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>{' '}
                                    Diperbarui:{' '}
                                    {new Date(
                                        page.updated_at,
                                    ).toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </span>
                                {isSuperAdmin && (
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={`/admin/docs/${page.id}/edit`}
                                        >
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 gap-1.5 text-xs"
                                            >
                                                <Edit3 className="h-3.5 w-3.5" />{' '}
                                                Edit Dokumen
                                            </Button>
                                        </Link>
                                        <Link href="/admin/docs">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-muted-foreground h-7 text-xs"
                                            >
                                                CMS
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                        <h1 className="text-foreground mb-4 text-3xl leading-tight font-bold tracking-tight md:text-4xl lg:text-[40px]">
                            {page.title}
                        </h1>
                        <p className="text-muted-foreground max-w-4xl text-lg">
                            Dokumen ini adalah panduan standar untuk seluruh
                            anggota tim, Project Manager (PM), dan Developer
                            dalam menggunakan sistem WorkPulse (Workload Management
                            System).
                        </p>
                        <p className="text-muted-foreground mt-2 max-w-4xl text-lg">
                            Tujuan utama dari pedoman ini adalah agar skala
                            pekerjaan bisa diprioritaskan dengan tepat, laporan
                            dapat diukur dengan jelas, dan tidak ada pekerjaan
                            yang saling tumpang tindih.
                        </p>
                    </div>

                    {/* 2-Column Portal Layout */}
                    <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-12">
                        {/* Inner Left Sidebar */}
                        <div className="sticky top-8 col-span-4 hidden flex-col space-y-6 md:flex lg:col-span-3">
                            {/* Buku Panduan Block */}
                            <div className="border-border bg-card/50 rounded-xl border p-5">
                                <h3 className="text-foreground mb-4 flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
                                    <Book className="text-muted-foreground h-4 w-4" />{' '}
                                    Buku Panduan WorkPulse
                                </h3>
                                <div className="space-y-1">
                                    {menu.map((category) => (
                                        <div key={category.id}>
                                            <div className="text-muted-foreground mt-4 mb-2 px-2 text-xs font-semibold">
                                                {category.name}
                                            </div>
                                            {category.pages.map((p) => {
                                                const isActive =
                                                    p.slug === page.slug;
                                                return (
                                                    <Link
                                                        key={p.id}
                                                        href={`/docs/${p.slug}`}
                                                        className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${
                                                            isActive
                                                                ? 'text-foreground bg-muted/50 border-primary border-l-2 font-medium'
                                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                        }`}
                                                    >
                                                        {p.title}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* TOC Block */}
                            <div className="border-border bg-card/50 rounded-xl border p-5">
                                <h3 className="text-foreground mb-4 flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
                                    <List className="text-muted-foreground h-4 w-4" />{' '}
                                    Daftar Isi Halaman
                                </h3>
                                <div className="space-y-2">
                                    <a
                                        href="#"
                                        className="text-foreground hover:text-primary block text-sm transition-colors"
                                    >
                                        1. Tipe Tiket & Hirarki
                                    </a>
                                    <a
                                        href="#"
                                        className="text-muted-foreground hover:text-foreground block text-sm transition-colors"
                                    >
                                        2. Skala Prioritas & SLA
                                    </a>
                                    <a
                                        href="#"
                                        className="text-muted-foreground hover:text-foreground block text-sm transition-colors"
                                    >
                                        3. Skenario Modul Keranjang
                                    </a>
                                    <a
                                        href="#"
                                        className="text-muted-foreground hover:text-foreground block text-sm transition-colors"
                                    >
                                        4. Rangkuman Siklus Kerja
                                    </a>
                                </div>
                            </div>

                            {/* Support Card */}
                            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-900/50 dark:bg-blue-900/10">
                                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-400">
                                    <LifeBuoy className="h-4 w-4" /> Butuh
                                    Bantuan Tim?
                                </h3>
                                <p className="mb-3 text-xs text-blue-700/80 dark:text-blue-300/80">
                                    Jika Anda menemukan masalah sistem yang
                                    tidak tercantum, hubungi Tim IT Anda.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full border-blue-200 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900"
                                >
                                    Buka Tiket Bantuan{' '}
                                    <ArrowUpRight className="ml-1 h-3 w-3" />
                                </Button>
                            </div>
                        </div>

                        {/* Main Reading Canvas */}
                        <div className="col-span-1 md:col-span-8 lg:col-span-9">
                            <div className="bg-card border-border/80 relative rounded-2xl border p-6 shadow-sm md:p-10">
                                <div className="markdown-body max-w-none">
                                    <EditorContent editor={editor} />
                                </div>

                                <hr className="border-border my-10" />

                                {/* Feedback Widget */}
                                <div className="bg-muted/20 border-border mb-8 flex flex-col items-center justify-between gap-4 rounded-xl border p-6 sm:flex-row">
                                    <div className="text-foreground text-sm font-medium">
                                        Apakah dokumentasi panduan ini membantu
                                        Anda?
                                        <p className="text-muted-foreground mt-1 text-xs font-normal">
                                            Bantu kami meningkatkan kualitas
                                            dokumentasi operasional WorkPulse.
                                        </p>
                                    </div>
                                    <div className="flex w-full gap-2 sm:w-auto">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="bg-background w-full sm:w-auto"
                                        >
                                            <ThumbsUp className="mr-2 h-4 w-4" />{' '}
                                            Ya, sangat jelas
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="bg-background w-full sm:w-auto"
                                        >
                                            <ThumbsDown className="mr-2 h-4 w-4" />{' '}
                                            Kurang lengkap
                                        </Button>
                                    </div>
                                </div>

                                {/* Pagination */}
                                <div className="border-border/50 flex items-center justify-between border-t pt-4 text-sm">
                                    <a
                                        href="#"
                                        className="text-muted-foreground hover:text-foreground group flex flex-col transition-colors"
                                    >
                                        <span className="group-hover:text-foreground mb-1 text-xs">
                                            Sebelumnya
                                        </span>
                                        <span className="flex items-center gap-1 font-medium">
                                            <ArrowLeft className="h-4 w-4" />{' '}
                                            Konfigurasi Akun
                                        </span>
                                    </a>
                                    <a
                                        href="#"
                                        className="text-muted-foreground hover:text-foreground group flex flex-col items-end transition-colors"
                                    >
                                        <span className="group-hover:text-foreground mb-1 text-xs">
                                            Selanjutnya
                                        </span>
                                        <span className="flex items-center gap-1 font-medium">
                                            Alur Sprint & Backlog{' '}
                                            <ArrowRight className="h-4 w-4" />
                                        </span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

DocsIndex.layout = (page: React.ReactNode) => {
    return (
        <AppLayout breadcrumbs={[{ title: 'Documentation', href: '/docs' }]}>
            {page}
        </AppLayout>
    );
};


// Username : quinton.jaury@mii.co.id
// Username : Mochammad.Suhendar@mii.co.id
// Username : danu.febriansyah@mii.co.id
// Username : Abu.Mucholladin@mii.co.id
// Username : fabiansyah.pradipta@mii.co.id
// Username : bayu.pratama@mii.co.id
// Username : abiela.susilo@mii.co.id
// Username : Tri.Marsetia@mii.co.id
// Username : nashrullah.nashrull@mii.co.id