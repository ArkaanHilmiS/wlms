import { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, ExternalLink, Save } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface DocCategory {
    id: string;
    name: string;
    slug: string;
}

interface EditProps {
    page: {
        id: string | number;
        title: string;
        slug: string;
        category_id?: string | null;
        is_published?: boolean;
        content: Record<string, unknown> | string | null;
    };
    categories?: DocCategory[];
}

export default function DocsEdit({ page, categories = [] }: EditProps) {
    const [title, setTitle] = useState(page.title || '');
    const [categoryId, setCategoryId] = useState(page.category_id || '');
    const [isPublished, setIsPublished] = useState(page.is_published ?? true);

    const editor = useEditor({
        extensions: [StarterKit],
        content: page.content,
        shouldRerenderOnTransaction: true,
        immediatelyRender: false,
    });

    useEffect(() => {
        if (editor && page.content) {
            if (!editor.isEditable) {
                editor.commands.setContent(page.content);
            }
        }
    }, [page.content, editor]);

    const handleSave = () => {
        if (!editor) return;
        if (!title.trim()) {
            toast.error('Judul dokumen tidak boleh kosong.');
            return;
        }

        const toastId = toast.loading('Menyimpan dokumen...');
        router.put(
            `/settings/docs/${page.id}`,
            {
                title: title.trim(),
                category_id: categoryId || undefined,
                is_published: isPublished,
                content: editor.getJSON(),
            },
            {
                onSuccess: () => {
                    toast.success('Berhasil', {
                        id: toastId,
                        description: 'Dokumen telah berhasil disimpan.',
                    });
                },
                onError: () => {
                    toast.error('Gagal', {
                        id: toastId,
                        description:
                            'Gagal menyimpan dokumen. Silakan periksa kembali input.',
                    });
                },
            },
        );
    };

    return (
        <>
            <Head title={`Edit Docs: ${title || page.title}`} />
            <style>{`
                /* TipTap styling for Admin Editor */
                .ProseMirror:focus { outline: none; }
                .ProseMirror { min-height: 420px; padding: 1.25rem; font-size: 0.95rem; line-height: 1.7; }
                .ProseMirror p { margin-bottom: 1em; }
                .ProseMirror h1 { font-size: 1.875rem; font-weight: 700; margin-top: 1.5em; margin-bottom: 0.5em; }
                .ProseMirror h2 { font-size: 1.5rem; font-weight: 700; margin-top: 1.4em; margin-bottom: 0.5em; }
                .ProseMirror h3 { font-size: 1.25rem; font-weight: 600; margin-top: 1.2em; margin-bottom: 0.5em; }
                .ProseMirror ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; }
                .ProseMirror ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1em; }
                .ProseMirror blockquote { border-left: 3px solid var(--primary); padding-left: 1rem; font-style: italic; margin-bottom: 1em; color: var(--muted-foreground); }
                .ProseMirror pre { background: var(--muted); border-radius: 0.375rem; padding: 1rem; overflow-x: auto; margin-bottom: 1em; }
                .ProseMirror code { font-family: monospace; background: var(--muted); padding: 0.15rem 0.35rem; border-radius: 0.25rem; font-size: 0.875em; }
            `}</style>

            <div className="mx-auto max-w-4xl px-4 py-8">
                {/* Header Actions */}
                <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                        <Link href="/settings/docs">
                            <Button
                                variant="outline"
                                size="icon"
                                title="Kembali ke Pengaturan"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">
                                Edit Dokumen TipTap
                            </h1>
                            <p className="text-muted-foreground text-xs">
                                Slug:{' '}
                                <code className="text-foreground">
                                    /docs/{page.slug}
                                </code>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href={`/docs/${page.slug}`} target="_blank">
                            <Button
                                variant="outline"
                                className="gap-2"
                                title="Lihat Hasil"
                            >
                                <ExternalLink className="h-4 w-4" /> Pratinjau
                            </Button>
                        </Link>
                        <Button onClick={handleSave} className="gap-2">
                            <Save className="h-4 w-4" /> Simpan Dokumen
                        </Button>
                    </div>
                </div>

                {/* Metadata Card */}
                <div className="bg-card border-border mb-6 space-y-4 rounded-xl border p-5 shadow-sm">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="docTitle">Judul Dokumen *</Label>
                            <Input
                                id="docTitle"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Judul Dokumen..."
                                className="text-base font-medium"
                            />
                        </div>

                        {categories.length > 0 && (
                            <div className="space-y-1.5">
                                <Label htmlFor="docCategory">Kategori</Label>
                                <Select
                                    value={categoryId}
                                    onValueChange={setCategoryId}
                                >
                                    <SelectTrigger id="docCategory">
                                        <SelectValue placeholder="Pilih Kategori" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="checkbox"
                            id="editIsPublished"
                            checked={isPublished}
                            onChange={(e) => setIsPublished(e.target.checked)}
                            className="border-border text-primary focus:ring-primary h-4 w-4 rounded"
                        />
                        <Label
                            htmlFor="editIsPublished"
                            className="cursor-pointer text-sm font-normal"
                        >
                            Publikasikan halaman ini (Status:{' '}
                            <span
                                className={
                                    isPublished
                                        ? 'font-medium text-green-600'
                                        : 'text-muted-foreground'
                                }
                            >
                                {isPublished ? 'Published' : 'Draft'}
                            </span>
                            )
                        </Label>
                    </div>
                </div>

                {/* TipTap WYSIWYG Editor Container */}
                <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
                    {editor && (
                        <div className="border-border bg-muted/20 flex flex-wrap items-center gap-1.5 border-b p-3">
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() =>
                                    editor.chain().focus().toggleBold().run()
                                }
                                disabled={
                                    !editor
                                        .can()
                                        .chain()
                                        .focus()
                                        .toggleBold()
                                        .run()
                                }
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    editor.isActive('bold')
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground hover:bg-muted/80'
                                }`}
                            >
                                Bold
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() =>
                                    editor.chain().focus().toggleItalic().run()
                                }
                                disabled={
                                    !editor
                                        .can()
                                        .chain()
                                        .focus()
                                        .toggleItalic()
                                        .run()
                                }
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    editor.isActive('italic')
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground hover:bg-muted/80'
                                }`}
                            >
                                Italic
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() =>
                                    editor.chain().focus().toggleStrike().run()
                                }
                                disabled={
                                    !editor
                                        .can()
                                        .chain()
                                        .focus()
                                        .toggleStrike()
                                        .run()
                                }
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    editor.isActive('strike')
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground hover:bg-muted/80'
                                }`}
                            >
                                Strike
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() =>
                                    editor.chain().focus().toggleCode().run()
                                }
                                disabled={
                                    !editor
                                        .can()
                                        .chain()
                                        .focus()
                                        .toggleCode()
                                        .run()
                                }
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    editor.isActive('code')
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground hover:bg-muted/80'
                                }`}
                            >
                                Inline Code
                            </button>

                            <div className="bg-border mx-1 h-4 w-px" />

                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() =>
                                    editor.chain().focus().setParagraph().run()
                                }
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    editor.isActive('paragraph')
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground hover:bg-muted/80'
                                }`}
                            >
                                Paragraph
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() =>
                                    editor
                                        .chain()
                                        .focus()
                                        .toggleHeading({ level: 1 })
                                        .run()
                                }
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    editor.isActive('heading', { level: 1 })
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground hover:bg-muted/80'
                                }`}
                            >
                                H1
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() =>
                                    editor
                                        .chain()
                                        .focus()
                                        .toggleHeading({ level: 2 })
                                        .run()
                                }
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    editor.isActive('heading', { level: 2 })
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground hover:bg-muted/80'
                                }`}
                            >
                                H2
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() =>
                                    editor
                                        .chain()
                                        .focus()
                                        .toggleHeading({ level: 3 })
                                        .run()
                                }
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    editor.isActive('heading', { level: 3 })
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground hover:bg-muted/80'
                                }`}
                            >
                                H3
                            </button>

                            <div className="bg-border mx-1 h-4 w-px" />

                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() =>
                                    editor
                                        .chain()
                                        .focus()
                                        .toggleBulletList()
                                        .run()
                                }
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    editor.isActive('bulletList')
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground hover:bg-muted/80'
                                }`}
                            >
                                Bullet List
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() =>
                                    editor
                                        .chain()
                                        .focus()
                                        .toggleOrderedList()
                                        .run()
                                }
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    editor.isActive('orderedList')
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground hover:bg-muted/80'
                                }`}
                            >
                                Ordered List
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() =>
                                    editor
                                        .chain()
                                        .focus()
                                        .toggleBlockquote()
                                        .run()
                                }
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    editor.isActive('blockquote')
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground hover:bg-muted/80'
                                }`}
                            >
                                Quote
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() =>
                                    editor
                                        .chain()
                                        .focus()
                                        .toggleCodeBlock()
                                        .run()
                                }
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                    editor.isActive('codeBlock')
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground hover:bg-muted/80'
                                }`}
                            >
                                Code Block
                            </button>

                            <div className="bg-border mx-1 h-4 w-px" />

                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() =>
                                    editor.chain().focus().undo().run()
                                }
                                disabled={
                                    !editor.can().chain().focus().undo().run()
                                }
                                className="bg-muted text-foreground hover:bg-muted/80 rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40"
                            >
                                Undo
                            </button>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() =>
                                    editor.chain().focus().redo().run()
                                }
                                disabled={
                                    !editor.can().chain().focus().redo().run()
                                }
                                className="bg-muted text-foreground hover:bg-muted/80 rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40"
                            >
                                Redo
                            </button>
                        </div>
                    )}

                    <div className="markdown-body p-2">
                        <EditorContent editor={editor} />
                    </div>
                </div>
            </div>
        </>
    );
}

DocsEdit.layout = {
    breadcrumbs: [
        { title: 'Settings', href: '/settings/profile' },
        { title: 'Documentation', href: '/settings/docs' },
        { title: 'Edit', href: '#' },
    ],
};
