# API CONTRACT & OPENAPI SPECIFICATION

## MODUL WORKFLOW & STATE MACHINE

Dokumen ini memuat spesifikasi teknis dan Contract Interface API untuk manajemen **Statuses & Workflows** dalam ekosistem WLMS. Struktur API didesain dengan format spesifikasi OpenAPI 3.0 standar Enterprise (Secure, Restful, dan JSON-first).

### OpenAPI Specification (YAML)

```yaml
openapi: 3.0.3
info:
    title: WLMS - Workflow & State Machine API
    description: API Endpoint untuk konfigurasi dinamis State Machine, Status Entitas, dan aturan Workflow dalam sistem enterprise WLMS. Mendukung proteksi anti-IDOR dan validasi akses role-based.
    version: 1.0.0
    contact:
        name: Backend Architecture Team
        email: dev@wlms.local

servers:
    - url: https://api.wlms.local/v1
      description: Development / Staging Server
    - url: https://api.wlms.co.id/v1
      description: Production Server

tags:
    - name: Statuses
      description: Operasi CRUD untuk entitas Status
    - name: Workflows
      description: Operasi konfigurasi jalur transisi State Machine (Workflows)

components:
    securitySchemes:
        bearerAuth:
            type: http
            scheme: bearer
            bearerFormat: JWT

    schemas:
        Status:
            type: object
            properties:
                id:
                    type: string
                    format: uuid
                    example: '550e8400-e29b-41d4-a716-446655440000'
                name:
                    type: string
                    example: 'Pending Approval'
                slug:
                    type: string
                    example: 'pending_approval'
                color_code:
                    type: string
                    example: '#FF9900'
                created_at:
                    type: string
                    format: date-time
                updated_at:
                    type: string
                    format: date-time

        Workflow:
            type: object
            properties:
                id:
                    type: string
                    format: uuid
                name:
                    type: string
                    example: 'Draft to Pending'
                from_status_id:
                    type: string
                    format: uuid
                to_status_id:
                    type: string
                    format: uuid
                created_at:
                    type: string
                    format: date-time

paths:
    /statuses:
        get:
            summary: Dapatkan Semua Status (Master Data)
            tags: [Statuses]
            security:
                - bearerAuth: []
            responses:
                '200':
                    description: Berhasil memuat daftar Status
                    content:
                        application/json:
                            schema:
                                type: array
                                items:
                                    $ref: '#/components/schemas/Status'
                '401':
                    description: Unauthorized

        post:
            summary: Buat Status Baru
            tags: [Statuses]
            security:
                - bearerAuth: []
            requestBody:
                required: true
                content:
                    application/json:
                        schema:
                            type: object
                            required: [name, color_code]
                            properties:
                                name:
                                    type: string
                                    example: 'Approved'
                                color_code:
                                    type: string
                                    example: '#00FF00'
            responses:
                '201':
                    description: Status berhasil dibuat
                    content:
                        application/json:
                            schema:
                                $ref: '#/components/schemas/Status'
                '403':
                    description: Forbidden - Privilege khusus Superadmin / Admin Cabang
                '422':
                    description: Validasi input gagal

    /statuses/{id}:
        put:
            summary: Perbarui Data Status (Anti-IDOR Protected)
            tags: [Statuses]
            security:
                - bearerAuth: []
            parameters:
                - in: path
                  name: id
                  required: true
                  schema:
                      type: string
                      format: uuid
            requestBody:
                required: true
                content:
                    application/json:
                        schema:
                            type: object
                            properties:
                                name:
                                    type: string
                                color_code:
                                    type: string
            responses:
                '200':
                    description: Berhasil diperbarui
                '403':
                    description: Forbidden (IDOR Attempt)
                '404':
                    description: Status tidak ditemukan (Zero Data Leak)

        delete:
            summary: Hapus Status (Constrained / Soft Delete)
            tags: [Statuses]
            security:
                - bearerAuth: []
            parameters:
                - in: path
                  name: id
                  required: true
                  schema:
                      type: string
                      format: uuid
            responses:
                '204':
                    description: Berhasil dihapus (No Content)
                '409':
                    description: Conflict / Constrain Violation - Status sedang digunakan oleh record lain

    /workflows:
        get:
            summary: Dapatkan Aturan Workflow (Jalur State Machine)
            tags: [Workflows]
            security:
                - bearerAuth: []
            responses:
                '200':
                    description: Daftar ruleset Workflow

        post:
            summary: Daftarkan Jalur Transisi Status Baru
            tags: [Workflows]
            security:
                - bearerAuth: []
            requestBody:
                required: true
                content:
                    application/json:
                        schema:
                            type: object
                            required: [name, from_status_id, to_status_id]
                            properties:
                                name:
                                    type: string
                                    example: 'Review Process'
                                from_status_id:
                                    type: string
                                    format: uuid
                                to_status_id:
                                    type: string
                                    format: uuid
            responses:
                '201':
                    description: Relasi antar Status berhasil didaftarkan.
                '422':
                    description: Invalid request (Status referensi tidak valid atau duplikat).

    /workflows/{id}:
        delete:
            summary: Hapus Aturan Workflow (Putus Jalur)
            tags: [Workflows]
            security:
                - bearerAuth: []
            parameters:
                - in: path
                  name: id
                  required: true
                  schema:
                      type: string
                      format: uuid
            responses:
                '204':
                    description: Berhasil menghapus relasi workflow.
```
