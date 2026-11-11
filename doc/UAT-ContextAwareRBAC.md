# User Acceptance Testing (UAT)

## Context-Aware RBAC

| Test Case ID | Skenario Pengujian                                                                        | Ekspektasi Hasil                                    | Status |
| ------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------- | ------ |
| UAT-RBAC-01  | User biasa mencoba membuat project di workspace di mana ia tidak terdaftar                | Akses ditolak (HTTP 403)                            | PASSED |
| UAT-RBAC-02  | User biasa mencoba menarik daftar project di workspace di mana ia tidak terdaftar         | Akses ditolak (HTTP 403)                            | PASSED |
| UAT-RBAC-03  | Member Workspace menarik daftar project, namun tidak pernah ditugaskan ke project manapun | Mengembalikan array kosong `[]` (HTTP 200)          | PASSED |
| UAT-RBAC-04  | Member Workspace menarik daftar project, dan ia adalah Project Lead di project X          | Mengembalikan array yang HANYA berisi project X     | PASSED |
| UAT-RBAC-05  | Member Workspace ditambahkan ke `user_roles` untuk project Y                              | Mengembalikan array yang berisi project Y           | PASSED |
| UAT-RBAC-06  | Superadmin menarik daftar project di sembarang workspace                                  | Mengembalikan seluruh project di workspace tersebut | PASSED |

**Disetujui Oleh:**  
[ ] Product Owner  
[ ] VP of Engineering
