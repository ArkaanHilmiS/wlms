# User Acceptance Testing (UAT)

## Fitur: Multi-Language (i18n)

**Modul:** Pengaturan Bahasa / i18n
**Tanggal Pengujian:** ___________________
**Diuji Oleh:** ___________________

### 1. Skenario Pengujian

| No  | ID Skenario   | Deskripsi Skenario                 | Langkah Pengujian                                                                                             | Hasil yang Diharapkan                                                                     | Status (Pass/Fail) | Catatan |
| --- | ------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------ | ------- |
| 1   | `UAT-I18N-01` | Memuat bahasa default sistem       | 1. Buka halaman utama aplikasi tanpa login/sesi khusus.<br>2. Perhatikan bahasa yang tampil.                  | Aplikasi dimuat dengan bahasa default (misal: Bahasa Indonesia).                          | [ ]                |         |
| 2   | `UAT-I18N-02` | Mengganti bahasa melalui antarmuka | 1. Klik menu dropdown bahasa (misal: EN).<br>2. Halaman memuat ulang atau merender ulang UI.                  | Seluruh teks statis pada halaman berubah ke bahasa yang dipilih (English).                | [ ]                |         |
| 3   | `UAT-I18N-03` | Persistensi bahasa saat navigasi   | 1. Ubah bahasa ke opsi lain (misal: English).<br>2. Pindah ke halaman lain (misal: Profil/Dashboard).         | Halaman baru yang dibuka tetap menggunakan bahasa English.                                | [ ]                |         |
| 4   | `UAT-I18N-04` | Persistensi bahasa saat refresh    | 1. Ubah bahasa.<br>2. Lakukan hard refresh (F5/Ctrl+R).                                                       | Bahasa tetap pada pilihan terakhir pengguna sebelum refresh.                              | [ ]                |         |
| 5   | `UAT-I18N-05` | Mekanisme Fallback (Teks Hilang)   | 1. Tambahkan _key_ terjemahan baru di source code, tapi kosongkan di file bahasa.<br>2. Buka halaman terkait. | Aplikasi tidak error. Menampilkan teks asli (_key_) atau bahasa fallback yang ditentukan. | [ ]                |         |

### 2. Sign-Off Manajemen

Dengan menandatangani dokumen ini, manajemen menyatakan bahwa fitur Multi-Language (i18n) telah diuji secara komprehensif, memenuhi spesifikasi fungsional yang disyaratkan, dan siap untuk dirilis ke tahap produksi.

| Peran                     | Nama | Tanda Tangan | Tanggal |
| ------------------------- | ---- | ------------ | ------- |
| QA / Tester               |      |              |         |
| Product Manager           |      |              |         |
| Project Sponsor / Manajer |      |              |         |
