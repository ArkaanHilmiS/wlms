# Functional Specification Document (FSD)

## Modul Collaboration (Global Audit Trail & Comments)

### 1. Tujuan

Memastikan tersedianya fitur _black-box_ Audit Trail untuk mencatat semua perubahan di dalam WLMS, memenuhi standar compliance BUMN, serta menyediakan fitur komentar threaded (diskusi) pada Issue.

### 2. Fitur Utama

1. **Global Audit Trail:** Mencatat aksi `created`, `transitioned`, `assigned`, dll. secara asinkron dari _domain event_. Table bersifat _append-only_.
2. **Issue Comments:** Menambahkan, mengedit, dan memuat komentar terkait suatu tiket/issue dengan dukungan nested/threaded (via `parent_id`).
3. **Issue Timeline View:** Integrasi _Audit Logs_ dan _Comments_ dalam satu stream _feed_ untuk melihat riwayat perjalanan tiket (Issue).

### 3. Arsitektur Clean Architecture

- **Domain Layer:** `Comment`, `AuditLog` (Entities). `CommentId`, `CommentBody`, `TargetEntity` (VOs).
- **Application Layer:** Use Cases (AddComment, EditComment, LogAudit). CQRS Read (GetIssueTimelineQuery).
- **Infrastructure Layer:** `WorkloadEventSubscriber` yang mendengarkan event dari Workload modul (loose coupling), `CommentModel`, `AuditLogModel`.
- **Presentation Layer:** REST API + React UI (React Query `useIssueTimeline`).

### 4. Zero Data Breach Compliance

- Anti-IDOR pada `EditCommentUseCase`: hanya `authorId` yang sama dengan original comment yang diizinkan untuk mengedit.
- Audit Log menggunakan Immutable Data (append only, no update, no delete).
