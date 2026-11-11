# API Contract

## Module: Issues/Tasks Management (Sprint 7)

OpenAPI 3.0 Specification.

```yaml
openapi: 3.0.3
info:
    title: WLMS Issues API
    version: 1.0.0
    description: API untuk manajemen tugas, Kanban Board, dan transisi status (Workflow Engine).
servers:
    - url: https://api.wlms.internal/v1

paths:
    /api/issues:
        post:
            summary: Membuat issue baru
            requestBody:
                required: true
                content:
                    application/json:
                        schema:
                            type: object
                            properties:
                                projectId:
                                    type: string
                                    format: uuid
                                title:
                                    type: string
                                description:
                                    type: string
                                issueTypeId:
                                    type: string
                                    format: uuid
            responses:
                '201':
                    description: Issue berhasil dibuat (beserta auto-numbering IssueKey)
                '400':
                    description: Bad Request (Validasi gagal)

    /api/issues/{id}/assign:
        post:
            summary: Menetapkan assignee ke issue
            parameters:
                - name: id
                  in: path
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
                                assigneeId:
                                    type: string
                                    format: uuid
            responses:
                '200':
                    description: Assignee berhasil diperbarui

    /api/issues/{id}/transitions:
        post:
            summary: Memindahkan status issue berdasarkan Workflow
            parameters:
                - name: id
                  in: path
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
                                targetStatusId:
                                    type: string
                                    format: uuid
            responses:
                '200':
                    description: Transisi berhasil
                '409':
                    description: Conflict (Transisi tidak diizinkan oleh WorkflowEngine)

    /api/projects/{id}/board:
        get:
            summary: Mengambil data Kanban Board untuk proyek
            parameters:
                - name: id
                  in: path
                  required: true
                  schema:
                      type: string
                      format: uuid
            responses:
                '200':
                    description: Data kolom dan issue dalam format yang siap digunakan oleh dnd-kit

    /api/projects/{id}/backlog:
        get:
            summary: Mengambil data Backlog yang belum masuk ke sprint/board
            parameters:
                - name: id
                  in: path
                  required: true
                  schema:
                      type: string
                      format: uuid
            responses:
                '200':
                    description: Daftar issue pada backlog
```
