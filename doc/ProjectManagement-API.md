# API CONTRACT

**Modul:** Project Management (Manajemen Proyek)  
**Versi API:** v1.0  
**Format:** OpenAPI 3.0

```yaml
openapi: 3.0.3
info:
    title: Project Management API
    description: API spesifikasi untuk modul Manajemen Proyek (Create, Read, Update, Archive/Delete). Dilengkapi dengan perlindungan RBAC dan Anti-IDOR.
    version: 1.0.0
servers:
    - url: https://api.wlms.internal/v1
      description: Internal Production Server
paths:
    /projects:
        get:
            summary: Mendapatkan daftar proyek
            description: Mengembalikan daftar proyek sesuai otorisasi pengguna. Superadmin melihat semua, User melihat proyeknya sendiri.
            security:
                - bearerAuth: []
            responses:
                '200':
                    description: Berhasil mendapatkan daftar proyek
                    content:
                        application/json:
                            schema:
                                type: array
                                items:
                                    $ref: '#/components/schemas/Project'
                '401':
                    description: Tidak terotorisasi (Token tidak valid)
        post:
            summary: Membuat proyek baru
            description: Membuat proyek baru. Hanya Superadmin atau peran yang diizinkan yang dapat melakukan ini.
            security:
                - bearerAuth: []
            requestBody:
                required: true
                content:
                    application/json:
                        schema:
                            $ref: '#/components/schemas/ProjectCreate'
            responses:
                '201':
                    description: Proyek berhasil dibuat
                '400':
                    description: Permintaan tidak valid (Validasi gagal)
                '403':
                    description: Dilarang (Akses ditolak)

    /projects/{id}:
        get:
            summary: Mendapatkan detail proyek
            description: Mengambil data satu proyek. Dilindungi oleh Anti-IDOR.
            parameters:
                - in: path
                  name: id
                  required: true
                  schema:
                      type: integer
                  description: ID dari Proyek
            security:
                - bearerAuth: []
            responses:
                '200':
                    description: Detail proyek ditemukan
                    content:
                        application/json:
                            schema:
                                $ref: '#/components/schemas/Project'
                '403':
                    description: Dilarang (Akses ditolak karena IDOR)
                '404':
                    description: Proyek tidak ditemukan
        put:
            summary: Memperbarui proyek
            description: Memperbarui informasi proyek. Dilindungi oleh Anti-IDOR.
            parameters:
                - in: path
                  name: id
                  required: true
                  schema:
                      type: integer
            security:
                - bearerAuth: []
            requestBody:
                required: true
                content:
                    application/json:
                        schema:
                            $ref: '#/components/schemas/ProjectCreate'
            responses:
                '200':
                    description: Proyek berhasil diperbarui
                '403':
                    description: Dilarang (Akses ditolak karena IDOR)
                '404':
                    description: Proyek tidak ditemukan
        delete:
            summary: Mengarsipkan / Menghapus proyek
            description: Mengarsipkan atau menghapus proyek secara logis. Khusus Superadmin.
            parameters:
                - in: path
                  name: id
                  required: true
                  schema:
                      type: integer
            security:
                - bearerAuth: []
            responses:
                '204':
                    description: Proyek berhasil dihapus/diarsipkan
                '403':
                    description: Dilarang (Akses ditolak)

components:
    schemas:
        Project:
            type: object
            properties:
                id:
                    type: integer
                    example: 101
                name:
                    type: string
                    example: 'Migrasi Sistem Core Banking'
                description:
                    type: string
                    example: 'Proyek pembaruan sistem inti ke arsitektur microservices.'
                status:
                    type: string
                    example: 'Active'
                owner_id:
                    type: integer
                    example: 42
                created_at:
                    type: string
                    format: date-time
        ProjectCreate:
            type: object
            required:
                - name
                - status
            properties:
                name:
                    type: string
                    example: 'Migrasi Sistem Core Banking'
                description:
                    type: string
                status:
                    type: string
                    example: 'Active'
    securitySchemes:
        bearerAuth:
            type: http
            scheme: bearer
            bearerFormat: JWT
```
