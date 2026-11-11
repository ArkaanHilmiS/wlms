# Security & Threat Model Specification

## Workload & Learning Management System (WLMS)

Dokumen ini mendefinisikan model ancaman (_Threat Model_) berbasis metodologi **STRIDE** dan mekanisme pertahanan pertahanan berlapis (_Defense-in-Depth_) yang diterapkan pada sistem WLMS.

---

## 1. Analisis Model Ancaman STRIDE

| Kategori Ancaman                                           | Deskripsi Skenario pada WLMS                                                                                                               | Dampak Potensial                                           | Mitigasi yang Diterapkan di Codebase                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S - Spoofing** (Penyamaran Identitas)                    | Penyerang mencoba memalsukan sesi login atau token API user lain.                                                                          | Akses akun tidak sah, manipulasi data beban kerja.         | - Session stateful menggunakan enkripsi cookie & HTTP-only.<br/>- Token API dikelola via Laravel Sanctum dengan hashing SHA-256.<br/>- Password wajib memenuhi aturan kompleksitas (`Password::min(12)->mixedCase()->letters()->numbers()->symbols()->uncompromised()`).                                                                                    |
| **T - Tampering** (Manipulasi Data)                        | Penyerang mencoba mengubah data tiket di luar kewenangannya atau mengirim input berbahaya.                                                 | Kerusakan integritas data, SQL Injection, Mass Assignment. | - Parameterized queries pada 100% interaksi SQL.<br/>- Input divalidasi ketat lewat `FormRequest` khusus sebelum menyentuh lapisan aplikasi.<br/>- Model Eloquent menerapkan `$fillable` terisolasi untuk mencegah Mass Assignment Vulnerability.<br/>- Perlindungan CSRF aktif pada seluruh rute web.                                                      |
| **R - Repudiation** (Penyangkalan Aksi)                    | Pengguna menyangkal telah mengubah status tiket, menghapus sprint, atau memodifikasi PIC.                                                  | Hilangnya akuntabilitas operasional.                       | - Pencatatan otomatis ke tabel `issue_activities` untuk setiap mutasi status, penugasan, dan pembuatan tiket.<br/>- Log audit mencatat `user_id`, `action_type`, `old_value`, `new_value`, dan stempel waktu `created_at`.                                                                                                                                  |
| **I - Information Disclosure** (Kebocoran Informasi)       | Pesan error internal server membocorkan kredensial atau skema database saat terjadi exception.                                             | Memberikan peta serangan bagi pihak luar.                  | - `AppServiceProvider::configureDefaults()` melarang perintah destruktif di produksi.<br/>- Masking error di controller (misal: [`RoleController.php`](file:///Users/robileksono/Sites/wlms/app/Modules/Identity/Presentation/Http/Controllers/RBAC/RoleController.php) mencatat error rinci ke `Log::error` dan hanya mengembalikan pesan ramah pengguna). |
| **D - Denial of Service** (Kelumpuhan Layanan)             | Penyerang membanjiri API dengan ribuan request serentak atau query pagination raksasa.                                                     | Server kehabisan memori (_OOM_), layanan tidak responsif.  | - Pembatasan laju kueri (_Rate Limiting_) via `RateLimiter::for('api')` (300 request/menit per user/IP di [`AppServiceProvider.php`](file:///Users/robileksono/Sites/wlms/app/Providers/AppServiceProvider.php)).<br/>- Query referensi dan pagination dibatasi safeguard maksimum (`per_page = min(500, max(1, ...))` dan `->limit(500)`).                 |
| **E - Elevation of Privilege** (Eskalasi Hak Akses / IDOR) | Anggota tim Divisi B mencoba melihat atau mengedit tiket rahasia Divisi A dengan menebak UUID di URL (_Insecure Direct Object Reference_). | Pelanggaran kerahasiaan data lintas divisi.                | - Sentralisasi otorisasi anti-IDOR via [`WorkloadAccessChecker::canViewProject()`](file:///Users/robileksono/Sites/wlms/app/Modules/Workload/Application/Services/WorkloadAccessChecker.php#L64).<br/>- Validasi disematkan di 10 controller kritis; menolak akses dengan `abort(403, 'Unauthorized.')`.                                                    |

---

## 2. Arsitektur Otorisasi Anti-IDOR (`WorkloadAccessChecker`)

Setiap endpoint yang menerima identifier proyek atau tiket wajib melewati gerbang otorisasi kontekstual:

```mermaid
flowchart TD
    Req([HTTP Request: /api/projects/{id}/...]) --> CheckSuper{Apakah Superadmin?<br/>email == superadmin OR role == Superadmin}
    CheckSuper -- Ya --> Allow([Akses Diberikan: 200 OK])

    CheckSuper -- Tidak --> CheckOwner{Divisi Cocok?<br/>user.org_unit_id == workspace.owner_group_id}
    CheckOwner -- Ya --> Allow

    CheckOwner -- Tidak --> CheckMember{Anggota Workspace?<br/>workspace_members row exists}
    CheckMember -- Ya --> Allow

    CheckMember -- Tidak --> CheckLead{Apakah Project Lead?<br/>project.lead_id == user.id}
    CheckLead -- Ya --> Allow

    CheckLead -- Tidak --> CheckRole{Punya Role Konteks Proyek?<br/>user_roles: context_type='PROJECT'}
    CheckRole -- Ya --> Allow

    CheckRole -- Tidak --> CheckAssignee{Punya Tiket Aktif di Proyek?<br/>issues.assignee_id == user.id}
    CheckAssignee -- Ya --> Allow

    CheckAssignee -- Tidak (IDOR Terdeteksi) --> Deny([Akses Ditolak: 403 Forbidden])
```

---

## 3. Checklist Audit Keamanan & Hardening

- [x] **Rate Limiter Aktif**: `throttle:api` terpasang di `bootstrap/app.php`.
- [x] **Anti-IDOR Terpasang di 10 Controller**: `GetBoardController`, `GetBacklogController`, `ProjectActivityController`, `GetProjectSprintsController`, `IssueController` (index & show), `GetValidTransitionsController`, `GetIssueWorklogsController`, `GetSprintWorkloadController`, `GetIssueTimelineController`, `AddCommentController`.
- [x] **Perlindungan Role Superadmin**: Role `Superadmin` diproteksi dari pengubahan nama dan penghapusan di `RoleController`.
- [x] **Masking Exception**: Tidak ada `$e->getMessage()` mentah yang diekspos ke client pada endpoint RBAC.
- [x] **Safeguard Query**: Tidak ada query tanpa batas pada master roles, org units, atau sprint issues.
- [x] **Regression Tests Security**: Diverifikasi lulus 100% pada `tests/Feature/Modules/Workload/WorkspaceMultiViewTest.php` dan `tests/Feature/Modules/Workload/IssueApiSecurityTest.php`.
