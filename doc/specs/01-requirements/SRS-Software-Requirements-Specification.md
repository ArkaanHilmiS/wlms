# Software Requirements Specification (SRS)

## Workload & Learning Management System (WLMS)

**Versi:** 1.0  
**Tanggal:** 14 Oktober 2026  
**Status:** Approved  
**Arsitektur:** Modular Monolith (Clean Architecture + Pragmatic CQRS)

---

## 1. Pendahuluan

### 1.1 Tujuan Dokumen

Dokumen Spesifikasi Kebutuhan Perangkat Lunak (_Software Requirements Specification_ - SRS) ini mendefinisikan kebutuhan fungsional dan non-fungsional untuk sistem **WLMS (Workload & Learning Management System)**. Dokumen ini menjadi acuan utama bagi pengembang, arsitek sistem, QA, dan pemangku kepentingan.

### 1.2 Ruang Lingkup Produk

WLMS adalah platform enterprise modular monolith yang dirancang untuk mengelola portofolio beban kerja (_workload_), proyek, tiket tugas (_issues_), sprint tim, pembagian sumber daya manusia, serta repositori kolaborasi dan pengetahuan. Sistem mengadopsi kontrol akses berbasis peran berorientasi konteks (_Context-Aware Role-Based Access Control_ - RBAC) yang menjamin isolasi data antar divisi/unit kerja.

### 1.3 Definisi dan Singkatan

- **WLMS**: Workload & Learning Management System.
- **RBAC**: Role-Based Access Control (Pengendalian Akses Berbasis Peran).
- **CQRS**: Command Query Responsibility Segregation.
- **IDOR**: Insecure Direct Object Reference (Kerentanan Otorisasi Objek).
- **Closure Table**: Desain database relasional untuk menyimpan hierarki pohon tak terbatas.
- **PIC**: Person In Charge (Penanggung Jawab Tugas).

---

## 2. Deskripsi Umum Sistem

### 2.1 Perspektif Produk

WLMS beroperasi sebagai aplikasi web modern terpadu (_hybrid SPA_) menggunakan backend Laravel 11 dan frontend React 19 dengan jembatan Inertia.js. Sistem mengintegrasikan:

- Layanan basis data relasional (PostgreSQL / SQLite).
- Antrean latar belakang (_Background Queue Workers_) untuk proses asinkron (impor spreadsheet Excel dan pengiriman email penugasan).
- Protokol WebSocket real-time (Laravel Reverb & Echo) untuk notifikasi instan.

### 2.2 Profil Pengguna & Persona

| Peran                | Deskripsi                                               | Lingkup Otoritas                                                                                             |
| -------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Superadmin**       | Administrator teknis global platform.                   | Memiliki izin bypass penuh (`*`), mengelola seluruh workspace, unit organisasi, master role, dan permission. |
| **Workspace Owner**  | Kepala divisi atau pemilik ruang kerja (_Owner Group_). | Mengelola proyek, anggota workspace, siklus sprint, dan melihat analitik divisi.                             |
| **Workspace Admin**  | Administrator operasional tingkat workspace.            | Menugaskan tiket, memodifikasi proyek, dan mengelola backlog/sprint.                                         |
| **Member (Anggota)** | Eksekutor tugas (Engineer, Designer, Analyst).          | Melihat proyek terkait, memperbarui status tiket yang ditugaskan, mencatat _worklog_, dan memberi komentar.  |
| **Guest / External** | Pengamat luar atau pemangku kepentingan lintas divisi.  | Akses _read-only_ terbatas pada tiket atau proyek yang diundang secara eksplisit.                            |

---

## 3. Kebutuhan Fungsional (Functional Requirements)

### 3.1 Modul Identity & Keamanan (FR-IDN)

- **FR-IDN-01 (Hierarki Struktur Organisasi)**: Sistem harus mengelola struktur organisasi bertingkat menggunakan model _closure table_ (`org_unit_closures`) yang mendukung operasi pindah subtree tanpa siklus sirkular.
- **FR-IDN-02 (Context-Aware RBAC)**: Sistem harus memberlakukan penugasan role pada 3 level cakupan konteks:
    1. `GLOBAL`: Berlaku di seluruh platform.
    2. `WORKSPACE`: Berlaku hanya pada workspace target atau divisi pemilik (`owner_group_id`).
    3. `PROJECT`: Berlaku hanya pada proyek tertentu.
- **FR-IDN-03 (Role & Permission Management)**: Administrator dapat membuat, mengubah, menyinkronkan izin (_permissions_), dan menghapus peran, dengan perlindungan permanen pada sistem role `Superadmin`.
- **FR-IDN-04 (Autentikasi & Session)**: Autentikasi berbasis session stateful dengan perlindungan token CSRF dan Sanctum API token untuk antarmuka headless.

### 3.2 Modul Workload Management (FR-WKL)

- **FR-WKL-01 (Manajemen Workspace & Anggota)**: Pengguna dapat membuat workspace, mendaftarkan unit organisasi pemilik, serta menambahkan/menghapus anggota workspace beserta perannya.
- **FR-WKL-02 (Manajemen Proyek)**: Pengguna berwenang dapat membuat proyek dengan kunci proyek unik (misal: `PRJ`), menetapkan Project Lead, rentang tanggal mulai-selesai, dan target workspace.
- **FR-WKL-03 (Manajemen Tiket / Issue Lifecycle)**:
    - Pembuatan tiket dengan atribut: Judul, Deskripsi, Tipe Tiket, Prioritas, Status Awal, Estimasi Waktu (detik), dan Tenggat Waktu (_due date_).
    - Modal pembuatan tiket global via shortcut keyboard `c`.
    - Transisi status tiket yang divalidasi oleh alur kerja (_Workflow Engine_).
    - Penugasan tiket ke PIC dengan resolusi otomatis multi-atribut (NIP, email, nama lengkap).
