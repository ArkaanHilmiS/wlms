# API Contract: Notifications

## 1. Get User Notifications

Mengambil daftar notifikasi milik pengguna yang sedang login.

**Endpoint**: `GET /api/notifications`  
**Auth**: Bearer Token / Sanctum Cookie

### Response (200 OK)

```json
{
    "data": [
        {
            "id": "9a3e6f9b-1234-4a2e-b6a9-8e2b1c4d5f6a",
            "type": "issue.assigned",
            "data": {
                "issue_number": 102
            },
            "read_at": null,
            "created_at": "2026-09-21T10:00:00Z"
        }
    ],
    "meta": {
        "current_page": 1,
        "last_page": 1,
        "per_page": 20,
        "total": 1
    },
    "unread_count": 1
}
```

## 2. Mark All as Read

Menandai semua notifikasi milik pengguna yang belum dibaca menjadi sudah dibaca.

**Endpoint**: `PUT /api/notifications/read`  
**Auth**: Bearer Token / Sanctum Cookie

### Response (200 OK)

```json
{
    "message": "Notifications marked as read.",
    "affected": 1
}
```

## 3. WebSocket Channel

**Broadcaster**: Laravel Reverb  
**Channel Name**: `private-user.{userId}`  
**Event Name**: `NewNotification`

### Event Payload

```json
{
    "id": "9a3e6f9b-...",
    "type": "comment.added",
    "data": {
        "body_preview": "I fixed this issue..."
    },
    "created_at": "2026-09-21T10:05:00Z"
}
```
