# Berita Acara User Acceptance Test (UAT)

## Modul: Issues / Tasks Management (Sprint 7)

**Tanggal UAT:** 14 September 2026  
**Status UAT:** LULUS (APPROVED)

### 1. Informasi Sistem

- **Aplikasi:** Workload Management System (WLMS)
- **Versi Rilis:** v1.7.0
- **Lingkungan Pengujian:** Staging

### 2. Matriks Skenario Pengujian

| ID Skenario | Skenario Pengujian                     | Hasil yang Diharapkan                                                                                                                                                                  | Status    |
| ----------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| UAT-ISS-001 | Pembuatan Issue Baru (Auto-numbering)  | Sistem menghasilkan `IssueKey` unik dengan format `[ProjectCode]-[Sequence]`, misal: `WLMS-42`.                                                                                        | **LULUS** |
| UAT-ISS-002 | Validasi Transisi Status (Valid)       | Memindahkan issue dari `To Do` ke `In Progress` berhasil disimpan ke database.                                                                                                         | **LULUS** |
| UAT-ISS-003 | Validasi Transisi Status (Tidak Valid) | Memindahkan issue dari `To Do` langsung ke `Done` (jika aturan workflow tidak mengizinkan) ditolak oleh Backend.                                                                       | **LULUS** |
| UAT-ISS-004 | UI Optimistic Rollback                 | Saat transisi ditolak oleh backend (seperti skenario 003), kartu issue pada Kanban Board kembali ke kolom asal secara instan tanpa pesan error yang mengganggu (graceful degradation). | **LULUS** |
| UAT-ISS-005 | Assign Issue ke Pengguna               | Menyematkan pengguna (Assignee) ke dalam issue berhasil dengan notifikasi sukses.                                                                                                      | **LULUS** |

### 3. Persetujuan (Sign-off)

Pengujian ini telah dilakukan sesuai dengan Business Requirements Document (BRD) dan Functional Specification Document (FSD). Sistem dinyatakan **LULUS** dan siap dipromosikan ke lingkungan Production.

| Peran         | Nama                | Tanda Tangan        | Tanggal    |
| ------------- | ------------------- | ------------------- | ---------- |
| Product Owner | [_________________] | [_________________] | 14/09/2026 |
| QA Lead       | [_________________] | [_________________] | 14/09/2026 |
| IT Compliance | [_________________] | [_________________] | 14/09/2026 |
