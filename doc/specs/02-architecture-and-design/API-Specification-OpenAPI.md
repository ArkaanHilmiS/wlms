# API Specification (OpenAPI / REST Endpoints)

## Workload & Learning Management System (WLMS)

Dokumen ini mendefinisikan spesifikasi kontrak antarmuka pemrograman aplikasi (_Application Programming Interface_ - API) untuk WLMS.

---

## 1. Konvensi Umum API

### 1.1 Base URL & Versi

- **Local Dev**: `http://localhost:8000/api`
- **Header Standar**:
    ```http
    Accept: application/json
    Content-Type: application/json
    Authorization: Bearer <sanctum_token>
    X-Requested-With: XMLHttpRequest
    ```

### 1.2 Rate Limiting

- **Batas Permintaan**: 300 request / menit per pengguna atau IP (bebas limit pada env `local` dan `testing`).
- **Response Headers**:
    - `X-RateLimit-Limit`: `300`
    - `X-RateLimit-Remaining`: Jumlah kuota sisa dalam jendela 1 menit.
    - `Retry-After`: Jumlah detik menunggu jika terkena `429 Too Many Requests`.

### 1.3 Format Respon Standar

- **Sukses (Single Resource)**:
    ```json
    {
      "data": { ... }
    }
    ```
- **Sukses (Paginated Collection)**:
    ```json
    {
      "data": [ ... ],
      "links": { "first": "...", "last": "...", "prev": null, "next": "..." },
      "meta": { "current_page": 1, "from": 1, "last_page": 5, "per_page": 15, "total": 68 }
    }
    ```
- **Error Standar (HTTP 401 / 403 / 422 / 500)**:
    ```json
    {
        "message": "Deskripsi kesalahan generik",
        "errors": {
            "field_name": ["Pesan validasi spesifik"]
        }
    }
    ```

---

## 2. Katalog Endpoint REST

### 2.1 Workspace & Members API (`/api/workspaces`)

| Metode   | URI                                 | Deskripsi                                                                            | Otorisasi           |
| -------- | ----------------------------------- | ------------------------------------------------------------------------------------ | ------------------- |
| `GET`    | `/workspaces`                       | Mengambil daftar workspace yang dapat diakses pengguna.                              | Authenticated       |
| `POST`   | `/workspaces`                       | Membuat workspace baru.                                                              | `workspaces:manage` |
| `PUT`    | `/workspaces/{id}`                  | Mengubah nama atau deskripsi workspace.                                              | Owner / Admin       |
| `DELETE` | `/workspaces/{id}`                  | Mengarsipkan (_archive_) workspace.                                                  | Owner / Superadmin  |
| `GET`    | `/workspaces/{id}/projects`         | Mengambil daftar proyek dalam workspace.                                             | Anggota Workspace   |
| `GET`    | `/workspaces/{id}/issues`           | Mengambil tiket lintas proyek (All Tasks) dengan filter & pagination (`?limit=500`). | Anggota Workspace   |
| `GET`    | `/workspaces/{id}/analytics`        | Mengambil statistik utilisasi beban kerja tim.                                       | Anggota Workspace   |
| `GET`    | `/workspaces/{id}/members`          | Mengambil daftar anggota workspace beserta peran.                                    | Anggota Workspace   |
| `POST`   | `/workspaces/{id}/members`          | Menambahkan anggota ke workspace.                                                    | Owner / Admin       |
| `DELETE` | `/workspaces/{id}/members/{userId}` | Mengeluarkan anggota dari workspace.                                                 | Owner / Admin       |

---

### 2.2 Projects, Sprints & Boards API (`/api/projects` & `/api/sprints`)

| Metode   | URI                        | Deskripsi                                                 | Otorisasi                    |
| -------- | -------------------------- | --------------------------------------------------------- | ---------------------------- |
| `POST`   | `/projects`                | Membuat proyek baru dalam workspace.                      | `projects:manage`            |
| `PUT`    | `/projects/{id}`           | Memperbarui atribut proyek (Lead, tanggal mulai-selesai). | `canViewProject` & Manage    |
| `DELETE` | `/projects/{id}`           | Mengarsipkan proyek.                                      | `canViewProject` & Manage    |
| `GET`    | `/projects/{id}/board`     | Mengambil kolom Kanban dan tiket aktif proyek.            | `canViewProject` (Anti-IDOR) |
| `GET`    | `/projects/{id}/backlog`   | Mengambil tiket backlog dan sprint aktif/pending.         | `canViewProject` (Anti-IDOR) |
| `GET`    | `/projects/{id}/activity`  | Mengambil linimasa aktivitas perubahan pada proyek.       | `canViewProject` (Anti-IDOR) |
| `GET`    | `/projects/{id}/sprints`   | Mengambil daftar sprint pada proyek.                      | `canViewProject` (Anti-IDOR) |
| `GET`    | `/projects/{id}/lookups`   | Mengambil opsi tipe, prioritas, status, dan anggota.      | `canViewProject`             |
| `GET`    | `/projects/{id}/analytics` | Mengambil metrik burndown chart dan velocity sprint.      | `canViewProject`             |
| `POST`   | `/sprints`                 | Membuat sprint baru (status default: `PENDING`).          | `sprints:manage`             |
| `PUT`    | `/sprints/{id}/start`      | Memulai sprint (`PENDING` $\to$ `ACTIVE`).                | `sprints:manage`             |
| `PUT`    | `/sprints/{id}/complete`   | Menyelesaikan sprint (`ACTIVE` $\to$ `COMPLETED`).        | `sprints:manage`             |
| `GET`    | `/sprints/{id}/workload`   | Menghitung agregat alokasi detik kerja per anggota.       | `canViewProject`             |

