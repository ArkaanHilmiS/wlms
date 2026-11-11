# Panduan Pengguna: Impor Data Spreadsheet (Project & Task)

Fitur Impor Data memungkinkan Superadmin untuk mengimpor data Project dan Task (Issue) secara massal menggunakan file spreadsheet (CSV atau Excel). Sistem akan memproses file secara asinkron di latar belakang (background) sehingga Anda dapat melanjutkan pekerjaan lain sementara data diimpor.

## 1. Cara Mengakses Halaman Impor

1. Pastikan Anda masuk (login) dengan akun yang memiliki peran **Superadmin**.
2. Navigasi ke URL berikut: `/admin/import-workload`.
3. Di halaman ini, Anda akan menemukan opsi untuk mengunggah file untuk **Projects** dan **Tasks/Issues**.

## 2. Template Kolom Wajib untuk "Projects"

Saat mengunggah file CSV atau Excel untuk Project, pastikan baris pertama (header) mengandung kolom-kolom wajib berikut. Kolom akan dipetakan secara otomatis berdasarkan baris header ini:

- **Project Name**: Nama dari project.
- **Project Status**: Status project saat ini.
- **Notes**: Catatan tambahan mengenai project.
- **Start Date**: Tanggal mulai project.
- **End Date**: Tanggal selesai project.

## 3. Template Kolom Wajib untuk "Tasks / Issues"

Untuk mengimpor Task atau Issue, pastikan baris pertama (header) file spreadsheet Anda memiliki kolom-kolom wajib berikut:

- **Project**: Nama project yang menaungi task ini.
- **Task**: Nama atau judul dari task/issue.
- **Description**: Deskripsi detail mengenai task tersebut.
- **PIC**: Person In Charge (Penanggung Jawab).
- **Priority**: Tingkat prioritas task.
- **Status**: Status task saat ini.
- **Start Date**: Tanggal mulai pengerjaan task.
- **Due Date**: Tenggat waktu (batas akhir) pengerjaan task.

## 4. Catatan Penting

- **Kolom Tambahan:** Jika file spreadsheet Anda memiliki kolom lain selain yang disebutkan di atas, sistem akan **mengabaikan** kolom tambahan tersebut.
- **Task Operasional (BAU):** Untuk task atau pekerjaan rutin operasional yang tidak terikat pada project spesifik, disarankan untuk memasukkannya ke dalam Project dummy bernama **"BAU"** (Business As Usual) pada kolom "Project".

## 5. Proses Impor di Latar Belakang (Background)

- Sistem mengimpor data menggunakan _background jobs_ (`ImportProjectsJob` dan `ImportIssuesJob`).
- Setelah mengunggah file, Anda akan mendapatkan notifikasi bahwa file sedang diproses. Anda **tidak perlu** membiarkan halaman tetap terbuka.
- Sistem secara perlahan memetakan dan mengimpor baris per baris di belakang layar tanpa mengganggu kinerja aplikasi bagi pengguna lain.
