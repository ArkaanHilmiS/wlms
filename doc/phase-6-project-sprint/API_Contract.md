# API Contract Specification

## WLMS - Project & Sprint Module

**Version:** 1.0.0
**Base URL:** `https://api.wlms.internal/v1`
**Authentication:** Bearer Token (JWT)

---

### 1. Projects API

#### 1.1 Create Project

Membuat inisiatif _Project_ baru.

- **Endpoint:** `POST /projects`
- **Headers:**
    - `Authorization`: `Bearer <token>`
    - `Content-Type`: `application/json`

**Request Body:**

```json
{
    "projectCode": "WLMS2026",
    "projectName": "Workload Management System Revamp",
    "description": "Enterprise grade workload system.",
    "startDate": "2026-09-15",
    "endDate": "2027-03-15"
}
```

**Responses:**

- **201 Created**
    ```json
    {
        "meta": { "code": 201, "message": "Project created successfully" },
        "data": {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "projectCode": "WLMS2026",
            "status": "PLANNED",
            "createdAt": "2026-09-14T10:00:00Z"
        }
    }
    ```
- **422 Unprocessable Entity** (Bila `projectCode` sudah eksis atau invalid timeframe)

#### 1.2 Get Project Detail

Mengambil data detail berdasarkan ID.

- **Endpoint:** `GET /projects/{id}`
- **Path Parameter:**
    - `id`: UUID dari _Project_

---

### 2. Sprints API

#### 2.1 Create Sprint

Mendaftarkan iterasi kerja dalam sebuah _Project_.

- **Endpoint:** `POST /projects/{projectId}/sprints`
- **Path Parameter:**
    - `projectId`: UUID rujukan ke _Project_

**Request Body:**

```json
{
    "sprintName": "Sprint 1 - Foundation",
    "goal": "Setup repository and CI/CD pipelines",
    "startDate": "2026-09-16",
    "endDate": "2026-09-30"
}
```

**Responses:**

- **201 Created**
    ```json
    {
        "meta": { "code": 201, "message": "Sprint created successfully" },
        "data": {
            "id": "660e8400-e29b-41d4-a716-446655441111",
            "projectId": "550e8400-e29b-41d4-a716-446655440000",
            "sprintName": "Sprint 1 - Foundation",
            "status": "DRAFT"
        }
    }
    ```
- **400 Bad Request** (Bila rentang waktu `StartDate` dan `EndDate` berada di luar rentang waktu _Project_)
- **404 Not Found** (Bila `projectId` tidak valid)

#### 2.2 Update Sprint Status

Transisi state pada siklus hidup _Sprint_.

- **Endpoint:** `PATCH /sprints/{id}/status`
- **Request Body:**
    ```json
    {
        "status": "ACTIVE"
    }
    ```
