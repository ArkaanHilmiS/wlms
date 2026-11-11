# Use Case Matrix (All Domains)

## Workload & Learning Management System (WLMS)

Dokumen ini memetakan seluruh Use Case (Command) dan Query (Read) yang diimplementasikan pada codebase WLMS lintas modul bisnis.

---

## 1. Domain: Workload Management (Core CQRS)

### 1.1 Use Cases (Write / Commands)

| Use Case ID   | Nama Use Case                  | Aktor                           | Precondition / Otorisasi                    | Input DTO / Parameter                                                         | Aturan Bisnis & Domain Invariants                                                                          | Output / Side Effects                                       |
| ------------- | ------------------------------ | ------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **UC-WKL-01** | `CreateWorkspaceUseCase`       | Workspace Owner, Superadmin     | User terautentikasi, punya grup organisasi. | `name`, `ownerGroupId`, `description`                                         | Nama workspace tidak boleh kosong; otomatis menunjuk pembuat sebagai `admin`.                              | `WorkspaceOutput`                                           |
| **UC-WKL-02** | `UpdateWorkspaceUseCase`       | Workspace Owner, Superadmin     | Keanggotaan admin di workspace terkait.     | `workspaceId`, `name`, `description`                                          | Workspace harus aktif (tidak diarsipkan).                                                                  | `WorkspaceOutput`                                           |
| **UC-WKL-03** | `ArchiveWorkspaceUseCase`      | Workspace Owner, Superadmin     | Keanggotaan admin di workspace terkait.     | `workspaceId`                                                                 | Workspace diubah statusnya menjadi `ARCHIVED`.                                                             | `void`                                                      |
| **UC-WKL-04** | `AddWorkspaceMemberUseCase`    | Workspace Owner, Superadmin     | Hak `workspaces:manage`.                    | `workspaceId`, `userId`, `role`                                               | User harus terdaftar; role: `admin`, `member`, `guest`.                                                    | `void` (Update/Insert `workspace_members`)                  |
| **UC-WKL-05** | `RemoveWorkspaceMemberUseCase` | Workspace Owner, Superadmin     | Hak `workspaces:manage`.                    | `workspaceId`, `userId`                                                       | Tidak boleh menghapus anggota pemilik tunggal jika belum ada delegasi.                                     | `void` (Delete dari `workspace_members`)                    |
| **UC-WKL-06** | `CreateProjectUseCase`         | Owner, Admin, `projects:manage` | Anggota workspace target aktif.             | `workspaceId`, `name`, `key`, `leadId`, `startDate`, `endDate`                | Kunci proyek unik (misal: `PRJ`); generate alur kerja status default.                                      | `ProjectOutput`                                             |
| **UC-WKL-07** | `UpdateProjectUseCase`         | Project Lead, Owner, Admin      | Hak kelola proyek.                          | `projectId`, `name`, `leadId`, `startDate`, `endDate`                         | Validasi rentang tanggal (`endDate >= startDate`).                                                         | `ProjectOutput`                                             |
| **UC-WKL-08** | `ArchiveProjectUseCase`        | Project Lead, Owner, Admin      | Hak kelola proyek.                          | `projectId`                                                                   | Proyek ditandai `ARCHIVED`; semua tiket tertutup untuk mutasi baru.                                        | `void`                                                      |
| **UC-WKL-09** | `CreateIssueUseCase`           | Anggota Proyek, `issues:manage` | Proyek aktif dan terdaftar.                 | `projectId`, `title`, `typeId`, `priorityId`, `assigneeId`, `estimateSeconds` | Nomor tiket sekuensial per proyek (`key-number`); inisialisasi status alur kerja pertama.                  | `IssueOutput` (Memicu `IssueCreated` event)                 |
| **UC-WKL-10** | `TransitionIssueStatusUseCase` | PIC Tiket, Owner, Admin         | Hak `issues:manage` / assignee.             | `issueId`, `toStatusId`, `actorUserId`                                        | Transisi status wajib diizinkan oleh `workflow_transitions` (menolak lompatan status ilegal dengan `422`). | `IssueOutput` (Memicu `IssueStatusChanged` event)           |
| **UC-WKL-11** | `AssignIssueUseCase`           | Owner, Admin, `issues:assign`   | Pengguna terdaftar dalam workspace.         | `issueId`, `assigneeId` (nullable), `actorUserId`                             | PIC harus valid; jika `null` menjadi `Unassigned`.                                                         | `IssueOutput` (Memicu `IssueAssigned` $\to$ antrekan email) |
| **UC-WKL-12** | `DeleteIssueUseCase`           | Owner, Admin, Reporter          | Hak hapus tiket.                            | `issueId`, `actorUserId`                                                      | Soft-delete entity tiket; mempertahankan rekaman audit aktivitas.                                          | `void` (Memicu `IssueDeleted` event)                        |
| **UC-WKL-13** | `LogWorkUseCase`               | PIC Tiket, Anggota Proyek       | Tiket ada dan aktif.                        | `issueId`, `timeSpentSeconds`, `description`, `startedAt`, `actorUserId`      | Catat log kerja; secara atomik mengurangi `remaining_estimate_seconds` pada tiket.                         | `void` (Insert ke `worklogs`)                               |
| **UC-WKL-14** | `CreateSprintUseCase`          | Owner, Admin, `sprints:manage`  | Proyek berstatus Kanban/Scrum aktif.        | `projectId`, `name`, `goal`, `startDate`, `endDate`                           | Status awal sprint adalah `PENDING`.                                                                       | `SprintOutput`                                              |
| **UC-WKL-15** | `StartSprintUseCase`           | Owner, Admin, `sprints:manage`  | Sprint dalam state `PENDING`.               | `sprintId`, `startDate`, `endDate`                                            | Hanya 1 sprint yang boleh berstatus `ACTIVE` dalam satu proyek pada satu waktu.                            | `SprintOutput`                                              |
| **UC-WKL-16** | `CompleteSprintUseCase`        | Owner, Admin, `sprints:manage`  | Sprint dalam state `ACTIVE`.                | `sprintId`, `moveToSprintId` (nullable)                                       | Tiket belum tuntas (`DONE != category`) dipindahkan ke sprint target atau backlog.                         | `void` (Update state sprint `COMPLETED`)                    |
| **UC-WKL-17** | `ImportProjectsUseCase`        | Owner, Admin, Superadmin        | File Excel valid, workspace aktif.          | `workspaceId`, `filePath`, `actorUserId`                                      | Validasi duplikasi key proyek; eksekusi di latar belakang (_Queue_).                                       | `ImportSummaryOutput`                                       |
| **UC-WKL-18** | `ImportIssuesUseCase`          | Owner, Admin, Superadmin        | File Excel valid, proyek aktif.             | `projectId`, `filePath`, `actorUserId`                                        | Pencocokan PIC otomatis via 4 kriteria bertingkat (NIP $\to$ Email $\to$ Nama $\to$ Partial).              | `ImportSummaryOutput`                                       |

