# WLMS Design System & UI Kit Blueprint

**Version:** 1.1.0 (Enterprise + Radix UI Edition)
**Target Audience:** Frontend Developers, UI/UX Agents
**Stack:** React, Tailwind CSS v4, Radix UI Primitives, Shadcn UI
**Domain:** Enterprise Workload Management System (WLMS) - Banking Sector

---

## 1. Arsitektur Komponen & Radix UI Primitives

Pengembangan antarmuka WLMS WAJIB mematuhi arsitektur _Headless UI_ berbasis **Radix UI**. Shadcn UI yang kita gunakan hanyalah lapisan _styling_ (Tailwind) di atas fungsionalitas Radix. Pemahaman tentang cara kerja Radix mutlak diperlukan untuk menjaga Aksesibilitas (a11y) tingkat perbankan.

### Prinsip Utama Radix UI yang Wajib Diterapkan:

1. **WAI-ARIA Compliance Out-of-the-Box:** Jangan pernah membuat custom komponen (seperti custom modal atau custom dropdown) dari tag `<div>` murni. Selalu gunakan _primitives_ dari Radix agar navigasi _keyboard_ (Tab, Arrow keys, Esc) dan dukungan _Screen Reader_ (VoiceOver/NVDA) berjalan sempurna.
2. **Compound Components (Lego Mode):** Komponen harus dirakit dari bagian-bagian kecil.
    - ✅ **Benar:** `<Dialog><DialogTrigger /><DialogContent><DialogHeader />...</DialogContent></Dialog>`
    - ❌ **Salah:** `<CustomDialog isOpen={true} title="Hello" />` (Pendekatan "God Component" dilarang).
3. **Konsep `asChild`:** Radix menggunakan prop `asChild` untuk meneruskan fungsionalitas ke elemen anak tanpa membuat elemen DOM ekstra.
    - WAJIB menggunakan `asChild` pada `Trigger` jika memuat komponen React kustom.
    - Contoh: `<DialogTrigger asChild><Button>Klik</Button></DialogTrigger>` (Radix akan otomatis menggabungkan props _aria_ ke dalam _Button_ tanpa membungkusnya dengan `<span>` ganda).
4. **Portals untuk Overlay:** Semua komponen yang melayang (_Dialog, AlertDialog, DropdownMenu, Tooltip, Popover_) otomatis menggunakan `<Portal>`. Ini memastikan elemen dirender di akhir `<body>` untuk mencegah isu _z-index_ dan _overflow: hidden_ dari kontainer induk.
5. **Focus Management:** Saat Modal/Dialog terbuka, fokus _keyboard_ WAJIB terkunci di dalam modal (_Focus Trap_). Radix menangani ini otomatis, jangan merusak fungsionalitas ini dengan atribut `tabIndex` manual yang sembarangan.

---

## 2. Standar Komponen Inti (UI Specifications)

### A. Dialog vs AlertDialog

Sistem perbankan sangat sensitif terhadap _human error_. Pemilihan jenis modal sangat krusial.

- **`AlertDialog` (Strict Mode):**
    - **Kegunaan:** Aksi destruktif (Hapus data permanen, _Revoke Access_, _Reset Password_).
    - **Perilaku Radix:** Pengguna **TIDAK BISA** menutup modal ini dengan mengklik area luar (_overlay_) atau menekan tombol `Esc`. Mereka dipaksa untuk secara sadar mengklik tombol aksi atau tombol pembatalan.
    - **Styling:** _Backdrop_ harus gelap (`bg-black/80 backdrop-blur-sm`). Tombol aksi wajib `variant="destructive"`.
- **`Dialog` (Form Mode):**
    - **Kegunaan:** Form input, pengisian data, detail view.
    - **Perilaku Radix:** Bisa ditutup dengan klik luar atau `Esc`. Terdapat ikon silang (`X`) bawaan di sudut kanan atas (`DialogClose`).

### B. Dropdown Menu & Select

- **`Select`:** Digunakan secara ketat untuk form input yang membutuhkan nilai. Radix Select memastikan nilai terhubung dengan _form state_ (seperti React Hook Form) dan terstruktur secara aksesibilitas sebagai elemen `<select>`.
- **`DropdownMenu`:** Digunakan HANYA untuk aksi/navigasi (seperti titik tiga `...` pada tabel _Actions_). Dilarang menggunakannya sebagai form input.

### C. Data Tables (The Enterprise Standard)

Tabel adalah komponen sentral di sistem perbankan.

- **Header:** Gunakan `text-muted-foreground text-xs uppercase tracking-wider`.
- **Alignment:**
    - Teks (Nama, Email) rata kiri.
    - Angka (Nominal, Saldo, Jumlah) WAJIB rata kanan (`text-right`) agar mudah dikomparasi secara visual.
    - _Actions_ (Tombol) diletakkan rata kanan di ujung tabel.
- **Empty State:** WAJIB ada ilustrasi ikon SVG dengan deskripsi `text-muted-foreground` di dalam `TableCell colSpan={x} text-center p-12`.

### D. Formulir (Forms) & Validasi

- Selalu bungkus input di dalam `Label` Radix untuk dukungan _Screen Reader_.
- Status _Loading_: Tombol Submit WAJIB memiliki status `disabled={isSubmitting}` dan menyertakan indikator `animate-spin` dari _Lucide Icons_ di dalam tombol.

---

## 3. Sistem Warna & Tipografi (Semantic Tailwind)

### A. Tipografi (Font & Skala)

Gunakan `font-sans` (Inter/Sistem Default).

- **H2 (Page Title):** `text-2xl font-bold tracking-tight text-foreground`
- **H3 (Card/Section Title):** `text-lg font-semibold tracking-tight text-foreground`
- **Data Utama:** `text-sm font-medium`
- **Data Sekunder/Bantuan:** `text-sm text-muted-foreground`

### B. Sistem Warna OKLCH (Light & Dark Mode)

Warna didefinisikan di CSS agar transisi _dark mode_ terjadi mulus di level _browser paint_. DILARANG keras _hardcode_ warna seperti `bg-gray-100` atau `text-slate-800`.

- **Background Hierarki:**
    - Lapisan 0 (Kanvas Utama): `bg-background`
    - Lapisan 1 (Kartu / Panel): `bg-card` (Di dark mode, memiliki nilai lightness sedikit lebih tinggi dari background).
    - Lapisan 2 (Hover / Subtle): `bg-muted`
- **Aksi:**
    - Tombol Utama: `bg-primary text-primary-foreground`
    - Peringatan / Hapus: `bg-destructive text-destructive-foreground`
    - Elemen non-kritis (Tepi / Pemisah): `border-border`

---

## 4. Layout & Spacing (White Space Control)

- **Gap Utama:** Gunakan `gap-6` atau `gap-8` (24px - 32px) untuk jarak antar komponen besar (seperti antar Card).
- **Padding Internal:** `p-6` untuk konten Card. `p-4` untuk komponen lebih kecil.
- **Responsive Breakpoints:**
    - Gunakan prinsip _mobile-first_.
    - Jika elemen horizontal (_flex-row_) mulai sesak di layar kecil, jadikan `flex-col sm:flex-row`.
    - Elemen navigasi samping (Sidebar) pada layar `md` ke bawah harus menjadi deretan menu _horizontal scroll_ (`overflow-x-auto whitespace-nowrap`) untuk menjaga _viewport_ vertikal pengguna tetap optimal.
