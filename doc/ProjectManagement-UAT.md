# USER ACCEPTANCE TEST (UAT)

**Modul:** Project Management (Manajemen Proyek)  
**Tanggal Pelaksanaan:** 17 September 2026  
**Status Audit:** Lulus

## 1. Pendahuluan

Dokumen ini mendefinisikan skenario _User Acceptance Test_ (UAT) yang digunakan untuk memvalidasi fungsionalitas dan keamanan dari modul Manajemen Proyek. Skenario dirancang untuk memastikan kesesuaian operasi normal oleh Superadmin dan perlindungan keamanan terhadap kerentanan _Insecure Direct Object Reference_ (IDOR) oleh User Biasa.

## 2. Matriks Pengujian

### 2.1 Skenario Normal: Superadmin

| No  | ID Pengujian | Deskripsi Skenario     | Langkah Pengujian                                                    | Hasil yang Diharapkan (Expected Result)                                        | Status | Catatan |
| --- | ------------ | ---------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------ | ------- |
| 1   | UAT-PM-SA-01 | Create Project         | Superadmin mengisi form proyek baru dengan data valid dan menyimpan. | Proyek berhasil dibuat, pesan sukses muncul, dan data tersimpan di _database_. | LULUS  | -       |
| 2   | UAT-PM-SA-02 | Read All Projects      | Superadmin mengakses daftar proyek.                                  | Sistem menampilkan seluruh daftar proyek tanpa batasan.                        | LULUS  | -       |
| 3   | UAT-PM-SA-03 | Update Project         | Superadmin mengubah detail proyek A.                                 | Perubahan pada proyek A berhasil disimpan dan diperbarui di sistem.            | LULUS  | -       |
| 4   | UAT-PM-SA-04 | Archive/Delete Project | Superadmin menghapus/mengarsipkan proyek B.                          | Proyek B berhasil diarsipkan/dihapus, dan tidak muncul lagi di daftar aktif.   | LULUS  | -       |

### 2.2 Skenario Keamanan (Anti-IDOR): User Biasa

| No  | ID Pengujian | Deskripsi Skenario            | Langkah Pengujian                                                                                         | Hasil yang Diharapkan (Expected Result)                                                             | Status | Catatan                                 |
| --- | ------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------ | --------------------------------------- |
| 1   | UAT-PM-US-01 | Read Own Project              | User mengakses daftar proyek miliknya.                                                                    | Sistem menampilkan proyek yang ditugaskan kepada User tersebut saja.                                | LULUS  | -                                       |
| 2   | UAT-PM-US-02 | Read Other's Project (IDOR)   | User mencoba mengakses URL proyek milik pengguna lain dengan mengubah ID di URL (misal: `/projects/999`). | Sistem menolak akses dan mengembalikan pesan "403 Forbidden". Data pengguna lain tidak bocor.       | LULUS  | Sistem mendeteksi manipulasi parameter. |
| 3   | UAT-PM-US-03 | Update Other's Project (IDOR) | User mengirim _payload_ pembaruan (PUT/PATCH) dengan ID proyek milik orang lain.                          | Sistem menolak perubahan dan mengembalikan _error_ 403. Tidak ada data yang berubah.                | LULUS  | -                                       |
| 4   | UAT-PM-US-04 | Delete Any Project (IDOR)     | User mengirim permintaan _DELETE_ dengan ID proyek mana pun.                                              | Sistem menolak permintaan dengan "403 Forbidden", karena User tidak memiliki otorisasi penghapusan. | LULUS  | -                                       |

## 3. Kesimpulan

Sistem telah lulus seluruh skenario pengujian dengan tingkat keberhasilan 100%. Mekanisme Anti-IDOR berfungsi dengan baik, memastikan kepatuhan terhadap standar keamanan _Enterprise / BUMN_.
