# User Manual & Feature Guide

## Workload & Learning Management System (WLMS)

Panduan operasional dan penggunaan fitur aplikasi untuk pengguna akhir (_End Users_), pimpinan tim, dan administrator.

---

## 1. Peta Navigasi & Pintasan Global

WLMS dirancang dengan navigasi yang cepat dan ergonomis:

- **Pintasan Keyboard Global (`c`)**: Tekan tombol `c` di halaman mana pun untuk membuka modal pembuatan tiket instan (_Global Issue Modal_).
- **Pengaturan Tampilan & Kepadatan UI**: Masuk ke menu `Settings > Appearance` untuk memilih mode Gelap/Terang, bahasa sistem (Inggris / Indonesia), dan ukuran kepadatan tampilan (**Small / Medium / Large**) yang akan diterapkan secara global ke seluruh papan Kanban dan tabel tugas.

---

## 2. Panduan Penggunaan per Modul

### 2.1 Dashboard Eksekutif & Personal (`/dashboard`)

Halaman ringkasan beban kerja personal dan pemantauan proyek:

1. **4 Kartu Metrik Utama**:
    - **Active Projects**: Jumlah proyek aktif yang dapat Anda akses.
    - **Completion Rate**: Persentase penyelesaian tiket keseluruhan (`selesai / total tiket`).
    - **My Open Tasks**: Jumlah tiket tugas aktif yang sedang ditugaskan kepada Anda.
    - **Overdue Tasks**: Jumlah tiket yang telah melewati tenggat waktu (_due date_), disorot dengan warna merah jika $> 0$.
2. **Tab Tugas Saya (_My Assigned Tasks_)**:
    - Filter cepat: `All`, `Overdue`, `Due Today`, `Upcoming`.
    - Klik kartu tugas untuk langsung membuka detail proyek dan tiket terkait.
3. **Alur Aktivitas Terkini (_Recent Activity_)**:
    - Menampilkan siaran langsung (_live stream_) perubahan tiket (perubahan status, PIC baru, atau pembuatan tugas baru).

---

### 2.2 Global "My Tasks" Hub (`/issues`)

Pusat kendali seluruh tiket tugas lintas workspace:

- **Workspace Switcher**: Pilih workspace melalui combobox di kanan atas untuk memuat tugas dari divisi/ruang kerja terkait.
- **Pencarian & Multi-Filter**:
    - Kolom pencarian teks instan (mencari berdasarkan judul atau nomor tiket).
    - Filter berdasarkan Proyek, Assignee (termasuk filter khusus: _Assigned to Me_ dan _Unassigned_), serta Kategori Status (_To Do_, _In Progress_, _Done_).
- **Client Pagination**: Pengguna dapat memilih jumlah baris per halaman: **10, 20, 50, atau 100 baris**.
- **Aksi Massal (_Floating Bulk Action Bar_)**:
    - Centang beberapa tiket sekaligus melalui checkbox di sebelah kiri baris.
    - Bilah aksi melayang (_floating bar_) akan muncul di bagian bawah layar untuk mengubah status atau menugaskan PIC banyak tiket secara bersamaan dengan satu klik.

---

### 2.3 Manajemen Proyek, Kanban Board & Sprint (`/projects/{id}`)

Pusat eksekusi proyek berbasis metodologi Agile:

1. **Tampilan Kanban Board**:
    - Papan Kanban interaktif dengan kolom alur kerja (_Workflow Columns_).
    - Geser dan lepas (_Drag-and-Drop_) kartu tiket antar kolom status. Sistem akan secara otomatis memvalidasi apakah transisi alur kerja diizinkan.
    - Kolom status _Done_ memiliki tombol otomatis untuk menyembunyikan (_auto-archive_) tiket yang telah selesai agar papan tetap ringkas.
2. **Backlog & Siklus Sprint**:
    - Buka tab **Backlog** untuk melihat daftar sprint yang sedang direncanakan dan tumpukan backlog.
    - **Drag-and-Drop Tiket**: Geser tiket dari Backlog ke dalam kotak sprint yang dituju.
    - **Sprint Workload Widget**: Memantau kapasitas beban kerja dan total estimasi jam kerja per anggota tim dalam sprint tersebut.
    - **Start Sprint**: Klik tombol _Start Sprint_ untuk mengaktifkan iterasi kerja.
    - **Complete Sprint**: Klik _Complete Sprint_ saat masa sprint berakhir. Dialog penyelesaian akan menanyakan apakah sisa tiket yang belum tuntas akan dipindahkan ke sprint berikutnya atau dikembalikan ke Backlog.
3. **Pencatatan Jam Kerja (_Log Work_)**:
    - Buka popover estimasi waktu pada kartu tiket.
    - Masukkan durasi jam kerja riil yang telah dihabiskan beserta catatan singkat pekerjaan. Sisa estimasi waktu tiket akan berkurang secara otomatis.

---

### 2.4 Impor Massal Data via Excel Spreadsheet (`/admin/import-workload`)

Fasilitas impor ratusan proyek dan tiket sekaligus dari file spreadsheet:

1. Akses menu **Import Workload** (khusus peran Administrator / Owner).
2. Unduh template spreadsheet resmi (.xlsx / .csv).
3. Unggah file spreadsheet yang telah diisi.
4. **Pencocokan Otomatis PIC**: Sistem akan memetakan nama PIC pada spreadsheet dengan akun pengguna sistem melalui 4 tingkatan prioritas:
    - Prioritas 1: Kecocokan persis Nomor Induk Pegawai (**NIP / Employee ID**).
    - Prioritas 2: Kecocokan persis alamat **Email**.
    - Prioritas 3: Kecocokan persis **Nama Lengkap**.
    - Prioritas 4: Pencarian parsial nama (_fallback_).
5. Proses impor berjalan di latar belakang (_background job_). Anda dapat menutup halaman tanpa khawatir proses terputus. Notifikasi ringkasan berhasil/gagal akan muncul otomatis setelah impor selesai.

---

### 2.5 Struktur Organisasi & Pengaturan Hak Akses (`/settings/rbac`)

Khusus Superadmin:

- **Manajemen Hirarki Unit Organisasi**: Menambah, mengubah nama, dan menyusun relasi induk-anak unit divisi.
- **Penugasan Peran Berorientasi Konteks**: Memberikan peran (_Roles_) ke pengguna dengan cakupan spesifik:
    - Lingkup `GLOBAL`: Berlaku untuk seluruh sistem.
    - Lingkup `WORKSPACE`: Pilih workspace spesifik.
    - Lingkup `PROJECT`: Pilih proyek spesifik.
- **Pencabutan Peran**: Klik tombol silang ($\times$) pada lencana peran pengguna untuk mencabut akses secara instan.