---

### 1.2 Queries (Read / CQRS)

| Query ID       | Nama Query                   | Tujuan & Sumber Data                                                                      | Parameter Kunci                                             |
| -------------- | ---------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **QRY-WKL-01** | `GetDashboardDataQuery`      | Mengambil metrik KPI eksekutif, tugas tertugaskan saya, dan linimasa aktivitas.           | `userId`, `orgUnitId`                                       |
| **QRY-WKL-02** | `GetWorkspaceIssuesQuery`    | Mengambil seluruh tiket lintas proyek dalam workspace dengan filter & pagination dinamis. | `workspaceId`, `limit` (max 500), `assigneeId`, `projectId` |
| **QRY-WKL-03** | `GetBoardIssuesQuery`        | Mengambil tiket aktif per kolom status untuk tampilan Kanban Board proyek.                | `projectId`, `sprintId`                                     |
| **QRY-WKL-04** | `GetBacklogIssuesQuery`      | Mengambil tiket backlog (tanpa sprint aktif) dan daftar sprint pending/aktif.             | `projectId`                                                 |
| **QRY-WKL-05** | `GetProjectAnalyticsQuery`   | Menghitung agregat analitik burndown, velocity, dan completion status proyek.             | `projectId`, `from`, `to`                                   |
| **QRY-WKL-06** | `GetWorkspaceAnalyticsQuery` | Menghitung agregat utilisasi beban kerja lintas anggota dalam workspace.                  | `workspaceId`, `from`, `to`                                 |
| **QRY-WKL-07** | `GetProjectLookupsQuery`     | Mengambil opsi referensi tiket (types, priorities, statuses, users) ter-cache.            | `projectId`                                                 |
| **QRY-WKL-08** | `GetValidTransitionsQuery`   | Mengambil daftar status berikutnya yang diizinkan untuk tiket saat ini.                   | `issueId`                                                   |

