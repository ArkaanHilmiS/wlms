# BERITA ACARA USER ACCEPTANCE TEST (UAT)

**Modul:** Issues / Ticketing Management
**Proyek:** Workload Management System (WLMS)
**Tanggal Pelaksanaan:** 17 September 2026
**Nomor Dokumen:** UAT/WLMS/2026/09-001

## 1. PERSETUJUAN (SIGN-OFF)

Dengan ditandatanganinya dokumen ini, maka modul Issues/Ticketing telah diuji coba, diverifikasi, dan dinyatakan **DITERIMA** untuk dipublikasikan ke lingkungan Produksi.

| Peran               | Nama               | Jabatan              | Tanggal     | Tanda Tangan |
| ------------------- | ------------------ | -------------------- | ----------- | ------------ |
| Penguji (Tester)    | Tim QA Security    | QA Security Engineer | 17-Sep-2026 | _[Signed]_   |
| Pemilik Produk (PO) | Tim Product        | VP of Product        | 17-Sep-2026 | _[Signed]_   |
| Mengetahui          | Board of Directors | CTO/Direktur IT      | 17-Sep-2026 | _[Signed]_   |

## 2. MATRIKS PENGUJIAN FUNGSIONAL

| ID Tes  | Fitur/Modul   | Skenario Pengujian                                                                       | Kriteria Penerimaan (Acceptance Criteria)                                                                   | Hasil (Pass/Fail) | Catatan |
| ------- | ------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------- | ------- |
| TC-F-01 | Create Issue  | Pengguna membuat _Issue_ baru pada _Project_ A dengan mengisi _Title_ dan _Description_. | Sistem menyimpan data, merespons kode 201, _Issue_ muncul di list dengan status _Backlog_.                  | [ PASS ]          |         |
| TC-F-02 | Update Status | _Assignee_ mengubah status _Issue_ dari _To Do_ menjadi _In Progress_.                   | Status berhasil diperbarui di database dan UI merespons tanpa perlu _reload_ (Real-time/Optimistic).        | [ PASS ]          |         |
| TC-F-03 | Assign User   | _Project Manager_ menetapkan _User_ lain sebagai _Assignee_.                             | Data _assignee_id_ ter-update, _User_ menerima notifikasi penugasan.                                        | [ PASS ]          |         |
| TC-F-04 | Filter Issues | Filter list _Issues_ berdasarkan parameter `status` atau `assignee`.                     | API mengembalikan list data sesuai kriteria pencarian secara akurat dan paginasi berfungsi.                 | [ PASS ]          |         |
| TC-F-05 | Add Comment   | Pengguna menambahkan komentar pada sebuah _Issue_.                                       | Sistem menyimpan komentar, merespons kode 201, komentar muncul di bawah _Issue_ beserta waktu dan pengirim. | [ PASS ]          |         |
| TC-F-06 | View Comments | Pengguna membuka detail _Issue_ yang sudah memiliki komentar.                            | Semua komentar dimuat dengan benar secara kronologis.                                                       | [ PASS ]          |         |

## 3. SKENARIO KEAMANAN & ANTI-IDOR (INSECURE DIRECT OBJECT REFERENCE)

_Bagian ini wajib diperiksa secara ketat sesuai standar zero data breach._

| ID Tes  | Tipe Serangan        | Skenario Pengujian                                                                    | Hasil yang Diharapkan                                                                                                                           | Hasil (Pass/Fail) | Catatan Penting                                       |
| ------- | -------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------- |
| TC-S-01 | Anti-IDOR            | _User A_ (hanya akses _Project X_) mencoba melakukan GET `/api/v1/projects/Y/issues`. | Sistem harus menolak dengan HTTP 403 Forbidden atau 404 Not Found, tidak membocorkan keberadaan data.                                           | [ PASS ]          | Dicegat oleh Policy / Gate Middleware.                |
| TC-S-02 | Anti-IDOR            | _User A_ memanipulasi _Payload_ saat POST _Issue_, menyuntikkan `project_id = Y`.     | Sistem mendeteksi `project_id` tidak valid untuk _User A_ dan merespons HTTP 403.                                                               | [ PASS ]          | Validasi kepemilikan via Use Case/Repository.         |
| TC-S-03 | RBAC / Privilege     | _User Member_ mencoba menghapus (_Delete_) _Issue_ yang dibuat oleh orang lain.       | Transaksi dibatalkan, log mendeteksi _Unauthorized action_, HTTP 403 Forbidden.                                                                 | [ PASS ]          | Hak Delete hanya pada Role Manager ke atas / Creator. |
| TC-S-04 | Data Leakage         | Mengamati _Response Body_ JSON saat mengambil detail _Issue_.                         | Tidak boleh ada terekspos data kredensial/password/token dari relasi _User_. Hanya ID, Nama, dan Avatar yang tampil (melalui API Resource/DTO). | [ PASS ]          | Data sensitif di-_strip_ oleh API Resource.           |
| TC-S-05 | Anti-IDOR (Comments) | _User A_ (tanpa akses ke _Issue X_) mencoba GET / POST komentar pada _Issue X_.       | Sistem menolak dengan HTTP 403 Forbidden.                                                                                                       | [ PASS ]          | Gate Middleware mencegah akses silang project.        |
