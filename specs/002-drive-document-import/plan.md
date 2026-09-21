# Technical Plan: UC-02 Google Drive Connection and Document Import – ICONIX Process

**Branch**: `002-drive-document-import` | **Date**: 2026-09-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/002-drive-document-import/spec.md`
**Methodology Reference**: Doug Rosenberg & Matt Stephens, *Use Case Driven Object Modeling with UML*

---

## 1. System Architecture & Technical Context

- **Frontend Layer**: Next.js App Router (TypeScript), Tailwind CSS, shadcn/ui, `@phosphor-icons/react`, Bun runtime
- **Backend Layer**: FastAPI (Python 3.12), Pydantic v2, SQLModel / SQLAlchemy ORM
- **Persistence**: PostgreSQL (psycopg2-binary sync for FastAPI; asyncpg for ARQ worker)
- **Queue & Cache**: Redis (ARQ job queue)
- **Architectural Pattern**: **Router (Boundary) → Service (Controller) → Repository/Model (Entity)**
- **New Dependencies (from research.md)**:
  - `google-api-python-client>=2.120.0` — Drive API v3 file listing & download
  - `google-auth>=2.29.0`, `google-auth-httplib2>=0.2.0` — silent token refresh
  - `pdfplumber>=0.11.0` — PDF text extraction (MIT license)
  - `python-docx>=1.1.0` — DOCX text extraction
  - `arq>=0.25.0` — async background job queue (import + extraction pipeline)
  - `asyncpg>=0.29.0` — async DB driver for ARQ worker

---

## 2. Updated Domain Model

```mermaid
classDiagram
    class Document {
        +UUID id
        +String google_drive_id
        +String file_name
        +Enum file_type [pdf, docx]
        +Integer file_size_bytes
        +DateTime drive_modified_at
        +String drive_md5_checksum
        +Enum import_status [importing, extracting, extracted, failed]
        +String failure_reason
        +DateTime imported_at
        +DateTime extracted_at
        +UUID researcher_id
        +DateTime created_at
        +DateTime updated_at
    }

    class ExtractedText {
        +UUID id
        +UUID document_id
        +Text full_text
        +Integer total_pages
        +DateTime extracted_at
    }

    class ExtractedPage {
        +UUID id
        +UUID extracted_text_id
        +Integer page_number
        +Text content
    }

    class ResearcherAccount {
        +UUID id
        +String full_name
        +String email
    }

    class OAuthCredential {
        +UUID id
        +UUID researcher_id
        +String encrypted_access_token
        +String encrypted_refresh_token
        +DateTime token_expires_at
    }

    ResearcherAccount "1" --> "*" Document : imports
    ResearcherAccount "1" --> "1" OAuthCredential : holds
    Document "1" --> "0..1" ExtractedText : yields
    ExtractedText "1" --> "*" ExtractedPage : contains
