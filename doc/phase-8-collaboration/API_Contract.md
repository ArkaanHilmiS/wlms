# API Contract - Collaboration Module

## 1. Get Issue Timeline

Memuat daftar komentar dan riwayat audit dari suatu Issue, diurutkan berdasarkan tanggal tertua ke terbaru.

**Request:**

- `GET /api/issues/{issueId}/timeline`
- Headers: `Authorization: Bearer {token}`

**Response (200 OK):**

```json
{
    "data": [
        {
            "type": "audit_log",
            "id": "uuid",
            "actorId": "uuid",
            "createdAt": "2026-09-14T10:00:00+07:00",
            "payload": {
                "event": "created",
                "old_values": null,
                "new_values": { "title": "Setup Server" }
            }
        },
        {
            "type": "comment",
            "id": "uuid",
            "actorId": "uuid",
            "createdAt": "2026-09-14T10:05:00+07:00",
            "payload": {
                "body": "Can someone assign this to me?",
                "is_edited": false,
                "parent_id": null
            }
        }
    ]
}
```

## 2. Add Comment

Menambahkan komentar baru ke Issue.

**Request:**

- `POST /api/issues/{issueId}/comments`
- Body:

```json
{
    "body": "My comment here",
    "parent_id": "optional-uuid-for-reply"
}
```

**Response (201 Created):**

```json
{
    "message": "Comment added successfully.",
    "data": {
        "id": "uuid",
        "issue_id": "uuid",
        "author_id": "uuid",
        "parent_id": null,
        "body": "My comment here",
        "is_edited": false,
        "created_at": "...",
        "updated_at": "..."
    }
}
```

## 3. Edit Comment

Mengubah body dari sebuah komentar. Anti-IDOR enforced.

**Request:**

- `PUT /api/issues/{issueId}/comments/{commentId}`
- Body:

```json
{
    "body": "Edited comment"
}
```

**Response (200 OK):**

- Identik dengan struktur data Add Comment, dengan `is_edited: true`.
