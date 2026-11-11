# 🚀 WorkPulse — Enterprise Workload & Operations System

WorkPulse is an enterprise-grade workload management, agile project tracking, and organizational ticketing platform built with **Laravel 11**, **React 19**, **Inertia.js**, and **PostgreSQL**.

---

## 🏗️ Architecture & Philosophy

WorkPulse enforces **Clean Architecture** and **Pragmatic CQRS**:

```
app/Modules/
├── Identity/            # Organization hierarchy, RBAC, Users, Roles & Menus
├── Workload/            # Workspaces, Projects, Sprints, Issues, Workflows & Worklogs
├── Collaboration/       # Comments, Mentions, Activity stream & Audit logs
├── KnowledgeBase/       # Documentation CMS & Category management
└── Notification/        # In-app notifications & User alert streams
```

- **Domain**: Pure business entities, domain events, value objects, and repository interfaces. Free of external framework coupling.
- **Application**: CQRS Commands, UseCases, and optimized Query classes.
- **Infrastructure**: Eloquent models, migrations, mailers, listeners, and persistence adapters.
- **Presentation**: Single-action HTTP controllers, FormRequests, resources, and Inertia page views.
- **Enforced Testing**: Architectural layer dependencies are verified continuously by Pest architecture tests (`tests/Arch`).

---

## ⚡ Key Features

- **Context-Aware RBAC**: Granular roles scoped globally (`GLOBAL`), per workspace (`WORKSPACE`), or per project (`PROJECT`) with anti-IDOR isolation.
- **Multi-View Project Management**:
    - Interactive **Kanban Board** with drag-and-drop workflow status transitions.
    - **Backlog Manager** and Sprint lifecycle (`Create`, `Start`, `Complete`).
    - **All Tasks Explorer** with search, filters, inline edit, bulk updates, and 10/20/50/100 pagination.
    - **Global S/M/L UI Density** settings (`Settings > Appearance`).
- **Executive & Personal Dashboard (`/dashboard`)**:
    - 4 Key Performance Indicators (Active Projects, Completion Rate, Open Tasks, Overdue alerts).
    - Urgency-categorized personal tasks (_Overdue_, _Due Today_, _Upcoming_).
    - Recent activity and audit trail stream.
- **Global My Tasks Hub (`/issues`)**: Cross-workspace issue explorer with one-click workspace switching.
- **Asynchronous Spreadsheet Importer**: High-performance chunked background import for projects and issues with automatic multi-attribute PIC matching (NIP, email, and full name).
- **Asynchronous Mail Notifications**: Queued `IssueAssignedMail` Mailable dispatched upon issue assignment.

---

## 🛠️ Tech Stack

- **Backend**: PHP 8.2+, Laravel 11, Sanctum, PostgreSQL / SQLite.
- **Frontend**: TypeScript, React 19, Inertia.js v2, Tailwind CSS v4, Lucide icons, shadcn/ui primitives.
- **State & Data**: TanStack Query (React Query), Axios.
- **Testing & Quality**: Pest PHP 3, PHPStan Level 7, TypeScript strict type check.

---

## 🚀 Getting Started

### Prerequisites

- PHP >= 8.2 with `pdo_pgsql`, `mbstring`, `redis`, `gd` extensions
- Composer 2.x
- Node.js >= 20.x & npm
- PostgreSQL >= 15 (or SQLite for local development/testing)
- Redis (optional, for queued background jobs & cache)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/your-org/wlms.git
cd wlms

# Install backend dependencies
composer install

# Install frontend dependencies
npm install
```

### 2. Environment Configuration

```bash
# Copy example environment
cp .env.example .env

# Generate application encryption key
php artisan key:generate
```

Configure your `.env` database settings:

```dotenv
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=wlms
DB_USERNAME=postgres
DB_PASSWORD=secret

QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
MAIL_MAILER=log
```

### 3. Database Migration & Seeding

```bash
# Run migrations and seed baseline RBAC data
php artisan migrate --seed
```

### 4. Running the Development Servers

```bash
# Start backend server, Vite frontend hot-reload, and queue worker concurrently
composer run dev
```

Or run services individually:

```bash
# Terminal 1: Laravel Web Server
php artisan serve

# Terminal 2: Vite Dev Server
npm run dev

# Terminal 3: Background Queue Worker (for imports & emails)
php artisan queue:work
```

---

## 🧪 Testing & Code Quality

WorkPulse maintains a strict quality gate:

```bash
# 1. Run all Pest tests (Unit, Feature, and Arch suites)
./vendor/bin/pest

# 2. Run PHPStan static analysis at Level 7
php -d memory_limit=512M ./vendor/bin/phpstan analyse --debug --no-progress

# 3. Validate TypeScript types
npm run types:check
```

---

## 🛡️ Security & Access Control

- All RBAC administrative routes (`/api/rbac/*`, `/admin/*`) require the `can:manage-rbac` gate.
- Division boundaries and project access are strictly enforced via `WorkloadAccessChecker::canViewProject()` and `WorkloadAccessChecker::canViewWorkspace()`.
- System role `Superadmin` is protected at the database and application levels from deletion and renaming.
