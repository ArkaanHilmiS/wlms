# Activity Diagrams (Workload & Identity Core Processes)

## Workload & Learning Management System (WLMS)

Dokumen ini mendefinisikan diagram aktivitas (_Activity Diagrams_) dalam format Mermaid untuk proses-proses bisnis terpenting di WLMS.

---

## 1. Pembuatan Tiket Baru (`CreateIssueUseCase`)

```mermaid
flowchart TD
    Start([Mulai: Request Create Issue]) --> AuthCheck{Otorisasi:<br/>canViewProject & issues:create?}
    AuthCheck -- Tidak Berhak --> Err403[HTTP 403 Forbidden] --> Finish([Selesai])

    AuthCheck -- Berhak --> FindProject[Cari Proyek di Repository]
    FindProject --> ProjectCheck{Proyek Ada & Aktif?}
    ProjectCheck -- Tidak --> Err404[Throw Exception: Project Not Found / Archived] --> Finish

    ProjectCheck -- Ya --> LockSeq[Kunci Urutan Nomor Tiket Proyek]
    LockSeq --> GenNum[Hitung Nomor Berikutnya: MAX+1]
    GenNum --> InitStatus[Ambil Status Awal Alur Kerja Workflow]
    InitStatus --> BuildEntity[Instansiasi Entity Issue dengan IssueId Baru]

    BuildEntity --> CheckAssignee{Ada Assignee ID?}
    CheckAssignee -- Ya --> SetAssignee[Set AssigneeId pada Entity]
    CheckAssignee -- Tidak --> SkipAssignee[Assignee = NULL]

    SetAssignee --> SaveDB[Simpan Entity ke Repository Database]
    SkipAssignee --> SaveDB

    SaveDB --> RecordEvent[Record Domain Event: IssueCreated]
    RecordEvent --> LogActivity[Catat ke issue_activities: created]
    LogActivity --> ReturnOutput[Kembalikan IssueOutput & HTTP 201] --> Finish
```

---

## 2. Transisi Status Alur Kerja Tiket (`TransitionIssueStatusUseCase`)

```mermaid
flowchart TD
    Start([Mulai: Drag Tiket ke Kolom Baru / Ganti Status]) --> CheckAccess{Otorisasi:<br/>canViewProject & Hak Akses?}
    CheckAccess -- Tidak Berhak --> Err403[HTTP 403 Forbidden] --> Finish([Selesai])

    CheckAccess -- Berhak --> FindIssue[Cari IssueId di Repository]
    FindIssue --> IssueExists{Tiket Ditemukan?}
    IssueExists -- Tidak --> ErrNotFound[Throw Exception: Issue Not Found] --> Finish

    IssueExists -- Ya --> QueryTransition[Periksa workflow_transitions:<br/>current_status -> to_status]
    QueryTransition --> IsValid{Transisi Sah Diizinkan?}
    IsValid -- Ilegal --> ErrInvalid[Throw InvalidTransitionException<br/>HTTP 422 INVALID_TRANSITION] --> Finish

    IsValid -- Sah --> TxStart[Buka Transaksi Database]
    TxStart --> MutateStatus[Mutasi status_id pada Entity Issue]
    MutateStatus --> SaveRepo[Simpan Perubahan ke Database]
    SaveRepo --> CommitTx[Commit Transaksi]

    CommitTx --> RecordAudit[Catat issue_activities: status_changed]
    RecordAudit --> BroadcastWs[Broadcast Reverb WebSocket ke Papan Kanban]
    BroadcastWs --> ReturnJson[Kembalikan HTTP 200 OK] --> Finish
```

---

## 3. Penugasan PIC Tiket & Email Asinkron (`AssignIssueUseCase`)

```mermaid
flowchart TD
    Start([Mulai: Pilih PIC pada Dropdown Tiket]) --> CheckRole{Otorisasi RBAC:<br/>Superadmin / Owner / Admin / issues:assign?}
    CheckRole -- Tidak --> Err403[HTTP 403 Forbidden] --> Finish([Selesai])

    CheckRole -- Ya --> Tx[Buka Transaksi Database]
    Tx --> Load[Muat Issue dari Repository]
    Load --> Found{Issue Ada?}
    Found -- Tidak --> RollbackErr[Rollback & Throw Exception] --> Finish

    Found -- Ya --> UpdateAssignee[Mutasi assignee_id pada Entity]
    UpdateAssignee --> Save[Simpan Entity ke Repository]
    Save --> Commit[Commit Transaksi Database]

    Commit --> FireEvent[Dispatch Event: IssueAssigned]
    FireEvent --> HasPic{PIC Ditugaskan?}
    HasPic -- Tidak (Unassigned) --> LogAudit[Catat log: unassigned] --> Ret200
    HasPic -- Ya --> FetchUser[Ambil Email & Nama PIC dari tabel users]

    FetchUser --> QueueJob[Kirim Job ke Redis Queue:<br/>IssueAssignedMail]
    QueueJob --> LogAudit2[Catat issue_activities: assigned]
    LogAudit2 --> Ret200[Kembalikan HTTP 200 JSON] --> Finish
```