---

### 2.3 Issues Management API (`/api/issues`)

| Metode   | URI                            | Deskripsi                                             | Payload Kunci                                        |
| -------- | ------------------------------ | ----------------------------------------------------- | ---------------------------------------------------- |
| `GET`    | `/projects/{projectId}/issues` | Mengambil daftar tiket proyek (pagination max 500).   | `per_page=500`                                       |
| `POST`   | `/projects/{projectId}/issues` | Membuat tiket baru dalam proyek.                      | `{ title, issue_type_id, priority_id, assignee_id }` |
| `GET`    | `/issues/{id}`                 | Mengambil detail lengkap tiket beserta relasi.        | URL Param `id`                                       |
| `PUT`    | `/issues/{id}`                 | Memperbarui tiket (judul, tipe, prioritas, estimasi). | `{ title, issue_type_id, priority_id }`              |
| `DELETE` | `/issues/{id}`                 | Soft-delete tiket.                                    | URL Param `id`                                       |
| `POST`   | `/issues/{id}/assign`          | Menugaskan atau mencopot penugasan PIC tiket.         | `{ assignee_id: "userId"                             | null }` |
| `POST`   | `/issues/{id}/transition`      | Melakukan transisi status tiket sesuai workflow.      | `{ to_status_id: "statusId" }`                       |
| `GET`    | `/issues/{id}/transitions`     | Mendapatkan daftar status tujuan yang diizinkan.      | URL Param `id`                                       |
| `POST`   | `/issues/{id}/worklogs`        | Mencatat jam kerja (_log work_).                      | `{ time_spent_seconds, description, started_at }`    |
| `GET`    | `/issues/{id}/worklogs`        | Mengambil histori catatan kerja tiket.                | URL Param `id`                                       |
| `POST`   | `/issues/bulk-update`          | Memperbarui status / assignee banyak tiket sekaligus. | `{ issue_ids: [...], payload: { ... } }`             |

---

### 2.4 Collaboration API (`/api/issues/{issueId}/...`)

| Metode | URI                                      | Deskripsi                                             | Otorisasi                    |
| ------ | ---------------------------------------- | ----------------------------------------------------- | ---------------------------- |
| `GET`  | `/issues/{issueId}/timeline`             | Mengambil linimasa kronologis komentar dan aktivitas. | `canViewProject` (Anti-IDOR) |
| `POST` | `/issues/{issueId}/comments`             | Menambahkan komentar baru pada tiket.                 | `canViewProject` & Anggota   |
| `PUT`  | `/issues/{issueId}/comments/{commentId}` | Mengedit komentar milik sendiri.                      | Penulis Komentar             |

---

### 2.5 Identity & RBAC API (`/api/rbac` & `/api/org-units`)

| Metode | URI                           | Deskripsi                                                   | Otorisasi                                                |
| ------ | ----------------------------- | ----------------------------------------------------------- | -------------------------------------------------------- |
| `GET`  | `/api/rbac/roles`             | Mengambil master daftar role beserta permission.            | `manage-rbac`                                            |
| `POST` | `/api/rbac/user-roles/assign` | Memberikan peran pengguna dengan konteks spesifik.          | `manage-rbac` (`context_type: GLOBAL/WORKSPACE/PROJECT`) |
| `POST` | `/api/rbac/user-roles/revoke` | Mencabut peran pengguna pada konteks spesifik.              | `manage-rbac`                                            |
| `GET`  | `/api/org-units`              | Mengambil struktur pohon organisasi (pohon JSON hierarki).  | `manage-rbac`                                            |
| `POST` | `/api/org-units`              | Menambah unit organisasi dan mendaftarkan ke closure table. | `manage-rbac`                                            |
| `PUT`  | `/api/org-units/{id}`         | Memperbarui unit organisasi atau memindahkan subtree.       | `manage-rbac`                                            |
