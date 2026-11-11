# FUNCTIONAL SPECIFICATION DOCUMENT (FSD) & ARCHITECTURE

**Modul:** Workspace Members & Security Visibility
**Fase:** 6 (Technical Writer)
**Tanggal:** 18 September 2026
**Status:** Approved (Lulus Audit QA & Security)

## 1. Pendahuluan

Dokumen ini menguraikan spesifikasi fungsional dan arsitektur keamanan untuk fitur **Workspace Members**. Fitur ini dirancang secara spesifik untuk mengatur struktur keanggotaan kolaboratif di dalam sebuah Workspace dan memastikan tercapainya isolasi data antar pengguna yang aman (multi-tenancy abstraction), melalui implementasi sistem keamanan **Anti-IDOR (Insecure Direct Object Reference)**.

## 2. Struktur Database

Relasi pengguna (User) dengan ruang kerja (Workspace) dikelola melalui _Pivot Table_ (Many-to-Many relationship) dengan penambahan metadata penugasan.

### Skema Tabel `workspace_members`

Tabel ini merepresentasikan keanggotaan eksplisit pengguna ke sebuah Workspace.

- `id` (Big Integer / Primary Key)
- `workspace_id` (UUID, Foreign Key ke tabel `workspaces`, On Delete Cascade)
- `user_id` (Big Integer, Foreign Key ke tabel `users`, On Delete Cascade)
- `role` (String, Default: `viewer`) - _Mendefinisikan hak akses internal: `viewer`, `member`, `admin`._
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

Tabel ini mengimplementasikan `UNIQUE(workspace_id, user_id)` constraint pada tingkat database guna memastikan tidak terjadinya duplikasi keanggotaan dalam satu workspace.

## 3. Arsitektur Security (Anti-IDOR)

Guna mencegah kebocoran data (_Data Leakage_) secara vertikal maupun horizontal (IDOR vulnerability), sistem mengadopsi skema perizinan ganda (Dual-Ownership Validation) dalam merender data dan mengotorisasi tindakan di ruang kerja.

Kondisi otorisasi visibilitas (_Workspace Visibility_) dikendalikan sebagai berikut:

Sebuah Workspace berstatus **DAPAT DIAKSES** oleh entitas User Requesting bilamana:

1. **Kepemilikan Grup (Group Ownership Validation)**
   User terdaftar dalam Organisasi/Grup yang menjadi pemilik struktural Workspace tersebut (melalui parameter `owner_group_id` di entitas `workspaces`).
   **ATAU**
2. **Delegasi Eksplisit (Explicit Membership Validation)**
   User secara sah terdaftar sebagai anggota di tabel `workspace_members` dengan `workspace_id` yang terasosiasi.

Bilamana kedua syarat di atas tidak terpenuhi, sistem dirancang _fail-secure_ dengan secara proaktif menolak akses menggunakan respon protokol `HTTP 403 Forbidden` atau `HTTP 404 Not Found` (untuk menyamarkan eksistensi data dari attacker).

## 4. API Endpoints

Berikut adalah spesifikasi integrasi _Endpoint API_ Workspace Members (telah lolos tes integrasi Pest PHP):

- **GET `/api/workspaces/{workspace_id}/members`**
    - **Fungsi:** Mengembalikan daftar anggota yang berada di dalam Workspace.
    - **Pengamanan Akses:** Sistem memastikan user pemanggil (caller) memiliki visibilitas terhadap workspace tersebut.

- **POST `/api/workspaces/{workspace_id}/members`**
    - **Fungsi:** Menambahkan atau mengundang anggota baru ke Workspace (dengan role: `admin`, `member`, atau `viewer`).
    - **Pengamanan Akses:** Dibatasi (RBAC), mengharuskan user pemanggil memiliki autorisasi _Update Workspace_ (Workspace Admin atau bagian dari Owner Group).

- **DELETE `/api/workspaces/{workspace_id}/members/{user_id}`**
    - **Fungsi:** Mencabut akses pengguna dari ruang kerja.
    - **Pengamanan Akses:** Mengharuskan autorisasi _Update Workspace_.

_Catatan QA: Segala percobaan Bypass-IDOR pada operasi manipulasi (POST/DELETE) antar anggota terisolasi dipastikan ditolak (Status 403)._

## 5. Hierarki Keamanan: Alir Visibilitas Workspace

Representasi diagram alir berikut menggambarkan tata kelola bagaimana Backend/Core merender dan mengevaluasi otorisasi visibilitas Workspace untuk Requesting User.

```mermaid
flowchart TD
    Start([Mulai: Request Akses Data/Manipulasi Workspace]) --> AuthCheck{Autentikasi Valid?}

    AuthCheck -- Tidak (Unauthenticated) --> Reject401([Tolak: 401 Unauthorized])
    AuthCheck -- Ya --> QueryUser[Ambil Identitas Requesting User]

    QueryUser --> SuperadminCheck{Apakah User adalah Superadmin?}

    SuperadminCheck -- Ya --> GrantFull([Akses Diberikan: Render Full Access])
    SuperadminCheck -- Tidak --> OwnerGroupCheck{Cek Grup:\nUser di 'owner_group_id'?}

    OwnerGroupCheck -- Ya --> GrantFull
    OwnerGroupCheck -- Tidak --> MemberCheck{Cek Explicit Membership:\nUser ada di 'workspace_members'?}

    MemberCheck -- Ya --> GrantLimited([Akses Diberikan: Render Sesuai Role Member])
    MemberCheck -- Tidak --> Reject403([Tolak: 403 Forbidden / 404 Not Found])

    GrantFull --> AuditLog[Catat Transaksi di Audit Trail]
    GrantLimited --> AuditLog
    Reject403 --> IncidentLog[Trigger Incident Response / Potensi IDOR]
```

## 6. Integrasi Log Audit (Compliance)

Setiap modifikasi data (Penambahan, Pencabutan akses, Perubahan Role) maupun deteksi percobaan eksploitasi visibilitas Anti-IDOR wajib didokumentasikan di dalam **Global Audit Trail** guna memenuhi prasyarat investigasi _Security Forensics_ serta mendukung parameter penilaian kepatuhan (_IT Governance/Compliance_).