---

## 4. Siklus Hidup Sprint (_Sprint Lifecycle: Start & Complete_)

```mermaid
flowchart TD
    subgraph START_SPRINT["1. Memulai Sprint (StartSprintUseCase)"]
        S1([Klik Start Sprint]) --> S2{Sprint State == PENDING?}
        S2 -- Tidak --> S_Err[HTTP 422: Hanya sprint PENDING yang bisa dimulai]
        S2 -- Ya --> S3{Ada Sprint ACTIVE Lain di Proyek?}
        S3 -- Ada --> S_Err2[HTTP 422: Hanya 1 sprint boleh aktif bersamaan]
        S3 -- Tidak --> S4[Ubah State Sprint -> ACTIVE]
        S4 --> S5[Set start_date & end_date riil]
        S5 --> S6[Simpan ke Database]
    end

    subgraph COMPLETE_SPRINT["2. Menyelesaikan Sprint (CompleteSprintUseCase)"]
        C1([Klik Complete Sprint]) --> C2{Sprint State == ACTIVE?}
        C2 -- Tidak --> C_Err[HTTP 422: Sprint harus ACTIVE]
        C2 -- Ya --> C3[Cari Tiket yang Belum Selesai<br/>category != 'DONE']
        C3 --> C4{Ada Target Sprint Berikutnya?}
        C4 -- Ya --> C5[Pindahkan sisa tiket ke sprint_id target]
        C4 -- Tidak --> C6[Pindahkan sisa tiket ke Backlog<br/>sprint_id = NULL]
        C5 --> C7[Ubah State Sprint Selesai -> COMPLETED]
        C6 --> C7
        C7 --> C8[Simpan Perubahan & Selesaikan]
    end
```

---

## 5. Pemindahan Subtree Pohon Organisasi (`OrgUnitTreeService::moveSubtree`)

```mermaid
flowchart TD
    A([Request Pindah Induk Subtree Unit]) --> B{Target Induk == Unit Sendiri?}
    B -- Ya --> ErrSelf[HTTP 422: Dilarang menjadi induk diri sendiri] --> EndNode([Selesai])

    B -- Tidak --> C{Target Induk Adalah Keturunan Sendiri?<br/>org_unit_closures check}
    C -- Ya (Sirkular) --> ErrCycle[HTTP 422: Dilarang memindahkan ke keturunan sendiri] --> EndNode

    C -- Tidak (Aman) --> D[1. Hapus Jalur Lama yang Menghubungkan Subtree ke Leluhur Lama]
    D --> E[2. Buat Jalur Baru via CROSS JOIN supertree & subtree]
    E --> F[Kedalaman baru = supertree.depth + subtree.depth + 1]
    F --> G[Perbarui parent_id pada tabel org_units]
    G --> Success[Sukses Pindahkan Subtree Organisasi] --> EndNode
```

---

## 6. Impor Spreadsheet Excel Latar Belakang (`ImportIssuesJob`)

```mermaid
flowchart TD
    Upload([User Upload File Excel]) --> StoreTemp[Simpan File Sementara di Storage]
    StoreTemp --> DispatchQueue[Push ImportIssuesJob ke Redis Queue Worker]
    DispatchQueue --> AckClient[Respon Cepat ke Client: HTTP 202 Diproses]

    subgraph WORKER["Background Queue Worker Execution"]
        ReadRows[Baca Baris Spreadsheet via FastExcel]
        ReadRows --> RowLoop[Iterasi Setiap Baris Data]

        RowLoop --> MatchPic{Cocokkan PIC:}
        MatchPic --> M1[1. Exact Match employee_id / NIP]
        M1 -- Gagal --> M2[2. Exact Match Email]
        M2 -- Gagal --> M3[3. Exact Match Full Name]
        M3 -- Gagal --> M4[4. Partial Name Search Fallback]
        M4 -- Gagal --> M5[Assignee = NULL]

        M1 & M2 & M3 & M4 & M5 --> BuildIssue[Rakit Data Tiket & Status Awal]
        BuildIssue --> InsertDB[Simpan Tiket ke Database]
        InsertDB --> NextRow{Masih Ada Baris?}
        NextRow -- Ya --> RowLoop
        NextRow -- Tidak --> CleanupTemp[Hapus File Excel Sementara]
        CleanupTemp --> SendNotif[Kirim Notifikasi Selesai Impor ke User]
    end
```
