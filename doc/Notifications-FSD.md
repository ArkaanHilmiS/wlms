# Functional Specification Document: In-App Notifications

## 1. Overview

Fitur notifikasi in-app memungkinkan pengguna (Workspace Members) untuk menerima pembaruan secara real-time terkait aktivitas dalam Workspace mereka tanpa perlu melakukan refresh halaman.

## 2. Fitur Utama

1. **Real-time Push**: Menggunakan Laravel Reverb (WebSocket) untuk mendorong event notifikasi ke pengguna secara spesifik (private channel).
2. **Notification Bell UI**: Komponen ikon lonceng pada navbar (sudut kanan atas) dengan indikator angka untuk notifikasi yang belum dibaca.
3. **Notification List**: Popover dropdown yang menampilkan daftar riwayat notifikasi beserta ikon khusus berdasarkan jenis event dan waktu relatif (misal: "2 mins ago").
4. **Mark as Read**: Pengguna dapat menandai semua notifikasi sebagai telah dibaca. Saat popover dibuka dan terdapat notifikasi yang belum dibaca, sistem akan secara otomatis menandai semuanya sebagai "read".

## 3. Triggers / Events

Sistem akan memicu notifikasi ketika:

- `issue.assigned`: Saat sebuah issue di-assign ke pengguna (kecuali jika meng-assign diri sendiri).
- `comment.added`: Saat sebuah komentar ditambahkan ke issue (notifikasi dikirim ke reporter & assignee issue).
- `issue.transitioned`: Saat status issue diubah (notifikasi dikirim ke reporter & assignee).
- `sprint.state_changed`: Saat Sprint dimulai (ACTIVE) atau diselesaikan (COMPLETED), notifikasi dikirim ke seluruh member workspace.

## 4. Arsitektur Teknis

- **Backend**: Laravel 11/12 dengan Modular Architecture (Modul `Notification`).
- **Database**: Tabel `notifications` dengan UUID, dan JSON data payload.
- **WebSocket**: Laravel Reverb.
- **Frontend**: React (Inertia.js), Laravel Echo, Pusher-JS, React Query (TanStack Query), Shadcn UI, Sonner (untuk Toasts).

## 5. Keamanan (Anti-IDOR)

Endpoint API untuk mengambil atau memperbarui notifikasi hanya membaca dari `auth()->id()`. Pengguna tidak dapat membaca notifikasi milik pengguna lain. Saluran WebSocket dikunci menggunakan Laravel Sanctum guard pada channel `private-user.{userId}`.
