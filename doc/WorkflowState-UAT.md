# USER ACCEPTANCE TEST (UAT) - MATRIKS PENGUJIAN

## MODUL WORKFLOW & STATE MACHINE

**Informasi Dokumen**

| Atribut               | Keterangan                            |
| --------------------- | ------------------------------------- |
| **Modul**             | Workflow & State Machine              |
| **Tanggal Pengujian** | 17 September 2026                     |
| **Penguji (QA/BA)**   | QA Security Team / System Analyst     |
| **Versi / Standar**   | Enterprise & Bank-grade UAT Standards |

---

### 1. METODOLOGI PENGUJIAN

Pengujian dilakukan menggunakan pendekatan komprehensif:

1. **Black-Box Testing (Positive Path)**: Memastikan proses bisnis dasar berjalan sesuai dengan fungsionalitas yang diharapkan oleh user (khususnya Superadmin).
2. **Break-Driven / Security-First Testing (Negative Path & Edge Cases)**: Mengutamakan pengujian kerentanan seperti _Insecure Direct Object Reference (IDOR)_, _State Machine Bypass_, dan _Privilege Escalation_ guna memastikan sistem tahan terhadap intrusi/manipulasi.

### 2. MATRIKS SKENARIO PENGUJIAN

#### 2.1 Skenario Normal (Positive Case) - Konfigurasi Superadmin

| No  | Sub-Modul | Skenario UAT                         | Langkah Pengujian                                                                                                    | Hasil yang Diharapkan                                                                                          | Status / Tanda Tangan |
| :-- | :-------- | :----------------------------------- | :------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- | :-------------------- |
| 1   | Statuses  | Membuat Master Status Baru           | 1. Login sebagai Superadmin<br>2. Masuk ke modul Status<br>3. Input Nama dan Color Code, lalu submit                 | Status baru tercipta. Muncul notifikasi sukses dan data tampil di tabel master data status.                    | [ ] Pass / [ ] Fail   |
| 2   | Statuses  | Mengubah Data Status                 | 1. Pilih suatu Status di tabel<br>2. Ubah warna/labelnya<br>3. Submit                                                | Perubahan tersimpan. Entitas yang menggunakan status tersebut langsung melihat perubahan label (cascade read). | [ ] Pass / [ ] Fail   |
| 3   | Workflows | Membuat Transisi (Workflow)          | 1. Masuk ke modul Workflow<br>2. Set Status Asal = `DRAFT`<br>3. Set Status Tujuan = `PENDING_APPROVAL`<br>4. Submit | Sistem berhasil menyimpan rule transisi. Relasi antar status terekam dengan benar.                             | [ ] Pass / [ ] Fail   |
| 4   | Workflows | Transisi Status Entitas (End-to-End) | 1. Buka entitas bisnis (mis: Dokumen Draft)<br>2. Trigger aksi "Submit"<br>3. Verifikasi Log                         | Status Dokumen berubah menjadi `PENDING_APPROVAL`. Audit Trail mencatat aktivitas perubahan oleh user terkait. | [ ] Pass / [ ] Fail   |

#### 2.2 Skenario Keamanan & Edge Cases (Anti-IDOR / Negative Case)

| No  | Sub-Modul | Skenario UAT (Break-Driven)                    | Langkah Pengujian                                                                                                                                          | Hasil yang Diharapkan (Security First)                                                                                                                    | Status / Tanda Tangan |
| :-- | :-------- | :--------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------- |
| 1   | Statuses  | IDOR (Update Data Bukan Miliknya)              | 1. Login sebagai Admin Cabang A (bukan Superadmin)<br>2. Tembak Endpoint PUT `/statuses/{id}` menggunakan ID Status milik Cabang B atau Master             | Sistem mendeteksi IDOR. Respons kembalian berupa `403 Forbidden` atau `404 Not Found` (Zero Leakage). Data master tetap aman.                             | [ ] Pass / [ ] Fail   |
| 2   | Statuses  | Penghapusan Data Bersyarat (Dependency)        | 1. Pilih status yang sudah digunakan (mis: status `COMPLETED` yang melekat pada transaksi aktif)<br>2. Tembak Endpoint DELETE `/statuses/{id}`             | Sistem menolak aksi tersebut. Respons mengindikasikan bahwa data masih berhubungan (Constraint Violation) `409 Conflict` atau `422 Unprocessable Entity`. | [ ] Pass / [ ] Fail   |
| 3   | Workflows | Bypass State Machine (Lompat Status)           | 1. Intercept payload pada saat mengubah dokumen<br>2. Ubah `status_id` tujuan menjadi status yang tidak memiliki relasi Workflow (mis: DRAFT -> COMPLETED) | Sistem menggagalkan transisi (State Machine Constraint aktif). Respons `422 Unprocessable Entity` - Transisi tidak valid berdasarkan ruleset.             | [ ] Pass / [ ] Fail   |
| 4   | Workflows | Eksekusi Transisi Tanpa Role (Privilege Check) | 1. Login menggunakan akun level Staff<br>2. Kirim request persetujuan (PENDING_APPROVAL -> APPROVED) via API yang hanya boleh dilakukan oleh Manager       | Sistem mencegah transisi dieksekusi oleh Role yang salah. Respons `403 Unauthorized`.                                                                     | [ ] Pass / [ ] Fail   |

### 3. LEMBAR PERSETUJUAN (SIGN-OFF)

Dokumen ini menyatakan bahwa Modul **Workflow & State Machine** telah melalui pengujian keamanan maupun fungsionalitas. Rilis ke Production hanya diizinkan apabila seluruh Check-list berstatus **Pass**.

| Peran                | Nama Terang               | Tanggal                   | Tanda Tangan              |
| :------------------- | :------------------------ | :------------------------ | :------------------------ |
| QA Security Engineer | ......................... | ......................... | ......................... |
| System Analyst / BA  | ......................... | ......................... | ......................... |
| Product Manager / PO | ......................... | ......................... | ......................... |