```

- **Document**: Main imported unit. `google_drive_id` serves as unique key for deduplication (Alt-3). `drive_md5_checksum` detects content modification. `import_status` follows state machine: `importing → extracting → extracted | failed`.
- **ExtractedText**: Complete text extraction result, decoupled from document metadata for re-extraction flexibility. Produced by UC-02 as output data; UC-03 (Document Indexing and Local Embedding) reads it via `document_id` reference.
- **ExtractedPage**: Page-level (PDF) or section-level (DOCX) text records produced by UC-02 extraction. Preserves `page_number` for citation traceability. UC-03 determines its own chunking and embedding strategy independently using a local embedding model.
- **OAuthCredential**: Existing auth entity — used for silent token refresh during Drive download.
- **Associations**: `Document.researcher_id` → FK to `researchers.id`. `ExtractedText.document_id` → FK to `documents.id` (UNIQUE constraint — one active extraction per document). `ExtractedPage.extracted_text_id` → FK to `extracted_texts.id`.
- **Database Migrations**: Alembic migration for `documents`, `extracted_texts`, and `extracted_pages` tables with indexes on `google_drive_id`, `researcher_id`, and `import_status`.

---

## 3. ICONIX Robustness Analysis (Preliminary Design)

### Robustness Diagram: UC-02: Google Drive Connection and Document Import

```mermaid
flowchart TD
    classDef actor fill:#1e293b,stroke:#64748b,stroke-width:2px,color:#f8fafc
    classDef boundary fill:#0c4a6e,stroke:#0284c7,stroke-width:2px,color:#f0f9ff
    classDef controller fill:#451a03,stroke:#d97706,stroke-width:2px,color:#fef3c7
    classDef entity fill:#064e3b,stroke:#059669,stroke-width:2px,color:#ecfdf5

    RESEARCHER["Actor: Researcher"]:::actor

    B_BROWSER[/"Boundary: Drive File Browser\n(SCR-02 — Next.js Page)"/]:::boundary
    B_CONFIRM[/"Boundary: Import Confirmation Modal\n(SCR-03 — Dialog Component)"/]:::boundary
    B_PROGRESS[/"Boundary: Import Progress View\n(SCR-04 — Status Panel)"/]:::boundary
    B_DRIVE_LIST[/"Boundary: GET /api/drive/files\n(FastAPI Router)"/]:::boundary
    B_IMPORT[/"Boundary: POST /api/documents/import\n(FastAPI Router)"/]:::boundary
    B_STATUS[/"Boundary: GET /api/documents/{id}/status\n(FastAPI Router)"/]:::boundary

    C_REFRESH_TOKEN(["Controller: Validate & Refresh Drive Token"]):::controller
    C_LIST_FILES(["Controller: Fetch Drive File Listing"]):::controller
    C_CHECK_DUPLICATE(["Controller: Check Duplicate by Drive ID"]):::controller
    C_ENQUEUE_IMPORT(["Controller: Enqueue Import Job (ARQ)"]):::controller
    C_DOWNLOAD(["Controller: Download File from Drive"]):::controller
    C_EXTRACT_TEXT(["Controller: Extract Text from File"]):::controller
    C_SAVE_RESULT(["Controller: Save Extracted Text & Update Status"]):::controller
    C_TRIGGER_UC03(["Controller: Trigger UC-03 Indexing Job"]):::controller

    E_DOC[("Entity: Document")]:::entity
    E_TEXT[("Entity: ExtractedText")]:::entity
    E_PAGE[("Entity: ExtractedPage")]:::entity
    E_CRED[("Entity: OAuthCredential")]:::entity

    RESEARCHER -->|"1. Open file browser"| B_BROWSER
    B_BROWSER -->|"2. GET /api/drive/files?folder_id=..."| B_DRIVE_LIST
    B_DRIVE_LIST -->|"3. Validate token"| C_REFRESH_TOKEN
    C_REFRESH_TOKEN -->|"Read/write token"| E_CRED
    C_REFRESH_TOKEN -->|"4. Valid token"| C_LIST_FILES
    C_LIST_FILES -->|"5. Drive API files.list()"| B_DRIVE_LIST
    B_DRIVE_LIST -->|"6. Return file list"| B_BROWSER
    B_BROWSER -->|"7. Render file list"| RESEARCHER

    RESEARCHER -->|"8. Select file & click Import"| B_CONFIRM
    B_CONFIRM -->|"9. POST /api/documents/import"| B_IMPORT
    B_IMPORT -->|"10. Check duplicate"| C_CHECK_DUPLICATE
    C_CHECK_DUPLICATE -->|"Read document"| E_DOC
    C_CHECK_DUPLICATE -->|"11. No duplicate / confirmed override"| C_ENQUEUE_IMPORT
    C_ENQUEUE_IMPORT -->|"12. Create Document record (status=importing)"| E_DOC
    C_ENQUEUE_IMPORT -->|"13. Enqueue ARQ job"| B_IMPORT
    B_IMPORT -->|"14. Return {document_id, status}"| B_PROGRESS
    B_PROGRESS -->|"15. Render progress"| RESEARCHER

    B_PROGRESS -->|"16. Poll GET /api/documents/{id}/status"| B_STATUS
    B_STATUS -->|"17. Read status"| E_DOC
    B_STATUS -->|"18. Return status"| B_PROGRESS

    C_ENQUEUE_IMPORT -.->|"ARQ Worker (async)"| C_DOWNLOAD
    C_DOWNLOAD -->|"Validate/refresh token"| C_REFRESH_TOKEN
    C_DOWNLOAD -->|"Drive files.get_media()"| C_EXTRACT_TEXT
    C_EXTRACT_TEXT -->|"pdfplumber / python-docx"| C_SAVE_RESULT
    C_SAVE_RESULT -->|"Write ExtractedText"| E_TEXT
    C_SAVE_RESULT -->|"Write ExtractedPage"| E_PAGE
    C_SAVE_RESULT -->|"Update Document status=extracted"| E_DOC
    C_SAVE_RESULT -->|"Trigger UC-03"| C_TRIGGER_UC03
