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
<!--
  Rosenberg Phase: Domain Model Evolution (Ch. 1 step 2b & Ch. 5, Fig. 5-18/5-19).
  Menambahkan atribut ke entitas domain; BELUM ada operasi/method (dialokasikan di Section 6).
-->

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
<!--
  Doug Rosenberg's Four Rules of Robustness Analysis (Ch. 5):
  1. Actors can only talk to Boundary objects.
  2. Boundary objects can only talk to Controllers and Actors.
  3. Entity objects can only talk to Controllers.
  4. Controller objects can talk to Boundaries, Entities, and other Controllers (NEVER to Actors directly).
  THE GOLDEN RULE: Boundary <-> Entity secara langsung DILARANG (no Noun-Noun links).
  Canonical PlantUML ONLY (No Mermaid).
-->

### Robustness Diagram: UC-02 Google Drive Connection and Document Import

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam responseMessageBelowArrow true

note as UC_TEXT
  <b>UC-02: Google Drive Connection and Document Import</b>
  <b>Basic Course (Sunny Day):</b>
  1. Peneliti buka Drive Browser (SCR-02) -> ambil daftar file/folder PDF/DOCX.
  2. Peneliti pilih file -> Konfirmasi Import (SCR-03) -> cek duplikasi & enqueue job.
  3. Worker refresh token -> unduh file -> ekstrak teks -> simpan Document/Text/Page (extracted).
  4. Sistem trigger UC-03 (Document Indexing) dengan document_id & perbarui SCR-04.

  <b>Alternate Courses (Rainy Day):</b>
  - Alt-1: Token expired -> auto refresh; jika dicabut -> minta re-auth.
  - Alt-3: Duplicate Drive ID -> tawarkan Import Ulang / Batal.
  - Alt-4/5/6: Gagal unduh / PDF terenkripsi-scan / file hilang -> status failed (#FFCCCC) + Retry.
end note

actor "Researcher" as Researcher
boundary "Drive File Browser\n(SCR-02)" as B_Browser
boundary "Import Confirmation Modal\n(SCR-03)" as B_Confirm
boundary "Import Progress View\n(SCR-04)" as B_Progress
boundary "Google Drive API\n(External Read-Only)" as B_GDrive

control "Fetch Drive File Listing\n[DriveService]" as C_ListFiles
control "Validate & Refresh Drive Token\n[DriveTokenService]" as C_RefreshToken
control "Check Duplicate by Drive ID\n[DocumentService]" as C_CheckDup
control "Enqueue Import Job\n[DocumentService]" as C_Enqueue
control "Download File from Drive\n[ImportWorkerTask]" as C_Download
control "Extract Text from File\n[TextExtractor]" as C_Extract
control "Save Extracted Text & Update Status\n[ImportWorkerTask]" as C_SaveResult
control "Trigger Indexing Job\n[ImportWorkerTask]" as C_TriggerUC03
control "Query Document Import Status\n[DocumentService]" as C_GetStatus
control "Handle Import / Extraction Failure\n[ImportWorkerTask]" as C_Fail #FFCCCC

entity "Document" as E_Doc
entity "ExtractedText" as E_Text
entity "ExtractedPage" as E_Page
entity "OAuthCredential" as E_Cred

usecase "UC-03: Document Indexing\nand Local Embedding" as UC03

UC_TEXT -[hidden]-> Researcher

Researcher --> B_Browser : 1. Open file browser / search
B_Browser --> C_ListFiles : Request Drive files
C_ListFiles --> C_RefreshToken : Validate access token
C_RefreshToken --> E_Cred : Load & refresh credentials
C_ListFiles --> B_GDrive : List files & metadata
C_ListFiles --> B_Browser : Return PDF/DOCX listing
B_Browser --> Researcher : Render listing

Researcher --> B_Confirm : 2. Select file & confirm import
B_Confirm --> C_CheckDup : Dispatch import request
C_CheckDup --> E_Doc : Check existing Drive ID
C_CheckDup --> B_Confirm : [Alt-3: Duplicate found]
C_CheckDup --> C_Enqueue : [Sunny Day: Unique / Override]
C_Enqueue --> E_Doc : Create importing record
C_Enqueue --> C_Download : Enqueue background task
C_Enqueue --> B_Progress : Return import ticket
B_Progress --> Researcher : Render progress

B_Progress --> C_GetStatus : Poll import state
C_GetStatus --> E_Doc : Read import status
C_GetStatus --> B_Progress : Deliver status update

C_Download --> C_RefreshToken : Ensure valid token
C_Download --> B_GDrive : Download file stream
C_Download --> C_Fail : [Alt-4/6: Download fail / Not found]
C_Download --> C_Extract : Extract PDF/DOCX text
C_Extract --> C_Fail : [Alt-5: Scanned / Corrupt]
C_Extract --> C_SaveResult : Extracted pages & text
C_SaveResult --> E_Text : Persist full text
C_SaveResult --> E_Page : Persist text pages
C_SaveResult --> E_Doc : Mark status = extracted
C_SaveResult --> C_TriggerUC03 : Dispatch document_id
C_TriggerUC03 ..> UC03 : <<invokes>>

C_Fail --> E_Doc : Mark failed & save reason
C_Fail --> B_Progress : Show error + Retry option
@enduml
```

### Boundary-Controller-Entity (BCE) Inventory & Method Allocation

| BCE Type | Element Name | Responsibility / Concrete Implementation |
|---|---|---|
| **Boundary** | `Drive File Browser (SCR-02)` | Frontend Page (`frontend/src/app/library/drive-browser/page.tsx`). |
| **Boundary** | `Import Confirmation Modal (SCR-03)` | Frontend Dialog Component (`frontend/src/components/features/drive/ImportConfirmModal.tsx`). |
| **Boundary** | `Import Progress View (SCR-04)` | Frontend Status Component (`frontend/src/components/features/drive/ImportProgress.tsx`). |
| **Controller** | `Validate & Refresh Drive Token` | `DriveTokenService.get_valid_access_token()` |
| **Controller** | `Fetch Drive File Listing` | `DriveService.list_files()` |
| **Controller** | `Check Duplicate by Drive ID` | `DocumentService.check_duplicate()` |
| **Controller** | `Enqueue Import Job` | `DocumentService.enqueue_import()` |
| **Controller** | `Download File from Drive` | `import_document_task.download_file()` |
| **Controller** | `Extract Text from File` | `TextExtractor.extract_text()` |
| **Controller** | `Save Extracted Text & Update Status` | `import_document_task.save_extraction()` |
| **Controller** | `Trigger Indexing Job` | `import_document_task.enqueue_indexing()` |
| **Controller** | `Query Document Import Status` | `DocumentService.get_document_status()` |
| **Entity** | `Document` | Domain entity model persisten (`backend/src/documents/models.py`). |
| **Entity** | `ExtractedText` | Domain entity model persisten (`backend/src/documents/models.py`). |
| **Entity** | `ExtractedPage` | Domain entity model persisten (`backend/src/documents/models.py`). |
| **Entity** | `OAuthCredential` | Domain entity model persisten (`backend/src/auth/models.py`). |

### BCE Rule Compliance Audit (Doug Rosenberg Rules)

- [x] **Rule 1 (Actors → Boundaries only)**: Researchers interact exclusively with Client UI (`Drive File Browser`, `Import Confirmation Modal`, and `Import Progress View`).
- [x] **Rule 2 (Boundaries → Controllers & Actors only)**: UI boundaries dispatch directly to application controllers. Zero direct link to Entity.
- [x] **Rule 3 (Entities → Controllers only)**: `Document`, `ExtractedText`, `ExtractedPage`, and `OAuthCredential` are accessed and mutated exclusively via Controllers.
- [x] **Rule 4 (Controllers → Boundaries, Entities, Controllers; not Actors)**: Controllers communicate with Boundaries to render results to Actors.
- [x] **Zero Direct Boundary-to-Entity Links**: Confirmed no direct link exists between UI boundaries and Entity models.

---

## 4. Preliminary Design Review (PDR) Checkpoint Gate

| PDR Criteria | Status | Evidence / Notes |
|---|:---:|---|
| **1. Use Case Coverage** | ✅ PASS | All sunny-day and alternate steps are accounted for in robustness analysis. |
| **2. Alternate Courses Handled** | ✅ PASS | Alt-1 (token expired) → `C_REFRESH_TOKEN`; Alt-3 (duplicate) → `C_CHECK_DUPLICATE`; Alt-4 (download fail) → `C_DOWNLOAD` error path; Alt-5 (scanned PDF) → `C_EXTRACT_TEXT` error path. |
| **3. Domain Model Updated** | ✅ PASS | `ExtractedPage` added for citation traceability. Models match database schema. |
| **4. Strict BCE Adherence** | ✅ PASS | Zero direct Boundary-to-Entity links. Boundaries are pure Client UI. |

*GATE STATUS*: **✅ APPROVED TO PROCEED TO DETAILED DESIGN**

---

## 5. Detailed Design: Sequence Diagrams (Behavior Allocation)
<!--
  Rosenberg Phase: Detailed Design (Ch. 8). Canonical PlantUML ONLY (No Mermaid).
-->

### Sequence Diagram 1: UC-02a Browse and Search Drive Files

```plantuml
@startuml
autoactivate off
autonumber
skinparam shadowing false
skinparam responseMessageBelowArrow true

actor "Researcher" as Researcher
boundary "Drive File Browser\n(SCR-02)" as Browser
boundary "Google Drive API\n(External Read-Only)" as GDriveAPI
control "DriveService" as DriveSvc
control "DriveTokenService" as TokenSvc
entity "OAuthCredential" as Credential

note left of Researcher
  <b>UC-02a: Browse and Search Drive Files</b>
  1. Researcher buka SCR-02 atau cari file.
  2. DriveTokenService validasi & auto-refresh token bila expired.
  3. DriveService ambil daftar file PDF/DOCX dari Google Drive API.
  4. Alt-1: Jika refresh token dicabut -> tampilkan prompt re-auth.
end note

Researcher -> Browser : search_files(folder_id, search_query)
Browser -> DriveSvc : list_files(researcher_id, folder_id, search_query)
DriveSvc -> TokenSvc : get_valid_access_token(researcher_id)
TokenSvc -> Credential : load_credentials(researcher_id)
Credential --> TokenSvc : credential_record

alt Alt-1: Token Expired & Refreshable
    TokenSvc -> TokenSvc : refresh_access_token(refresh_token)
    TokenSvc -> Credential : update_token_expiration(new_token, expiry)
    Credential --> TokenSvc : updated
    TokenSvc --> DriveSvc : valid_access_token
    DriveSvc -> GDriveAPI : fetch_drive_files(valid_access_token, query)
    GDriveAPI --> DriveSvc : drive_file_list
    DriveSvc --> Browser : deliver_file_list(files, next_page_token)
    Browser --> Researcher : render_file_browser(files, breadcrumbs)
else Alt-1 Error: Token Revoked
    TokenSvc --> DriveSvc : raise_token_revoked_error()
    DriveSvc --> Browser : auth_required_error()
    Browser --> Researcher : show_drive_reconnect_prompt()
else Sunny Day: Token Still Valid
    TokenSvc --> DriveSvc : valid_access_token
    DriveSvc -> GDriveAPI : fetch_drive_files(valid_access_token, query)
    GDriveAPI --> DriveSvc : drive_file_list
    DriveSvc --> Browser : deliver_file_list(files, next_page_token)
    Browser --> Researcher : render_file_browser(files, breadcrumbs)
end
@enduml
```

### Sequence Diagram 2: UC-02 Import and Extract Document

```plantuml
@startuml
autoactivate off
autonumber
skinparam shadowing false
skinparam responseMessageBelowArrow true

actor "Researcher" as Researcher
boundary "Import Confirmation Modal\n(SCR-03)" as ConfirmUI
boundary "Import Progress View\n(SCR-04)" as ProgressUI
boundary "Google Drive API\n(External Read-Only)" as GDriveAPI
control "DocumentService" as DocSvc
control "ImportWorkerTask" as Worker
control "DriveTokenService" as TokenSvc
control "TextExtractor" as Extractor
entity "Document" as Document
entity "OAuthCredential" as Credential
entity "ExtractedText" as ExtractedText
entity "ExtractedPage" as ExtractedPage

note left of Researcher
  <b>UC-02: Import & Extract Document</b>
  <b>Basic Course:</b>
  1. Konfirmasi import -> cek duplikasi -> enqueue worker.
  2. Worker refresh token -> download -> extract text.
  3. Simpan ExtractedText & ExtractedPage -> mark extracted.
  4. Trigger UC-03 indexing job.

  <b>Alternate Courses:</b>
  - Alt-3: Duplicate Drive ID -> minta konfirmasi Import Ulang.
  - Alt-4/5: Gagal unduh / Scanned PDF -> mark_failed + tombol Retry.
end note

Researcher -> ConfirmUI : confirm_import(drive_file_id, file_name, file_type)
ConfirmUI -> DocSvc : import_document(drive_file_id, researcher_id)
DocSvc -> Document : find_by_drive_id(drive_file_id, researcher_id)

alt Alt-3: Duplicate Document Found (Without Override)
    Document --> DocSvc : existing_document
    DocSvc --> ConfirmUI : duplicate_warning(existing_status)
    ConfirmUI --> Researcher : show_duplicate_override_prompt()
else Sunny Day: New Document or Override Confirmed
    Document --> DocSvc : none_found
    DocSvc -> Document : create_document_record(drive_file_id, status_importing)
    Document --> DocSvc : document_record
    DocSvc -> Worker : dispatch_import_job(document_id)
    DocSvc --> ProgressUI : display_import_progress(document_id)
    ProgressUI --> Researcher : render_progress_view()

    note over Worker : Background ARQ Execution
    Worker -> TokenSvc : get_valid_access_token(researcher_id)
    TokenSvc -> Credential : load_credentials(researcher_id)
    Credential --> TokenSvc : credential_record
    TokenSvc --> Worker : access_token
    Worker -> Document : update_status(status_downloading)
    Worker -> GDriveAPI : download_file_stream(access_token, drive_file_id)
    GDriveAPI --> Worker : file_bytes_stream
    Worker -> Document : update_status(status_extracting)
    Worker -> Extractor : extract_text(file_bytes, file_type)

    alt Sunny Day: Text Extracted Successfully
        Extractor --> Worker : extraction_result(pages, full_text)
        Worker -> ExtractedText : persist_extracted_text(document_id, full_text)
        ExtractedText --> Worker : text_record
        Worker -> ExtractedPage : persist_pages(text_record_id, pages)
        ExtractedPage --> Worker : pages_recorded
        Worker -> Document : mark_extracted(status_extracted, checksum)
        Worker -> Worker : notify_indexing_pipeline(document_id)
        ProgressUI -> DocSvc : query_status(document_id)
        DocSvc -> Document : get_current_status(document_id)
        Document --> DocSvc : status_extracted
        DocSvc --> ProgressUI : update_progress_state(status_extracted)
        ProgressUI --> Researcher : render_extraction_completed()
    else Alt-4 / Alt-5: Download or Extraction Failure (e.g. Scanned PDF)
        Extractor --> Worker : raise_scanned_pdf_error("No extractable text")
        Worker -> Document : mark_failed(status_failed, error_message)
        Document --> Worker : status_failed
        ProgressUI -> DocSvc : query_status(document_id)
        DocSvc --> ProgressUI : update_progress_state(status_failed, error_message)
        ProgressUI --> Researcher : render_failure_with_retry()
    end
end
@enduml
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
