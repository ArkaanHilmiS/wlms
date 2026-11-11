# Dokumentasi Fitur: Workspace Hub & Trello-Style Kanban

Dokumen ini mencatat implementasi arsitektur terpadu (_Unified Multi-View Hub_) pada modul Workload, menghubungkan pemantauan tingkat portofolio (_Overview Projects_), manajemen tiket lintas-proyek (_All Tasks List_), dan alur kerja harian (_Workspace Kanban_ bergaya Trello).

---

## 1. Arsitektur Tampilan (Multi-View System)

Halaman `/projects?workspace_id=...` kini memiliki tiga mode tampilan yang dapat dipilih secara dinamis:

1. **Overview Projects (`activeTab = 'overview'`):**
    - **Grid View:** Kartu proyek berdesain ringkas dengan inisial avatar berwarna pastel (deterministik berdasarkan _hash_ nama proyek). Deskripsi kosong tidak lagi memunculkan teks redundan. Dilengkapi metrik _progress bar_ jumlah task dan rentang tanggal mulai/selesai.
    - **Table/List View:** Mode tabel horizontal yang sangat ideal untuk memindai puluhan/ratusan proyek dalam hitungan detik.
    - **Toggle View:** Tombol beralih instan antara Grid dan Tabel.

2. **All Tasks (`activeTab = 'tasks'`):**
    - Tabel komprehensif seluruh task dari seluruh proyek yang ada di workspace terkait.
    - Filter cepat: _All_, _Assigned to Me_, _To Do_, _In Progress_, _Done_.
    - Filter pencarian instan berdasarkan judul tiket atau ID/Key.
    - Tombol _Create Task_ terintegrasi.

3. **Workspace Kanban (`activeTab = 'kanban'`):**
    - Papan Kanban visual dinamis yang mengelompokkan tiket berdasarkan kolom status.
    - **`+ Add another list` (Gaya Trello):** Tombol di sebelah kanan kolom terakhir untuk membuat kolom status baru secara instan tanpa perlu meninggalkan papan atau me-reload halaman.
    - **`+ Add a card`:** Tombol di bagian bawah tiap kolom untuk membuat task baru secara cepat langsung pada status terkait.
    - **Badge Proyek:** Tiap kartu tiket menampilkan nama proyek asalnya sehingga mudah dibedakan saat dipantau bersama di board global workspace.
    - **Menu Transisi Cepat:** Menu aksi pada tiap kartu untuk memindahkan status tiket ke kolom lain.

---

## 2. API Contract & Perubahan Backend

- **`GET /api/workspaces/{workspace_id}/projects`**:
    - Mengembalikan daftar proyek lengkap dengan kalkulasi `total_issues_count`, `completed_issues_count`, `description`, `start_date`, dan `end_date`.
- **`GET /api/workspaces/{workspace_id}/issues`**:
    - Mengembalikan seluruh task di dalam workspace untuk menyuplai data tabel task dan papan Kanban.
- **`POST /api/statuses`**:
    - Digunakan oleh tombol `+ Add another list` untuk mendaftarkan status alur kerja baru. Diizinkan bagi pengguna dengan peran Superadmin atau izin manajemen proyek/workspace.
- **`POST /api/issues/{id}/transition`**:
    - Menangani perpindahan kolom/status tiket pada papan Kanban.

---

## 3. Hasil Pengujian & Kepatuhan Arsitektur

- **Pest Test Suite:** 104 passed (100% hijau). Termasuk test baru `tests/Feature/Modules/Workload/WorkspaceMultiViewTest.php`.
- **PHPStan Static Analysis:** 0 errors (Level 8 / Strict Types).
- **TypeScript Check:** `tsc --noEmit` 0 errors.
- **Vite Bundle Build:** Berhasil dikompilasi ke aset produksi.
