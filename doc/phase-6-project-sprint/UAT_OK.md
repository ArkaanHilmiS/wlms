# Berita Acara User Acceptance Test (UAT)

## Modul Project & Sprint - Phase 6

**Nomor Dokumen:** BA-UAT-WLMS-PHASE6-001
**Tanggal Pengujian:** 14 September 2026
**Sistem/Aplikasi:** Workload Management System (WLMS)
**Lingkungan (Environment):** Staging / Pre-Production

---

### 1. Informasi Pelaksanaan

Pada hari ini, telah dilakukan pengujian sistem (User Acceptance Test) untuk fitur **Manajemen Project dan Sprint** berdasarkan Functional Specification Document (FSD) Versi 1.0.0. Pengujian ini bertujuan untuk memvalidasi kelayakan rilis sistem ke lingkungan _Production_.

### 2. Matriks Pengujian Skenario (Traceability Matrix)

| No  | ID Skenario  | Deskripsi Skenario Uji                                 | Kriteria Penerimaan (Expected Result)                                              | Hasil Aktual (Actual Result) |  Status  | Catatan Tambahan                        |
| :-- | :----------- | :----------------------------------------------------- | :--------------------------------------------------------------------------------- | :--------------------------- | :------: | :-------------------------------------- |
| 1   | `UAT-PRJ-01` | Membuat Project dengan payload valid                   | Sistem merespons kode 201 dan data tersimpan di _Database_ dengan status `PLANNED` | Sesuai ekspektasi            | **PASS** | `ProjectCode` terbuat sesuai format     |
| 2   | `UAT-PRJ-02` | Membuat Project dengan `ProjectCode` duplikat          | Sistem merespons kode 422 Unprocessable Entity (Conflict)                          | Sesuai ekspektasi            | **PASS** | Validasi duplikasi _database_ berfungsi |
| 3   | `UAT-PRJ-03` | `EndDate` Project lebih kecil dari `StartDate`         | Sistem merespons kode 400 Bad Request                                              | Sesuai ekspektasi            | **PASS** | _Business logic rule_ terpicu           |
| 4   | `UAT-SPR-01` | Membuat Sprint dengan payload valid pada Project eksis | Sistem merespons kode 201, `ProjectId` terelasi dengan benar                       | Sesuai ekspektasi            | **PASS** | Data ter-mapping sempurna               |
| 5   | `UAT-SPR-02` | Linimasa Sprint melampaui `EndDate` Project            | Sistem menolak dengan 422 dan memberikan pesan error limitasi waktu                | Sesuai ekspektasi            | **PASS** | _Time-boxing constraint_ tervalidasi    |

### 3. Kesimpulan

Berdasarkan hasil pengujian pada tabel matriks di atas, seluruh fitur berjalan sesuai spesifikasi teknis dan kebutuhan bisnis tanpa adanya _Critical Bug_ atau _Showstopper_. Oleh karena itu, modul Manajemen Project dan Sprint dinyatakan **LAYAK (APPROVED)** untuk dipromosikan (Promote) ke lingkungan _Production_.

---

### 4. Lembar Persetujuan (Sign-off)

| Peran / Jabatan              | Nama                                | Tanggal     | Tanda Tangan (Digital Sign) |
| :--------------------------- | :---------------------------------- | :---------- | :-------------------------- |
| **Product Owner**            | ................................... | 14 Sep 2026 | _[ Signed ]_                |
| **Quality Assurance Lead**   | ................................... | 14 Sep 2026 | _[ Signed ]_                |
| **VP of Engineering**        | ................................... | 14 Sep 2026 | _[ Signed ]_                |
| **Direktur Teknologi (CTO)** | ................................... | 14 Sep 2026 | _[ Signed ]_                |
