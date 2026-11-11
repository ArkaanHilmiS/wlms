# 🗺️ WLMS Product Roadmap & Technical Debt Report

_(Terakhir diperbarui: 13 Oktober 2026)_

Dokumen ini merangkum peta jalan pengembangan fitur masa depan (**Product Roadmap**) serta evaluasi **Technical Debt** terkini pasca penyelesaian Sprint 1–8, fitur Import Spreadsheet, dan penyempurnaan UI/UX Workspace & Project Hub.

---

## Bagian 1: Product Roadmap (Pengembangan Kedepan)

### 1. [DONE] Real Executive & Personal Dashboard (`/dashboard`)

- **Status:** Sudah diselesaikan (`DashboardPageController`, `GetDashboardDataQuery`, dan `resources/js/pages/dashboard.tsx`).
- **Fitur yang Diimplementasikan:**
    - **My Assigned Tasks Widget:** Daftar tugas lintas _workspace_ milik pengguna yang sedang login, dikelompokkan berdasarkan urgensi (_Overdue_, _Due Today_, _Upcoming_).
    - **Executive Summary Cards:** Metrik agregat meliputi total proyek aktif, _completion rate_, tugas terbuka saya (_my open tasks_), dan tugas terlambat (_overdue tasks_).
    - **Recent Activity & Audit Stream:** Linimasa aktivitas kolaborasi terbaru dari proyek-proyek yang diikuti pengguna.

### 2. [DONE] Global "My Tasks" Hub (`/issues`)

- **Status:** Sudah diselesaikan (`GlobalIssuesPageController` dan `resources/js/pages/Issues/Index.tsx`).
- **Fitur yang Diimplementasikan:**
    - Mengubah `/issues` menjadi agregator tugas lintas _workspace_ (**Global Issue Explorer / My Tasks**).
    - Menyediakan filter terpadu berdasarkan _Workspace_, _Project_, _Status_, _Priority_, _Assignee_, dan rentang _Due Date_ dengan dukungan _Bulk Actions_ serta _Pagination_ (10/20/50/100).

### 3. [DONE] Export Data (Excel / CSV) & Observabilitas Riwayat Impor

- **Status:** Sudah diselesaikan.
- **Fitur yang Diimplementasikan:**
    - **Export to Excel/CSV:** Endpoint streaming download langsung ke browser (`GET /workspaces/{id}/issues/export` dan `GET /projects/{id}/issues/export`) via `ExportIssuesController` dan `IssuesExport` tanpa residu di disk server. Terintegrasi tombol Export di `WorkspaceTasksTable.tsx`.
    - **Import History & Observability:** Tabel `import_logs` dan migrasi `2026_10_15_140000_create_import_logs_table.php`, pencatatan status baris sukses/skip/gagal di `ImportProjectsJob` & `ImportIssuesJob`, UI riwayat impor di `/admin/import-workload` (`resources/js/pages/Admin/Import/Index.tsx`) lengkap dengan auto-polling dan modal rincian error JSON. File sementara otomatis dihapus pada blok `try...finally`.

### 4. [DONE] Kelengkapan CMS Dokumentasi (`/admin/docs` & `/settings/docs`)

- **Status:** Sudah diselesaikan.
- **Fitur yang Diimplementasikan:**
    - **Unified Documentation Settings:** Halaman terpadu `/settings/docs` (`resources/js/pages/settings/docs.tsx`) dengan tab Halaman dan Kategori, filter kategori/status, pencarian live, sortir interaktif pada kolom header, dan pagination. Rute legacy `/admin/docs` otomatis diarahkan ke `/settings/docs`.
    - **Create & Delete Category & Page:** Dialog tambah halaman baru dengan pembuatan slug otomatis dan pembukaan instan di TipTap editor, serta dialog tambah kategori baru. Penghapusan kategori dilengkapi _safe fallback_ di mana halaman otomatis dialihkan ke kategori default (`General`).
    - **Interactive Draft / Published Toggle:** Dukungan pengubahan status publikasi 1-klik langsung dari baris tabel dokumen maupun di dalam editor TipTap (`resources/js/pages/Admin/Docs/Edit.tsx`).

### 5. [DONE] Lampiran File (Attachments) & `@Mention` Kolaborasi

- **Status:** Sudah diselesaikan.
- **Fitur yang Diimplementasikan:**
    - **File Attachments (max 5 MB):** Migrasi `2026_10_15_150000_create_issue_attachments_table.php`, `AttachmentController.php` dengan Anti-IDOR, secure download stream, dan delete. Tab UI lampiran di `IssueFormDialog.tsx` via `IssueAttachmentSection.tsx`.
    - **`@Mention` Kolaborasi:** Autocomplete popup `@user` di `IssueCommentSection.tsx`, penandaan pill mention pada teks komentar, dan notifikasi instan in-app/broadcast (`comment.mentioned`) melalui `NotificationEventSubscriber.php`.