```

### Boundary-Controller-Entity (BCE) Inventory & Method Allocation

| BCE Type | Element Name | Responsibility / Concrete Implementation |
|---|---|---|
| **Boundary** | `Drive File Browser` | `frontend/src/app/library/drive-browser/page.tsx` |
| **Boundary** | `Import Confirmation Modal` | `frontend/src/components/features/drive/ImportConfirmModal.tsx` |
| **Boundary** | `Import Progress View` | `frontend/src/components/features/drive/ImportProgress.tsx` |
| **Boundary** | `GET /api/drive/files` | `backend/src/drive/router.py` — `list_drive_files()` |
| **Boundary** | `POST /api/documents/import` | `backend/src/documents/router.py` — `import_document()` |
| **Boundary** | `GET /api/documents/{id}/status` | `backend/src/documents/router.py` — `get_document_status()` |
| **Controller** | `Validate & Refresh Drive Token` | `backend/src/drive/token_service.py` — `DriveTokenService.get_valid_access_token()` |
| **Controller** | `Fetch Drive File Listing` | `backend/src/drive/drive_service.py` — `DriveService.list_files()` |
| **Controller** | `Check Duplicate by Drive ID` | `backend/src/documents/service.py` — `DocumentService.check_duplicate()` |
| **Controller** | `Enqueue Import Job` | `backend/src/documents/service.py` — `DocumentService.enqueue_import()` |
| **Controller** | `Download File from Drive` | `backend/src/workers/import_task.py` — `download_file()` |
| **Controller** | `Extract Text from File` | `backend/src/documents/extractor.py` — `extract_text()` |
| **Controller** | `Save Extracted Text & Update Status` | `backend/src/workers/import_task.py` — `save_extraction()` |
| **Controller** | `Trigger UC-03 Indexing Job` | `backend/src/workers/import_task.py` — `enqueue_indexing()` |
| **Entity** | `Document` | `backend/src/documents/models.py` — `class Document(SQLModel, table=True)` |
| **Entity** | `ExtractedText` | `backend/src/documents/models.py` — `class ExtractedText(SQLModel, table=True)` |
| **Entity** | `ExtractedPage` | `backend/src/documents/models.py` — `class ExtractedPage(SQLModel, table=True)` |
| **Entity** | `OAuthCredential` | `backend/src/auth/models.py` — existing auth entity |

### BCE Rule Compliance Audit (Doug Rosenberg Rules)

- [x] **Rule 1 (Actors → Boundaries only)**: Researchers interact exclusively with `Drive File Browser`, `Import Confirmation Modal`, and `Import Progress View`.
- [x] **Rule 2 (Boundaries → Controllers & Actors only)**: `GET /api/drive/files` dispatches to `DriveService.list_files()`; `POST /api/documents/import` dispatches to `DocumentService.check_duplicate()` + `enqueue_import()`. No direct link to Entity.
- [x] **Rule 3 (Entities → Controllers only)**: `Document`, `ExtractedText`, and `ExtractedPage` are accessed and mutated exclusively via Controllers (`DocumentService`, `import_task.py`).
- [x] **Rule 4 (Controllers → Boundaries, Entities, Controllers; not Actors)**: Controllers never interact directly with Actors.
- [x] **Zero Direct Boundary-to-Entity Links**: Confirmed no direct link exists between Router endpoints and Entity models.

---

## 4. Preliminary Design Review (PDR) Checkpoint Gate

| PDR Criteria | Status | Evidence / Notes |
|---|:---:|---|
| **1. Use Case Coverage** | ✅ PASS | All 8 sunny-day steps UC-02 are accounted for in robustness diagram. |
| **2. Alternate Courses Handled** | ✅ PASS | Alt-1 (token expired) → `C_REFRESH_TOKEN`; Alt-3 (duplicate) → `C_CHECK_DUPLICATE`; Alt-4 (download fail) → `C_DOWNLOAD` error path; Alt-5 (extraction fail, scanned PDF) → `C_EXTRACT_TEXT` error path; Alt-6 (file deleted) → `C_DOWNLOAD` 404 path. |
| **3. Domain Model Updated** | ✅ PASS | `ExtractedPage` added for citation traceability needed by UC-03. `drive_md5_checksum` added to `Document`. All models standardized to English. |
| **4. Strict BCE Adherence** | ✅ PASS | Zero direct Boundary-to-Entity links. ARQ worker accesses Entities exclusively via Controllers. |

*GATE STATUS*: **✅ APPROVED TO PROCEED TO DETAILED DESIGN**

---

## 5. Detailed Design: Sequence Diagrams (Behavior Allocation)

### Sequence Diagram: UC-02a: Browse and Search Drive Files

```mermaid
sequenceDiagram
    autonumber
    actor Researcher as Researcher
    participant Browser as Boundary: Drive File Browser
    participant DriveRouter as Boundary: GET /api/drive/files
    participant TokenSvc as Controller: DriveTokenService
    participant DriveSvc as Controller: DriveService
    participant CredRepo as Entity: OAuthCredential
    participant DriveAPI as External: Google Drive API v3

    Researcher->>Browser: Open Drive File Browser (folder_id, search_query)
    Browser->>DriveRouter: GET /api/drive/files?folder_id=&q=&page_token=
    DriveRouter->>TokenSvc: get_valid_access_token(researcher_id)
    TokenSvc->>CredRepo: SELECT WHERE researcher_id = ?
    CredRepo-->>TokenSvc: OAuthCredential
    alt Token expired
        TokenSvc->>DriveAPI: POST /token (refresh_token)
        DriveAPI-->>TokenSvc: new access_token + expiry
        TokenSvc->>CredRepo: UPDATE token_access + expiry
    end
    TokenSvc-->>DriveSvc: access_token
    DriveSvc->>DriveAPI: files.list(q, pageSize=100, pageToken, fields)
    DriveAPI-->>DriveSvc: {files: [...], nextPageToken}
    DriveSvc-->>DriveRouter: DriveFileListResponse(files, next_page_token)
    DriveRouter-->>Browser: 200 OK (JSON)
    Browser-->>Researcher: Render file list + folder breadcrumbs