---

## 2. Domain: Identity & Access Management (RBAC)

### 2.1 Use Cases & Services

| Use Case ID   | Nama Service / UseCase                   | Aktor             | Precondition / Otorisasi | Aturan Bisnis & Mekanisme                                                                                                         |
| ------------- | ---------------------------------------- | ----------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **UC-IDN-01** | `OrgUnitTreeService::registerUnit`       | Superadmin        | Gate: `manage-rbac`.     | Menambahkan simpul unit organisasi baru ke pohon `org_unit_closures` (self-depth 0 & warisan seluruh leluhur).                    |
| **UC-IDN-02** | `OrgUnitTreeService::moveSubtree`        | Superadmin        | Gate: `manage-rbac`.     | Memindahkan subtree unit organisasi ke induk baru; mencegah referensi sirkular (dilarang memindahkan induk ke anak keturunannya). |
| **UC-IDN-03** | `AssignUserRole` (`UserRoleController`)  | Superadmin, Owner | Gate: `manage-rbac`.     | Memberikan role ke pengguna dengan cakupan `context_type` (`GLOBAL`, `WORKSPACE`, `PROJECT`) dan `context_id`.                    |
| **UC-IDN-04** | `RevokeUserRole` (`UserRoleController`)  | Superadmin, Owner | Gate: `manage-rbac`.     | Mencabut peran pengguna pada konteks tertentu secara granular.                                                                    |
| **UC-IDN-05** | `SyncRolePermissions` (`RoleController`) | Superadmin        | Gate: `manage-rbac`.     | Menyinkronkan daftar permission pada role; role `Superadmin` diproteksi dari pengubahan nama/penghapusan.                         |

---

## 3. Domain: Collaboration

| Use Case ID   | Nama Use Case / Query      | Aktor               | Precondition / Otorisasi                | Deskripsi Alur                                                                                                        |
| ------------- | -------------------------- | ------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **UC-COL-01** | `AddCommentToIssueUseCase` | Anggota Proyek, PIC | `WorkloadAccessChecker::canViewProject` | Menambahkan komentar berformat teks/markdown pada tiket dan mencatat audit aktivitas.                                 |
| **UC-COL-02** | `EditCommentUseCase`       | Penulis Komentar    | Hak kepemilikan komentar.               | Mengubah konten komentar sebelumnya dan menandai flag _edited_.                                                       |
| **UC-COL-03** | `GetIssueTimelineQuery`    | Anggota Proyek      | `WorkloadAccessChecker::canViewProject` | Menggabungkan histori komentar (`issue_comments`) dan riwayat perubahan state (`issue_activities`) secara kronologis. |
| **UC-COL-04** | `LogAuditEventUseCase`     | Sistem / Internal   | Event listener pemicu.                  | Mencatat transaksi perubahan atribut tiket ke tabel `issue_activities` secara otomatis.                               |

---

## 4. Domain: KnowledgeBase & Documentation

| Query ID       | Nama Query                  | Aktor            | Precondition   | Deskripsi Alur                                                                |
| -------------- | --------------------------- | ---------------- | -------------- | ----------------------------------------------------------------------------- |
| **QRY-KNB-01** | `GetDocumentationMenuQuery` | Seluruh Pengguna | Terautentikasi | Mengambil navigasi hierarki menu artikel dokumentasi teknis sistem.           |
| **QRY-KNB-02** | `GetDocPageBySlugQuery`     | Seluruh Pengguna | Terautentikasi | Mengambil konten markdown halaman dokumentasi spesifik berdasarkan slug unik. |