- **FR-WKL-04 (Siklus Sprint & Backlog)**:
    - Pembuatan sprint berkala (status: `PENDING`, `ACTIVE`, `COMPLETED`).
    - Pemindahan tiket antar backlog dan sprint melalui mekanisme drag-and-drop (_DnD_).
    - Pelacakan kapasitas dan beban kerja sprint (_Sprint Workload Widget_).
    - Penutupan sprint (_Complete Sprint_) dengan pemindahan otomatis sisa tiket yang belum tuntas ke sprint berikutnya atau backlog.
- **FR-WKL-05 (Multi-View Workspace & Kanban Proyek)**:
    - Kanban board responsif dengan dukungan pengaturan kepadatan tampilan global (_Icon Density_ S / M / L).
    - Workspace All Tasks Table dengan filter dinamis (Proyek, Assignee, Status), pagination klien (10, 20, 50, 100 baris), dan aksi massal (_Bulk Update_ status/assignee).
- **FR-WKL-06 (Dashboard Eksekutif & Personal)**:
    - Ringkasan KPI: Active Projects, Completion Rate %, My Open Tasks, Overdue Tasks.
    - Alur aktivitas terkini (_Recent Activities_) dan tab navigasi tiket tertugaskan.
- **FR-WKL-07 (Impor Spreadsheet Asinkron)**:
    - Impor data proyek dan tiket dari file Excel (.xlsx) / CSV di latar belakang menggunakan antrean antrean worker Laravel (`ImportProjectsJob`, `ImportIssuesJob`).
    - Penanganan error validasi baris per baris tanpa membatalkan seluruh transaksi.

### 3.3 Modul Collaboration (FR-COL)

- **FR-COL-01 (Komentar Tiket)**: Pengguna dapat menambahkan komentar teks berformat pada tiket tugas.
- **FR-COL-02 (Audit Trail & Activity Timeline)**: Setiap perubahan state tiket (transisi status, perubahan PIC, perubahan estimasi) harus dicatat secara otomatis dalam tabel `issue_activities` dan ditampilkan pada linimasa tiket.

### 3.4 Modul Notification (FR-NTF)

- **FR-NTF-01 (Realtime In-App Notifications)**: Notifikasi instan muncul saat pengguna ditugaskan pada tiket atau dimention, disalurkan via channel privat WebSocket.
- **FR-NTF-02 (Queued Email Notification)**: Sistem harus memicu `IssueAssignedMail` secara asinkron ke alamat email PIC saat penugasan tiket diperbarui.

---

## 4. Kebutuhan Non-Fungsional (Non-Functional Requirements)

### 4.1 Keamanan (Security - NFR-SEC)

- **NFR-SEC-01 (Anti-IDOR Authorization)**: Setiap sub-endpoint proyek dan tiket wajib memverifikasi otorisasi via `WorkloadAccessChecker::canViewProject()` dan menolak dengan HTTP 403 Forbidden bila user tidak memiliki hak di workspace/proyek tersebut.
- **NFR-SEC-02 (Pencegahan Kebocoran Error)**: Tidak boleh ada _exception trace_ atau pesan database mentah yang dikembalikan ke client pada respon HTTP 500. Seluruh error internal dicatat ke sistem log lokal/server.
- **NFR-SEC-03 (API Rate Limiting)**: Endpoint API dibatasi maksimum 300 request/menit per user/IP untuk mencegah brute force dan denial-of-service, dengan pengecualian pada lingkungan `local` dan `testing`.

### 4.2 Kinerja & Skalabilitas (Performance - NFR-PRF)

- **NFR-PRF-01 (Query Agregat & Safeguard)**: Perhitungan beban kerja sprint dan KPI dashboard harus menggunakan fungsi agregat database SQL (`SUM`, `COUNT`) dan melarang pemuatan koleksi model tanpa batas (`->limit(500)` safeguard).
- **NFR-PRF-02 (Pencegahan N+1 Query)**: Eager loading wajib diterapkan untuk relasi yang ditampilkan berulang (`status`, `priority`, `assignee`, `project`).
- **NFR-PRF-03 (Waktu Respon Endpoint)**: 95% endpoint pembacaan data (read API) harus merespons di bawah 250 milidetik pada dataset 10.000 tiket.

### 4.3 Kualitas & Arsitektur (Quality & Architecture - NFR-QAL)

- **NFR-QAL-01 (Invarian Lapisan Arsitektur)**: Lapisan Domain dilarang mengimpor kelas dari Infrastructure, Application, Presentation, maupun framework Laravel (ditegakkan via `tests/Arch/ArchitectureTest.php`).
- **NFR-QAL-02 (Type Safety)**: 100% lulus static analysis PHPStan Level 7 (0 errors) dan TypeScript compiler `tsc --noEmit` (0 errors).
- **NFR-QAL-03 (Uji Regresi Otomatis)**: Seluruh modul dilindungi oleh rangkaian pengujian Pest Unit, Feature, dan Architecture dengan tingkat keberhasilan 100%.
