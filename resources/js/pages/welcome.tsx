import { Head, Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ArrowRight,
    CheckCircle2,
    ShieldCheck,
    Kanban,
    KeyRound,
    FileSpreadsheet,
    Activity,
    Users,
    BookOpen,
    Sparkles,
    Layers,
    Cpu,
    ExternalLink,
    Clock,
    Lock,
} from 'lucide-react';
import { dashboard, login } from '@/routes';

export default function Welcome() {
    const { auth } = usePage<any>().props;
    const dashboardUrl = dashboard();
    const loginUrl = login();

    return (
        <>
            <Head title="WorkPulse — Enterprise Workload & Operations System" />

            <div className="min-h-screen bg-background text-foreground selection:bg-blue-600 selection:text-white">
                {/* Background ambient decorative glows */}
                <div className="pointer-events-none fixed inset-0 overflow-hidden">
                    <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-gradient-to-b from-blue-500/10 via-indigo-500/5 to-transparent blur-3xl" />
                    <div className="absolute top-1/3 -left-40 h-[400px] w-[500px] rounded-full bg-blue-600/5 blur-3xl" />
                    <div className="absolute top-2/3 -right-40 h-[400px] w-[500px] rounded-full bg-indigo-600/5 blur-3xl" />
                </div>

                {/* 1. Header / Navigation */}
                <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
                    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                        {/* Brand Logo */}
                        <Link href="/" className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm ring-1 ring-white/20">
                                <AppLogoIcon className="h-5 w-5 fill-current text-white" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold tracking-tight text-foreground">
                                    WorkPulse
                                </span>
                                <Badge
                                    variant="outline"
                                    className="border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400 text-[10px] font-semibold tracking-wider uppercase"
                                >
                                    Enterprise
                                </Badge>
                            </div>
                        </Link>

                        {/* Nav Links */}
                        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
                            <a
                                href="#features"
                                className="transition-colors hover:text-foreground"
                            >
                                Features
                            </a>
                            <a
                                href="#architecture"
                                className="transition-colors hover:text-foreground"
                            >
                                Architecture
                            </a>
                            <a
                                href="#security"
                                className="transition-colors hover:text-foreground"
                            >
                                Security & Passkeys
                            </a>
                            <Link
                                href="/docs"
                                className="transition-colors hover:text-foreground flex items-center gap-1"
                            >
                                Documentation
                            </Link>
                        </nav>

                        {/* CTA / Auth actions */}
                        <div className="flex items-center gap-3">
                            {auth?.user ? (
                                <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
                                    <Link href={dashboardUrl}>
                                        Dashboard
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            ) : (
                                <>
                                    <Button variant="ghost" asChild className="text-sm">
                                        <Link href={loginUrl}>Sign in</Link>
                                    </Button>
                                    <Button asChild className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm">
                                        <Link href={loginUrl}>
                                            Launch Console
                                            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                        </Link>
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <main className="relative">
                    {/* 2. Hero Section */}
                    <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
                            {/* Version Pill */}
                            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 mb-8 backdrop-blur-sm animate-fade-in">
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>WorkPulse v2.0 • Precision Workload & Governance</span>
                            </div>

                            {/* Headline */}
                            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl sm:leading-[1.1] mb-6">
                                Precision Workload Management for{' '}
                                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
                                    High-Velocity Teams
                                </span>
                            </h1>

                            {/* Subtitle */}
                            <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed mb-10">
                                Unify cross-functional squads, hierarchical organization units,
                                and contextual RBAC governance in one lightning-fast platform
                                powered by Clean Architecture.
                            </p>

                            {/* Hero CTAs */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                                <Button
                                    asChild
                                    size="lg"
                                    className="h-12 px-8 bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 w-full sm:w-auto text-base"
                                >
                                    <Link href={auth?.user ? dashboardUrl : loginUrl}>
                                        {auth?.user ? 'Go to Dashboard' : 'Enter WorkPulse Console'}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="lg"
                                    variant="outline"
                                    className="h-12 px-8 border-border hover:bg-muted/50 w-full sm:w-auto text-base"
                                >
                                    <Link href={loginUrl}>
                                        <KeyRound className="mr-2 h-4 w-4 text-blue-600" />
                                        Sign in with Passkey
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="lg"
                                    variant="ghost"
                                    className="h-12 px-6 text-muted-foreground hover:text-foreground w-full sm:w-auto text-base"
                                >
                                    <Link href="/docs">
                                        <BookOpen className="mr-2 h-4 w-4" />
                                        Read Docs
                                    </Link>
                                </Button>
                            </div>

                            {/* 3. Hero Visual Preview / Application Mockup */}
                            <div className="mx-auto max-w-5xl rounded-2xl border border-border/80 bg-card/60 p-2 shadow-2xl backdrop-blur-xl sm:p-4">
                                <div className="rounded-xl border border-border/60 bg-background overflow-hidden">
                                    {/* Mock Browser Window Chrome */}
                                    <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-full bg-red-500/80" />
                                            <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                                            <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                                            <span className="ml-2 text-xs font-medium text-muted-foreground font-mono">
                                                workpulse.enterprise / workspaces / core-banking
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                                </span>
                                                Live Sync
                                            </span>
                                            <Badge variant="outline" className="text-[11px] font-normal">
                                                Sprint 14 Active
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Mock Board Content */}
                                    <div className="p-4 sm:p-6 text-left">
                                        {/* Mock KPI Strip */}
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
                                            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                                                <div className="text-[11px] font-medium text-muted-foreground uppercase">
                                                    Active Projects
                                                </div>
                                                <div className="text-xl font-bold mt-1">24</div>
                                                <div className="text-[11px] text-emerald-600 font-medium">
                                                    +12% this cycle
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                                                <div className="text-[11px] font-medium text-muted-foreground uppercase">
                                                    Task Completion
                                                </div>
                                                <div className="text-xl font-bold mt-1">94.8%</div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    682 of 720 tasks
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                                                <div className="text-[11px] font-medium text-muted-foreground uppercase">
                                                    RBAC Security
                                                </div>
                                                <div className="text-xl font-bold mt-1 text-emerald-600">
                                                    Enforced
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    IDOR-Free Gates
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                                                <div className="text-[11px] font-medium text-muted-foreground uppercase">
                                                    Authentication
                                                </div>
                                                <div className="text-xl font-bold mt-1 text-blue-600">
                                                    FIDO2
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    Passkeys Enabled
                                                </div>
                                            </div>
                                        </div>

                                        {/* Mock Kanban Columns */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {/* Column: To Do */}
                                            <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
                                                <div className="flex items-center justify-between text-xs font-semibold mb-3">
                                                    <span>TO DO</span>
                                                    <Badge variant="secondary" className="text-[10px]">3</Badge>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="rounded-md border border-border/60 bg-card p-3 shadow-sm">
                                                        <div className="text-xs font-medium">
                                                            Vendor User Onboarding & Auth API
                                                        </div>
                                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                                                            <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-600">
                                                                High
                                                            </Badge>
                                                            <span>WP-104</span>
                                                        </div>
                                                    </div>
                                                    <div className="rounded-md border border-border/60 bg-card p-3 shadow-sm">
                                                        <div className="text-xs font-medium">
                                                            OAuth2 Token Rotation Pipeline
                                                        </div>
                                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                                                            <Badge variant="outline" className="text-[9px]">
                                                                Medium
                                                            </Badge>
                                                            <span>WP-108</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Column: In Progress */}
                                            <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
                                                <div className="flex items-center justify-between text-xs font-semibold mb-3">
                                                    <span>IN PROGRESS</span>
                                                    <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600">2</Badge>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="rounded-md border border-border/60 bg-card p-3 shadow-sm ring-1 ring-blue-500/30">
                                                        <div className="text-xs font-medium text-foreground">
                                                            Spreadsheet Bulk Import Engine
                                                        </div>
                                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                                                            <Badge variant="outline" className="text-[9px] border-red-500/30 text-red-600">
                                                                Urgent
                                                            </Badge>
                                                            <span className="text-blue-600 font-mono">WP-98</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Column: Done */}
                                            <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
                                                <div className="flex items-center justify-between text-xs font-semibold mb-3">
                                                    <span>DONE</span>
                                                    <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600">8</Badge>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="rounded-md border border-border/60 bg-card p-3 shadow-sm opacity-90">
                                                        <div className="text-xs font-medium line-through text-muted-foreground">
                                                            FIDO2 Passkeys & Biometric Login
                                                        </div>
                                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                                                            <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-600">
                                                                Complete
                                                            </Badge>
                                                            <span>WP-82</span>
                                                        </div>
                                                    </div>
                                                    <div className="rounded-md border border-border/60 bg-card p-3 shadow-sm opacity-90">
                                                        <div className="text-xs font-medium line-through text-muted-foreground">
                                                            Context-Aware RBAC Policies
                                                        </div>
                                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                                                            <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-600">
                                                                Complete
                                                            </Badge>
                                                            <span>WP-76</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 4. Core Features Bento Grid */}
                    <section id="features" className="py-20 border-t border-border/50 bg-muted/20">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            <div className="text-center max-w-3xl mx-auto mb-16">
                                <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">
                                    Enterprise Capabilities
                                </h2>
                                <h3 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                                    Engineered for Speed, Governance, and Control
                                </h3>
                                <p className="mt-4 text-base text-muted-foreground">
                                    Every component is tailored to eradicate bottlenecks, ensure bulletproof access control, and deliver instant clarity across complex teams.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Feature 1 */}
                                <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 mb-5">
                                        <ShieldCheck className="h-6 w-6" />
                                    </div>
                                    <h4 className="text-lg font-semibold mb-2">
                                        Context-Aware RBAC
                                    </h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Grant global, workspace, or project-scoped roles with zero permission bleed. Anti-IDOR security guards protect every sensitive endpoint.
                                    </p>
                                </div>

                                {/* Feature 2 */}
                                <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 mb-5">
                                        <Kanban className="h-6 w-6" />
                                    </div>
                                    <h4 className="text-lg font-semibold mb-2">
                                        Kanban & Sprint Lifecycles
                                    </h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Seamlessly manage issues, transitions, backlog grooming, and worklogs. Adapts dynamically to S / M / L display density.
                                    </p>
                                </div>

                                {/* Feature 3 */}
                                <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 mb-5">
                                        <KeyRound className="h-6 w-6" />
                                    </div>
                                    <h4 className="text-lg font-semibold mb-2">
                                        FIDO2 / WebAuthn Passkeys
                                    </h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Passwordless biometric logins using Touch ID, Face ID, and hardware security keys. Phishing-proof public key cryptography.
                                    </p>
                                </div>

                                {/* Feature 4 */}
                                <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 mb-5">
                                        <FileSpreadsheet className="h-6 w-6" />
                                    </div>
                                    <h4 className="text-lg font-semibold mb-2">
                                        Spreadsheet Batch Importer
                                    </h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Import hundreds of projects, issues, and bulk users via asynchronous background jobs with real-time live preview and typo correction.
                                    </p>
                                </div>

                                {/* Feature 5 */}
                                <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 mb-5">
                                        <Activity className="h-6 w-6" />
                                    </div>
                                    <h4 className="text-lg font-semibold mb-2">
                                        Real-Time Analytics & Audit
                                    </h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Executive dashboards with completion rates, overdue task tracking, workload distribution, and complete immutable audit trails.
                                    </p>
                                </div>

                                {/* Feature 6 */}
                                <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 mb-5">
                                        <Layers className="h-6 w-6" />
                                    </div>
                                    <h4 className="text-lg font-semibold mb-2">
                                        Modular Clean Architecture
                                    </h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Clean Domain-Application-Infrastructure separation, CQRS query patterns, PHPStan Level 7 enforcement, and 200+ unit & feature tests.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 5. Architecture & Security Section */}
                    <section id="architecture" className="py-20 border-t border-border/50">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                                <div>
                                    <Badge variant="outline" className="mb-4 text-blue-600 border-blue-500/30">
                                        Architectural Invariants
                                    </Badge>
                                    <h3 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-6">
                                        Built on Enterprise Clean Architecture & CQRS
                                    </h3>
                                    <p className="text-muted-foreground text-base leading-relaxed mb-6">
                                        WorkPulse strictly isolates business domain models from persistence layers. Every user action is audited, verified against RBAC permissions, and protected by asynchronous workers.
                                    </p>

                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                                            <div>
                                                <div className="font-semibold text-sm">Automated Test Barrier</div>
                                                <div className="text-xs text-muted-foreground">
                                                    200+ Pest tests enforce security, domain logic, and architectural rules on every commit.
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                                            <div>
                                                <div className="font-semibold text-sm">PostgreSQL 16 & Relational Integrity</div>
                                                <div className="text-xs text-muted-foreground">
                                                    Cascade deletion, transactional consistency, and UUID identifiers throughout.
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                                            <div>
                                                <div className="font-semibold text-sm">Session Invalidation & Re-Auth</div>
                                                <div className="text-xs text-muted-foreground">
                                                    Instant cross-device session termination on password rotation and sudo-mode security gates.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Architecture Diagram Card */}
                                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                                    <div className="text-xs font-mono font-semibold uppercase text-muted-foreground tracking-wider mb-4">
                                        System Layers Diagram
                                    </div>
                                    <div className="space-y-3 font-mono text-xs">
                                        <div className="rounded-lg border border-blue-500/40 bg-blue-500/5 p-3">
                                            <div className="font-bold text-blue-600 dark:text-blue-400">1. Presentation Layer</div>
                                            <div className="text-muted-foreground text-[11px] mt-1">
                                                React 19 • Inertia.js v2 • Tailwind CSS • shadcn/ui
                                            </div>
                                        </div>
                                        <div className="rounded-lg border border-indigo-500/40 bg-indigo-500/5 p-3">
                                            <div className="font-bold text-indigo-600 dark:text-indigo-400">2. Application / CQRS Layer</div>
                                            <div className="text-muted-foreground text-[11px] mt-1">
                                                UseCases • Queries • WorkloadAccessChecker • Event Listeners
                                            </div>
                                        </div>
                                        <div className="rounded-lg border border-purple-500/40 bg-purple-500/5 p-3">
                                            <div className="font-bold text-purple-600 dark:text-purple-400">3. Domain Core</div>
                                            <div className="text-muted-foreground text-[11px] mt-1">
                                                Pure Business Logic • Entities • Workflow Invariants
                                            </div>
                                        </div>
                                        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3">
                                            <div className="font-bold text-emerald-600 dark:text-emerald-400">4. Infrastructure & Security</div>
                                            <div className="text-muted-foreground text-[11px] mt-1">
                                                PostgreSQL • FIDO2 WebAuthn • Queued Mailables • SessionGuard
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 6. Call To Action (Bottom) */}
                    <section className="py-20 border-t border-border/50 bg-gradient-to-b from-transparent to-blue-500/5">
                        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
                            <h3 className="text-3xl font-extrabold tracking-tight sm:text-4xl mb-4">
                                Ready to Elevate Your Organization's Workflow?
                            </h3>
                            <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-base">
                                Experience unified project tracking, contextual RBAC governance, and biometric passkeys in one platform.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Button
                                    asChild
                                    size="lg"
                                    className="h-12 px-8 bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                                >
                                    <Link href={auth?.user ? dashboardUrl : loginUrl}>
                                        {auth?.user ? 'Open Dashboard' : 'Get Started Now'}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button asChild size="lg" variant="outline" className="h-12 px-8">
                                    <Link href="/docs">
                                        Explore Documentation
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </section>
                </main>

                {/* 7. Footer */}
                <footer className="border-t border-border/40 bg-card py-12">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
                                <AppLogoIcon className="h-4 w-4 fill-current text-white" />
                            </div>
                            <span className="font-bold tracking-tight text-foreground">
                                WorkPulse
                            </span>
                            <span className="text-xs text-muted-foreground">
                                • Enterprise Workload & Operations System
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
                            <Link href="/dashboard" className="hover:text-foreground transition-colors">
                                Dashboard
                            </Link>
                            <Link href="/workspaces" className="hover:text-foreground transition-colors">
                                Workspaces
                            </Link>
                            <Link href="/projects" className="hover:text-foreground transition-colors">
                                Projects
                            </Link>
                            <Link href="/docs" className="hover:text-foreground transition-colors">
                                Documentation
                            </Link>
                            <Link href="/settings/security" className="hover:text-foreground transition-colors">
                                Security
                            </Link>
                        </div>
                    </div>
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6 text-center text-xs text-muted-foreground/60">
                        © {new Date().getFullYear()} WorkPulse. All rights reserved.
                    </div>
                </footer>
            </div>
        </>
    );
}
