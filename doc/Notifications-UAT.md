# User Acceptance Testing (UAT): In-App Notifications

## Skenario 1: WebSocket Connection & Badge Unread Count

1. **Langkah**: Login ke aplikasi sebagai User A. Buka tab browser lain dan login sebagai User B.
2. **Tindakan**: User B meng-assign sebuah issue ke User A.
3. **Ekspektasi (User A)**:
    - Muncul Toast pop-up di layar User A: "You were assigned to issue #..." secara seketika (real-time).
    - Ikon Notification Bell (lonceng) di ujung kanan atas menunjukkan angka badge `1` (atau bertambah 1).
4. **Status**: [ ] PASS / [ ] FAIL

## Skenario 2: Melihat Daftar Notifikasi

1. **Langkah**: Klik ikon Notification Bell.
2. **Ekspektasi**:
    - Dropdown (popover) terbuka menampilkan daftar riwayat notifikasi.
    - Notifikasi terbaru berada di posisi teratas.
    - Angka badge merah menghilang setelah popover terbuka (karena secara otomatis men-trigger "mark as read").
    - Ikon titik biru di sebelah notifikasi akan menghilang setelah refresh halaman (tanda sudah dibaca).
3. **Status**: [ ] PASS / [ ] FAIL

## Skenario 3: Notifikasi Sesuai Type (Event)

1. **Langkah**: Lakukan simulasi event berikut:
    - Tambahkan komentar pada issue yang di-assign ke Anda (oleh user lain).
    - Selesaikan sebuah Sprint di BacklogManager.
2. **Ekspektasi**:
    - Muncul toast untuk komentar baru dengan preview teks.
    - Muncul toast "Sprint ... is now COMPLETED" untuk event penyelesaian sprint.
    - Semua event masuk ke dalam daftar riwayat notifikasi Bell dengan ikon yang berbeda-beda.
3. **Status**: [ ] PASS / [ ] FAIL

## Skenario 4: Keamanan Data (Anti-IDOR)

1. **Langkah**: User A memiliki 5 notifikasi. Login sebagai User B.
2. **Ekspektasi**:
    - User B membuka Notification Bell, daftar notifikasi kosong (atau hanya menampilkan notifikasi milik User B saja).
    - Ikon Bell User B tidak menampilkan unread count dari User A.
3. **Status**: [ ] PASS / [ ] FAIL
