# API CONTRACT: Issues Management

**Standar Dokumentasi:** OpenAPI Specification (OAS) 3.0.3
**Versi API:** v1

Berikut adalah spesifikasi teknis API untuk modul manajemen Isu/Tiket. Spesifikasi ini digunakan sebagai acuan mutlak (Contract-First) bagi _Frontend Engineer_ dan _Backend Engineer_.

```yaml
openapi: 3.0.3
info:
    title: WLMS Issues Management API
    description: Enterprise-grade API untuk manajemen kendala/tugas dalam suatu Project. Diperkuat dengan pengamanan RBAC dan anti-IDOR.
    version: 1.0.0
servers:
    - url: https://api.wlms.corporate.local/api/v1
      description: Production Server
    - url: https://staging-api.wlms.corporate.local/api/v1
      description: Staging / UAT Server

paths:
    /projects/{projectId}/issues:
        get:
            summary: Mendapatkan daftar Issues pada Project tertentu.
            description: Mengembalikan daftar issue berserta paginasi. Memerlukan hak akses pada Project.
            security:
                - BearerAuth: []
            parameters:
                - in: path
                  name: projectId
                  required: true
                  schema:
                      type: string
                      format: uuid
                  description: ID Project (UUID)
                - in: query
                  name: status
                  schema:
                      type: string
                  description: Filter berdasarkan Status (contoh; backlog, in_progress)
                - in: query
                  name: page
                  schema:
                      type: integer
                  description: Halaman paginasi
            responses:
                '200':
                    description: OK
                    content:
                        application/json:
                            schema:
                                $ref: '#/components/schemas/IssueListResponse'
                '403':
                    description: Forbidden (Terdeteksi IDOR / Akses Ditolak)

        post:
            summary: Membuat Issue baru.
            description: Membuat record issue baru di dalam spesifik project.
            security:
                - BearerAuth: []
            parameters:
                - in: path
                  name: projectId
                  required: true
                  schema:
                      type: string
                      format: uuid
                  description: ID Project
            requestBody:
                required: true
                content:
                    application/json:
                        schema:
                            $ref: '#/components/schemas/CreateIssueRequest'
            responses:
                '201':
                    description: Created
                    content:
                        application/json:
                            schema:
                                $ref: '#/components/schemas/IssueResponse'
                '403':
                    description: Forbidden (IDOR Prevention)
                '422':
                    description: Unprocessable Entity (Validasi Gagal)

    /issues/{issueId}:
        patch:
            summary: Mengubah data / status Issue.
            description: Partial update data issue.
            security:
                - BearerAuth: []
            parameters:
                - in: path
                  name: issueId
                  required: true
                  schema:
                      type: string
                      format: uuid
            requestBody:
                required: true
                content:
                    application/json:
                        schema:
                            $ref: '#/components/schemas/UpdateIssueRequest'
            responses:
                '200':
                    description: Updated successfully
                    content:
                        application/json:
                            schema:
                                $ref: '#/components/schemas/IssueResponse'
                '403':
                    description: Forbidden

    /issues/{issueId}/comments:
        get:
            summary: Mendapatkan daftar komentar pada Issue tertentu.
            description: Mengembalikan daftar komentar berserta pembuatnya.
            security:
                - BearerAuth: []
            parameters:
                - in: path
                  name: issueId
                  required: true
                  schema:
                      type: string
                      format: uuid
            responses:
                '200':
                    description: OK
                    content:
                        application/json:
                            schema:
                                $ref: '#/components/schemas/CommentListResponse'
                '403':
                    description: Forbidden

        post:
            summary: Menambahkan komentar pada Issue.
            description: Membuat record komentar baru pada sebuah issue.
            security:
                - BearerAuth: []
            parameters:
                - in: path
                  name: issueId
                  required: true
                  schema:
                      type: string
                      format: uuid
            requestBody:
                required: true
                content:
                    application/json:
                        schema:
                            $ref: '#/components/schemas/CreateCommentRequest'
            responses:
                '201':
                    description: Created
                    content:
                        application/json:
                            schema:
                                $ref: '#/components/schemas/CommentResponse'
                '403':
                    description: Forbidden
                '422':
                    description: Unprocessable Entity

components:
    securitySchemes:
        BearerAuth:
            type: http
            scheme: bearer
            bearerFormat: JWT

    schemas:
        IssueResponse:
            type: object
            properties:
                data:
                    type: object
                    properties:
                        id:
                            type: string
                            format: uuid
                        title:
                            type: string
                            maxLength: 255
                        description:
                            type: string
                        status:
                            type: string
                            enum: [backlog, todo, in_progress, in_review, done]
                        assignee:
                            type: object
                            properties:
                                id:
                                    type: string
                                    format: uuid
                                name:
                                    type: string
                        created_at:
                            type: string
                            format: date-time

        IssueListResponse:
            type: object
            properties:
                data:
                    type: array
                    items:
                        $ref: '#/components/schemas/IssueResponse/properties/data'
                meta:
                    type: object
                    properties:
                        current_page:
                            type: integer
                        last_page:
                            type: integer
                        total:
                            type: integer

        CreateIssueRequest:
            type: object
            required:
                - title
            properties:
                title:
                    type: string
                    maxLength: 255
                    description: Judul isu/tiket.
                description:
                    type: string
                    description: Deskripsi lengkap.
                assignee_id:
                    type: string
                    format: uuid
                    description: Target penugasan (opsional).

        UpdateIssueRequest:
            type: object
            properties:
                title:
                    type: string
                    maxLength: 255
                description:
                    type: string
                status:
                    type: string
                    enum: [backlog, todo, in_progress, in_review, done]
                assignee_id:
                    type: string
                    format: uuid

        CommentResponse:
            type: object
            properties:
                data:
                    type: object
                    properties:
                        id:
                            type: string
                            format: uuid
                        content:
                            type: string
                        author:
                            type: object
                            properties:
                                id:
                                    type: string
                                    format: uuid
                                name:
                                    type: string
                        created_at:
                            type: string
                            format: date-time

        CommentListResponse:
            type: object
            properties:
                data:
                    type: array
                    items:
                        $ref: '#/components/schemas/CommentResponse/properties/data'

        CreateCommentRequest:
            type: object
            required:
                - content
            properties:
                content:
                    type: string
                    description: Isi komentar.
```