```

### Sequence Diagram: UC-02: Import and Extract Document (Happy Path)

```mermaid
sequenceDiagram
    autonumber
    actor Researcher as Researcher
    participant ConfirmUI as Boundary: Import Confirmation Modal
    participant DocRouter as Boundary: POST /api/documents/import
    participant DocSvc as Controller: DocumentService
    participant DocRepo as Entity: Document
    participant Queue as ARQ Redis Queue
    participant Worker as Controller: import_document_task (ARQ)
    participant TokenSvc as Controller: DriveTokenService
    participant DriveAPI as External: Google Drive API v3
    participant Extractor as Controller: TextExtractor
    participant TextRepo as Entity: ExtractedText + ExtractedPage
    participant UC03Queue as ARQ Queue (UC-03)

    Researcher->>ConfirmUI: Click "Import Now" (drive_file_id, file_name, file_type)
    ConfirmUI->>DocRouter: POST /api/documents/import {drive_file_id, ...}
    DocRouter->>DocSvc: import_document(drive_file_id, researcher_id)
    DocSvc->>DocRepo: SELECT WHERE google_drive_id=? AND researcher_id=?
    DocRepo-->>DocSvc: None (not duplicate)
    DocSvc->>DocRepo: INSERT Document(status=importing, md5=...) → document_id
    DocSvc->>Queue: enqueue_job("import_document_task", document_id)
    DocSvc-->>DocRouter: {document_id, status: "importing"}
    DocRouter-->>ConfirmUI: 202 Accepted {document_id}
    ConfirmUI-->>Researcher: Render Progress View (SCR-04)

    Note over Worker: ARQ Worker (async, background)
    Queue->>Worker: Dequeue import_document_task(document_id)
    Worker->>TokenSvc: get_valid_access_token(researcher_id)
    TokenSvc-->>Worker: access_token
    Worker->>DocRepo: UPDATE status = "importing"
    Worker->>DriveAPI: files.get_media(file_id) via MediaIoBaseDownload
    DriveAPI-->>Worker: file_bytes (streamed to SpooledTemporaryFile)
    Worker->>DocRepo: UPDATE status = "extracting"
    Worker->>Extractor: extract_text(file_bytes, file_type)
    Extractor-->>Worker: {pages: [{page_number, content}, ...], full_text}
    Worker->>TextRepo: INSERT ExtractedText + ExtractedPage records
    Worker->>DocRepo: UPDATE status = "extracted", extracted_at
    Worker->>UC03Queue: enqueue_job("index_document_task", document_id)
