# API Contract: Log Work for Issue

## **Log Work**

Mencatat waktu pengerjaan (worklog) untuk sebuah issue.

**URL**: `/api/issues/{id}/worklogs`  
**Method**: `POST`  
**Auth**: Bearer Token (Sanctum)

### **Request**

**Path Parameter:**

- `id` (integer) - ID Issue

**Body (JSON):**

```json
{
    "time_spent_seconds": 3600,
    "description": "Mengerjakan fitur login dan setup database",
    "started_at": "2023-10-25T08:00:00Z"
}
```

**Aturan Validasi:**

- `time_spent_seconds`: `required`, `integer`, `min:1`
- `description`: `required`, `string`
- `started_at`: `required`, `date`

### **Response**

**Success (201 Created)**

```json
{
    "message": "Work logged successfully"
}
```

**Error (404 Not Found)**
Jika Issue ID tidak valid atau tidak ditemukan (akan dilempar dari repository).

**Error (422 Unprocessable Entity)**
Jika validasi payload gagal.

**Error (401 Unauthorized)**
Jika belum login.
