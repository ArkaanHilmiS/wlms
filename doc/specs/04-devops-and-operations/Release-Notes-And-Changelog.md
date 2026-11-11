# Release Notes & Changelog

## Workload & Learning Management System (WLMS)

---

## 🚀 Versi 1.0.0 — Production Milestone Release

**Tanggal Rilis:** 15 Oktober 2026  
**Status:** Stabil & Siap Produksi  
**Commit Baseline:** `95606d7`  
**Quality Score:** 169/169 Tests Passed | PHPStan Level 7 (0 Errors) | TypeScript `tsc` (0 Errors)

---

### 🌟 Fitur Baru & Sorotan Utama

#### 1. Arsitektur Enterprise Modular Monolith

- Pemisahan 5 domain bisnis mandiri: `Identity`, `Workload`, `Collaboration`, `KnowledgeBase`, dan `Notification`.
- Penerapan ketat **Clean Architecture** (Domain $\to$ Application $\to$ Infrastructure $\to$ Presentation) dan **Pragmatic CQRS** (UseCases untuk Write/Commands dan Queries teroptimasi untuk Read).
- Penegakan integritas batas arsitektur otomatis via rangkaian pengujian Pest Architecture (`tests/Arch`).

#### 2. Kontrol Akses Berbasis Peran Kontekstual (_Context-Aware RBAC_)

- Dukungan penugasan peran pada 3 tingkat cakupan: `GLOBAL`, `WORKSPACE`, dan `PROJECT`.
- Pengguna dapat memiliki peran yang berbeda pada workspace/proyek yang berbeda tanpa kebocoran hak akses.
- Perlindungan permanen pada role `Superadmin` sistem dari penghapusan atau pengubahan nama.
- Normalisasi konsistensi huruf kapital (`GLOBAL`, `WORKSPACE`, `PROJECT`) pada database dan API.

#### 3. Keamanan Tingkat Lanjut & Otorisasi Anti-IDOR

- **Anti-IDOR Enforcement**: Sentralisasi verifikasi izin melalui `WorkloadAccessChecker::canViewProject()` pada 10 controller kritis (Board, Backlog, Sprints, Issues, Worklogs, Activities, Timeline, dan Comments). Menolak akses lintas divisi tanpa hak dengan respon HTTP 403 Forbidden.
- **Error Masking**: Pencegahan kebocoran exception trace internal database ke respon client JSON HTTP 500.
- **API Rate Limiting**: Batas 300 request/menit per pengguna/IP via `throttle:api` dengan pengecualian otomatis pada lingkungan `local` dan `testing`.

#### 4. Pengalaman Pengguna & Manajemen Proyek Agile

- **Papan Kanban Interaktif**: Mendukung drag-and-drop antar kolom alur kerja dengan validasi _workflow engine_ dan penyesuaian kepadatan tampilan global (**S / M / L**).
- **Backlog & Siklus Sprint**: Perencanaan sprint interaktif, pemantauan kapasitas jam kerja tim (_Sprint Workload Widget_), serta dialog penyelesaian sprint dengan pemindahan otomatis sisa tiket yang belum tuntas.
- **Workspace All Tasks Table**: Penjelajah tiket lintas proyek dengan pencarian instan, filter dinamis, pagination (10, 20, 50, 100 baris), dan bilah aksi massal melayang (_Floating Bulk Action Bar_).
- **Pintasan Global (`c`)**: Modal pembuatan tiket baru yang dapat dipanggil dari halaman manapun dengan shortcut keyboard `c`.

#### 5. Dashboard Eksekutif & Personal Terpadu

- Rute `/dashboard`: Metrik KPI eksekutif (Active Projects, Completion Rate, My Open Tasks, Overdue Tasks), daftar tugas terurut urgensi (_Overdue_, _Today_, _Upcoming_), dan siaran aktivitas terkini.
- Rute `/issues`: Hub global seluruh tugas lintas workspace dengan satu klik peralihan.

#### 6. Pemrosesan Latar Belakang & Asinkron

- **Impor Spreadsheet Excel Asinkron**: Impor ratusan proyek dan tiket melalui antrean background job (`ImportProjectsJob`, `ImportIssuesJob`) dengan resolusi otomatis PIC 4 lapis (NIP $\to$ Email $\to$ Nama Lengkap $\to$ Partial).
- **Queued Mailable**: Pengiriman email notifikasi penugasan tiket (`IssueAssignedMail`) di latar belakang via worker Redis tanpa memblokir respon pengguna.

---

### 🛠️ Refactoring & Peningkatan Kualitas Kode

- **Ekstraksi `OrgUnitTreeService`**: Logika query raw SQL closure table dipindahkan dari `OrgUnitController` ke service aplikasi mandiri.
- **Dekomposisi `BacklogManager.tsx`**: File komponen raksasa (690 baris) dipecah secara modular menjadi `BacklogIssueRow.tsx`, `DroppableSprint.tsx`, dan `DroppableBacklog.tsx` (~260 baris).
- **Pembersihan Tipe `: any`**: Pengetatan tipe TypeScript pada `echo.ts`, `GlobalIssueCreateModal.tsx`, `WorkspaceTasksTable.tsx`, dan `IssueFormDialog.tsx`.
- **Unit Test Use Case Inti**: Penambahan 5 test suite unit baru (+14 test) untuk `CreateIssue`, `TransitionIssueStatus`, `AssignIssue`, `DeleteIssue`, dan `LogWork`.
- **Query Safeguards**: Mengganti `get()` tanpa batas pada beban kerja sprint dengan kueri agregat SQL `SUM(...)`, serta menambahkan batas limit 500 records pada master data roles dan unit organisasi.

---

### 📦 Dokumentasi Lengkap Proyek (`doc/specs/`)

1. `01-requirements/`: SRS, Use Case Matrix All Domains, dan Context-Aware RBAC Matrix.
2. `02-architecture-and-design/`: SAD, ERD & Data Dictionary, API Spec OpenAPI, dan Diagram UML (Activity, Sequence, Deployment Topology).
3. `03-quality-and-testing/`: Test Strategy & Matrix dan Security Threat Model STRIDE.
4. `04-devops-and-operations/`: DevOps Runbook & Deployment SOP, User Manual & Feature Guide, dan Release Notes v1.0.0.