```

### Sequence Diagram: UC-02 — Import Failure (Scanned PDF)

```mermaid
sequenceDiagram
    autonumber
    participant Worker as Controller: import_document_task
    participant Extractor as Controller: TextExtractor (pdfplumber)
    participant DocRepo as Entity: Document

    Worker->>Extractor: extract_text(file_bytes, "pdf")
    Extractor->>Extractor: is_scanned_pdf(file_bytes)
    Extractor-->>Worker: raise ScannedPDFError("PDF does not contain extractable text...")
    Worker->>DocRepo: UPDATE status="failed", failure_reason="PDF does not contain extractable text (likely a scanned image)."
    Note over Worker: max_tries=1 — no retry for permanent errors
```

---

## 6. Detailed Design: Static Class Model

```mermaid
classDiagram
    class DriveRouter {
        +list_drive_files(folder_id, q, page_token, db, current_user) DriveFileListResponse
        +get_file_metadata(file_id, db, current_user) DriveFileMetadataResponse
    }

    class DocumentRouter {
        +import_document(body: ImportDocumentRequest, db, current_user) ImportDocumentResponse
        +get_document_status(document_id, db, current_user) DocumentStatusResponse
        +retry_import(document_id, db, current_user) ImportDocumentResponse
    }

    class DriveTokenService {
        -crypto: TokenEncryptionService
        -settings: Settings
        +get_valid_access_token(researcher_id, db) str
        -_refresh_token(oauth_cred) str
    }

    class DriveService {
        -token_service: DriveTokenService
        +list_files(access_token, folder_id, query, page_token) DriveFileListResponse
        +download_file(access_token, file_id) SpooledTemporaryFile
        +get_file_metadata(access_token, file_id) DriveFileMetadata
    }

    class DocumentService {
        -repo: DocumentRepository
        -queue: arq.ArqRedis
        +check_duplicate(drive_file_id, researcher_id, db) Document | None
        +enqueue_import(drive_file_id, file_name, file_type, file_size_bytes, md5, researcher_id, db) Document
        +get_status(document_id, researcher_id, db) DocumentStatusResponse
        +retry_import(document_id, researcher_id, db) Document
    }

    class DocumentRepository {
        -db: Session
        +get_by_drive_id(drive_file_id, researcher_id) Document | None
        +get_by_id(document_id, researcher_id) Document | None
        +create(document: Document) Document
        +update_status(document_id, status, failure_reason) Document
    }

    class TextExtractor {
        +extract_text(file_bytes, file_type) ExtractionResult
        -extract_pdf(file_bytes) ExtractionResult
        -extract_docx(file_bytes) ExtractionResult
        -is_scanned_pdf(file_bytes) bool
    }

    class ImportDocumentTask {
        +import_document_task(ctx, document_id, researcher_id) None
        -download_file(ctx, document_id) SpooledTemporaryFile
        -extract_and_save(ctx, document_id, file_bytes, file_type) None
        -trigger_indexing(ctx, document_id) None
    }

    class Document {
        +UUID id
        +String google_drive_id
        +String file_name
        +Enum file_type
        +Integer file_size_bytes
        +String drive_md5_checksum
        +Enum import_status
        +String failure_reason
        +UUID researcher_id
        +DateTime created_at
        +DateTime updated_at
    }

    class ExtractedText {
        +UUID id
        +UUID document_id
        +Text full_text
        +Integer total_pages
        +DateTime extracted_at
    }

    class ExtractedPage {
        +UUID id
        +UUID extracted_text_id
        +Integer page_number
        +Text content
    }

    DriveRouter ..> DriveTokenService : uses
    DriveRouter ..> DriveService : uses
    DocumentRouter ..> DocumentService : uses
    DocumentService --> DocumentRepository : delegates
    DocumentService ..> ImportDocumentTask : enqueues via arq
    ImportDocumentTask ..> DriveService : uses
    ImportDocumentTask ..> DriveTokenService : uses
    ImportDocumentTask ..> TextExtractor : uses
    ImportDocumentTask ..> DocumentRepository : updates
    DocumentRepository ..> Document : persists
    DocumentRepository ..> ExtractedText : persists
    DocumentRepository ..> ExtractedPage : persists