---

## Bagian 2: Evaluasi Technical Debt (Status & Temuan Baru)

### ✅ Technical Debt yang Telah Diselesaikan (Resolved)

1. **Database Migration Mismatch (`org_units`, `org_levels`, `users`):** Sudah diselesaikan. `php artisan migrate:fresh` dan pengujian berbasis SQLite `:memory:` maupun PostgreSQL kini berjalan 100% sinkron.
2. **Security & RBAC Test Matrix:** Sudah diselesaikan. Pengujian _Cross-Division Access_, _Anti-IDOR_, dan _Soft-Deleted Entities_ telah ditambahkan di modul `Workload`, `Identity`, `Collaboration`, dan `KnowledgeBase` (133 Pest tests lulus).
3. **Optimasi N+1 Query di Background Import & Hierarki:** Sudah diselesaikan melalui _bulk pre-fetching_ (`whereIn`) dan _chunk insert_ pada Job Impor serta optimasi _eager loading_.
4. **Atomic Batch Endpoint untuk Bulk Actions (`POST /api/issues/bulk-update`):** Sudah diselesaikan melalui `BulkUpdateIssuesController` (dibungkus `DB::transaction` menggunakan `AssignIssueUseCase` dan `TransitionIssueStatusUseCase`) dan integrasi di `useBulkUpdateIssues` (`useIssues.ts`), menggantikan $N$ request paralel di sisi client.
5. **Filter Auto-Archive Kanban (>30 Hari) di Sisi Backend:** Sudah diselesaikan pada `GetBoardIssuesQuery`, `GetBoardController` (`?include_archived=1`), dan `IssueController@index` (`?exclude_archived_done=1`).
6. **Kebersihan Root Repository & Rute Debug:** Sudah diselesaikan. File _scratch_ di _root_ dan rute `/api/test-session` di `routes/api.php` telah dihapus, serta `.agents/` telah diabaikan di `.gitignore`.
7. **Konsistensi Clean Architecture (`KnowledgeBase` & `Shared`):** Sudah diselesaikan. `AdminDocPageController` kini memanggil `DocPageAdminService` di layer `Application`, serta `LocaleController` dan `SetLocale` telah dipindahkan ke `App\Shared\Presentation\Http\`.
8. **Lokalisasi Halaman Sekunder (`useTranslate`):** Sudah diselesaikan pada `Issues/Index.tsx`, `settings/workflows.tsx`, dan halaman `auth/*`.
9. **Fix Silent 15-Item Truncation on Kanban & Workspace Issues (`per_page=500` / `limit=500`):** Sudah diselesaikan pada endpoint daftar tiket proyek/Kanban dan _workspace issues_ sehingga tampilan multi-view tidak lagi terpotong secara diam-diam pada batas 15 item.
10. **Enforce Workflow Transition & Domain Events on `IssueController::update`:** Sudah diselesaikan dengan menegakkan validasi transisi _workflow_ dan pengiriman _domain events_ saat status atau _assignee_ tiket diperbarui melalui `IssueController::update`.
11. **Expand `AssignIssueController` & `BulkUpdateIssuesController` Authorization:** Sudah diselesaikan dengan memperluas otorisasi agar mencakup peran `Workspace Admin` dan izin `issues:assign`.
12. **Purge Dead `IssueComment*` Classes from `Workload` Module:** Sudah diselesaikan dengan menghapus kelas-kelas `IssueComment*` yang sudah tidak terpakai dari modul `Workload` (komentar kini terpusat di modul `Collaboration`).
13. **Register `tests/Arch` in `phpunit.xml` with `512M` Memory Limit:** Sudah diselesaikan dengan mendaftarkan _test suite_ `Arch` (`tests/Arch`) di `phpunit.xml` beserta batas memori `512M` dan memastikan 100% _architecture assertions_ lulus.
14. **Fix `assignee_id` Ignored on Issue Creation (`CreateIssueHttpRequest`, `CreateIssueInput`, `CreateIssueUseCase`):** Sudah diselesaikan sehingga pembuatan tiket baru langsung menyimpan _assignee_ dan memicu `IssueAssigned` event jika `assignee_id` disertakan.
15. **Enforce Context-Aware RBAC (Anti-IDOR) on `GetWorkspaceIssuesQuery` & `ShowProjectPageController`:** Sudah diselesaikan sehingga pengguna eksternal tanpa relasi ke _workspace_/_project_ tidak dapat membaca daftar tugas maupun membuka halaman detail proyek divisi lain.
16. **Serialize Issue Number Generation (`EloquentIssueRepository::nextNumberForProject`):** Sudah diselesaikan dengan mengunci baris proyek (`lockForUpdate()`) di dalam transaksi pembuatan tiket untuk mencegah tabrakan nomor urut tiket (`PROJ-N`).
17. **Auto-Delete Temporary Uploaded Import Files (`ImportProjectsJob` & `ImportIssuesJob`):** Sudah diselesaikan dengan membungkus `Excel::import()` di dalam blok `try / finally` yang menghapus file sementara di `Storage::disk('local')`.
18. **Deduplicate Issue Creation Controller (`CreateIssueController`):** Sudah diselesaikan dengan mendelegasikan `CreateIssueController::__invoke` langsung ke `IssueController::store`.
19. **Prioritize Exact PIC Name Match on Issue Import (`ImportIssuesUseCase`):** Sudah diselesaikan dengan memprioritaskan kecocokan nama lengkap (`strcasecmp === 0`) sebelum _fallback_ ke kecocokan parsial (`stripos`).
20. **Fix `WorkspacePolicy::isSuperadmin()` Hardcoded Email Check:** Sudah diselesaikan dengan memeriksa `$user->hasRole('Superadmin')` selain _fallback_ email `superadmin@wlms.com`.
21. **Centralize Context-Aware RBAC in `WorkloadAccessChecker`:** Sudah diselesaikan dengan memusatkan pengecekan otorisasi lintas-_workspace_/_project_ di `WorkloadAccessChecker` dan menegakkannya pada endpoint Board, Backlog, dan Activity.
22. **Purge Dead `UpdateIssueUseCase`:** Sudah diselesaikan dengan menghapus kelas `UpdateIssueUseCase` yang tidak terpakai beserta komentar dependensi konstruktor di `IssueController`.
23. **Fix CQRS Query Namespace & UseCase Eloquent Coupling (`WorkloadArchitectureTest`):** Sudah diselesaikan dengan memindahkan 5 kelas `*Query` ke `Application\Queries` serta melepaskan ketergantungan langsung `AddWorkspaceMemberUseCase`, `RemoveWorkspaceMemberUseCase`, `CompleteSprintUseCase`, dan `LogWorkUseCase` dari model Eloquent.
24. **Track Mailer Stub with `shortcut:` & Redirect `/users` Placeholder Route:** Sudah diselesaikan dengan mengganti `TODO` di `NotifyAssigneeMailListener` menjadi penanda `shortcut:` terukur serta mengalihkan rute `/users` ke `/settings/rbac`.
25. **Enforce Context-Aware `hasRole` & `hasPermission` in `UserModel`:** Sudah diselesaikan dengan mendukung parameter opsional `$contextType` dan `$contextId` pada `UserModel::hasRole()` dan `UserModel::hasPermission()` sehingga peran ber-cakupan `PROJECT` atau `WORKSPACE` tidak bocor menjadi izin global.
26. **Normalize `context_type` Case & Expose `user_roles` in RBAC User API:** Sudah diselesaikan dengan menormalisasi `context_type` menjadi huruf kapital (`GLOBAL`, `WORKSPACE`, `PROJECT`) pada `UserRoleController` serta menyertakan rincian `user_roles` pada `UserController::index`.
27. **Protect `Superadmin` System Role from Deletion or Renaming (`RoleController`):** Sudah diselesaikan dengan memblokir penghapusan maupun perubahan nama peran sistem `Superadmin` pada `RoleController::update` dan `RoleController::destroy` (`HTTP 422`).
28. **Expand Sprint Lifecycle Endpoints to Dynamic Permissions (`sprints:manage`, `projects:manage`, `Workspace Admin`):** Sudah diselesaikan pada `CreateSprintHttpRequest`, `UpdateSprintController`, `StartSprintController`, dan `CompleteSprintController`.
29. **Add User Creation & Context-Scoped Role Assignment UI in `/settings/rbac` (`UsersTab.tsx`):** Sudah diselesaikan dengan menambahkan dialog pembuatan pengguna baru serta pemilihan _scope_ (`GLOBAL`, `WORKSPACE`, `PROJECT`) saat menetapkan peran pengguna.
30. **Add Role Scope Selection & Edit Action in `/settings/rbac` (`RolesTab.tsx`):** Sudah diselesaikan dengan mengganti `scope: 'GLOBAL'` yang di-_hardcode_ menjadi pilihan cakupan dinamis serta menambahkan fitur sunting (_Edit_) peran dan proteksi tombol hapus pada `Superadmin`.
