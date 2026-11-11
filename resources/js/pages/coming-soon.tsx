import { Head, Link } from '@inertiajs/react';
import { Hammer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ComingSoon({ title }: { title?: string }) {
    const pageTitle = title || 'Coming Soon';

    return (
        <>
            <Head title={pageTitle} />
            <div className="border-sidebar-border/70 dark:border-sidebar-border bg-card flex h-full flex-1 flex-col items-center justify-center rounded-xl border px-4 text-center">
                <div className="bg-primary/10 mb-6 rounded-full p-5">
                    <Hammer className="text-primary h-12 w-12" />
                </div>
                <h1 className="mb-3 text-3xl font-bold">
                    Halaman {pageTitle} Sedang Dibangun
                </h1>
                <p className="text-muted-foreground mb-8 max-w-lg text-lg">
                    Fitur ini masih dalam tahap pengembangan aktif oleh tim
                    engineering. Silakan kembali lagi nanti saat *sprint*
                    berikutnya dirilis!
                </p>
                <Button asChild size="lg">
                    <Link href="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Kembali ke Dashboard
                    </Link>
                </Button>
            </div>
        </>
    );
}

ComingSoon.layout = {
    breadcrumbs: [
        {
            title: 'Dalam Pengembangan',
            href: '#',
        },
    ],
};