```

### Concrete File & Method Signatures

**Backend structure** (`backend/src/`):
```
drive/
  router.py          → GET /api/drive/files, GET /api/drive/files/{file_id}
  drive_service.py   → DriveService.list_files(), .download_file(), .get_file_metadata()
  token_service.py   → DriveTokenService.get_valid_access_token()
  schemas.py         → DriveFileListResponse, DriveFileMetadata, DriveFileMetadataResponse

documents/
  router.py          → POST /api/documents/import, GET /api/documents/{id}/status, POST /api/documents/{id}/retry
  service.py         → DocumentService.check_duplicate(), .enqueue_import(), .get_status(), .retry_import()
  repository.py      → DocumentRepository (CRUD)
  models.py          → Document, ExtractedText, ExtractedPage (SQLModel)
  extractor.py       → TextExtractor.extract_text(), is_scanned_pdf()
  schemas.py         → ImportDocumentRequest, ImportDocumentResponse, DocumentStatusResponse

workers/
  import_task.py     → import_document_task(ctx, document_id, researcher_id) [ARQ task]
  worker.py          → ARQ WorkerSettings, redis pool, task registry

alembic/versions/
  002_document_import_schema.py   → CREATE TABLE documents, extracted_texts, extracted_pages + indexes
```

**Frontend structure** (`frontend/src/`):
```
app/library/
  page.tsx                        → SCR-01: Library / Document List
  drive-browser/page.tsx          → SCR-02: Drive File Browser

components/features/drive/
  DriveBrowser.tsx                → Folder navigation, file list, search, filter PDF/DOCX
  DriveFileRow.tsx                → Single file row with type badge and select action
  ImportConfirmModal.tsx          → SCR-03: Import Confirmation Dialog
  ImportProgress.tsx              → SCR-04: Import progress with status polling
  DriveFileIcon.tsx               → @phosphor-icons/react — FilePdf, FileDoc, Folder icons

hooks/
  useDriveFiles.ts                → React Query hook: GET /api/drive/files
  useDocumentStatus.ts            → React Query polling hook: GET /api/documents/{id}/status (3s interval)
  useImportDocument.ts            → React Query mutation: POST /api/documents/import
```

---

## 7. Critical Design Review (CDR) Checkpoint Gate

| CDR Criteria | Status | Evidence / Notes |
|---|:---:|---|
| **1. Method Allocation** | ✅ PASS | Every message in sequence diagrams maps to a concrete class method. |
| **2. Class Signatures** | ✅ PASS | Parameter types, return types defined in class models. Exception types (`ScannedPDFError`, `EncryptedPDFError`, `google.auth.exceptions.RefreshError`) documented. |
| **3. Test Plan Feasibility** | ✅ PASS | All controller methods and boundary endpoints are unit-testable. |
| **4. PDR Traceability** | ✅ PASS | All 8 controllers from robustness diagrams map to class methods. |

*GATE STATUS*: **✅ APPROVED TO PROCEED TO IMPLEMENTATION**

---

## 8. Version Control & Git Milestone Plan

| Milestone / Phase | Scope / Layer | Commit Type & Message | Verification Required |
|---|---|---|---|
| **Phase 1: Setup** | DB schema + ARQ infra | `feat(core): add document import schema migrations and ARQ worker setup` | Migration up/down passes; `arq worker` starts without error |
| **Phase 2: Drive API** | DriveService + token refresh | `feat(drive): implement Drive file listing, search, and token refresh service` | `DriveService.list_files()` returns paginated results with mock token |
| **Phase 3: File Browser UI** | SCR-02 frontend | `feat(UC-02a): implement Drive file browser with folder navigation and search` | Browser renders folder structure; only PDF/DOCX selectable |
| **Phase 4: Import Pipeline** | POST /import + ARQ task | `feat(UC-02): implement document import endpoint and ARQ extraction worker` | Import completes end-to-end; `ExtractedText` + `ExtractedPage` saved |
| **Phase 5: Progress & Retry UI** | SCR-03, SCR-04 frontend | `feat(UC-02): add import confirmation modal, progress view, and retry flow` | Status polling works; failed state shows error + retry button |
| **Phase 6: UC-03 Trigger** | ARQ → indexing queue | `feat(UC-02): trigger UC-03 indexing job on extraction completion` | After `extracted`, ARQ job `index_document_task` enqueued with correct `document_id` (verified via worker test T032) |
| **Phase 7: Release** | Tests + docs | `chore(release): complete UC-02 Drive import verification and documentation` | Full test suite green; quickstart.md validated |
