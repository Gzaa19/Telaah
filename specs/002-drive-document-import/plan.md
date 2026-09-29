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

    B_BROWSER[/"Boundary: Drive File Browser (SCR-02)"/]:::boundary
    B_CONFIRM[/"Boundary: Import Confirmation Modal (SCR-03)"/]:::boundary
    B_PROGRESS[/"Boundary: Import Progress View (SCR-04)"/]:::boundary

    C_REFRESH_TOKEN(["Controller: Validate & Refresh Drive Token"]):::controller
    C_LIST_FILES(["Controller: Fetch Drive File Listing"]):::controller
    C_CHECK_DUPLICATE(["Controller: Check Duplicate by Drive ID"]):::controller
    C_ENQUEUE_IMPORT(["Controller: Enqueue Import Job"]):::controller
    C_DOWNLOAD(["Controller: Download File from Drive"]):::controller
    C_EXTRACT_TEXT(["Controller: Extract Text from File"]):::controller
    C_SAVE_RESULT(["Controller: Save Extracted Text & Update Status"]):::controller
    C_TRIGGER_UC03(["Controller: Trigger Indexing Job"]):::controller
    C_GET_STATUS(["Controller: Query Document Import Status"]):::controller

    E_DOC[("Entity: Document")]:::entity
    E_TEXT[("Entity: ExtractedText")]:::entity
    E_PAGE[("Entity: ExtractedPage")]:::entity
    E_CRED[("Entity: OAuthCredential")]:::entity

    RESEARCHER -->|"1. Opens file browser"| B_BROWSER
    B_BROWSER -->|"2. Requests Drive files"| C_LIST_FILES
    C_LIST_FILES -->|"3. Validates access token"| C_REFRESH_TOKEN
    C_REFRESH_TOKEN -->|"Loads & updates credentials"| E_CRED
    C_REFRESH_TOKEN -->|"Returns valid token"| C_LIST_FILES
    C_LIST_FILES -->|"Returns file listing"| B_BROWSER
    B_BROWSER -->|"4. Renders file listing"| RESEARCHER

    RESEARCHER -->|"5. Selects file & requests import"| B_CONFIRM
    B_CONFIRM -->|"6. Dispatches import request"| C_CHECK_DUPLICATE
    C_CHECK_DUPLICATE -->|"Checks existing drive ID"| E_DOC
    C_CHECK_DUPLICATE -->|"Confirmed unique or override"| C_ENQUEUE_IMPORT
    C_ENQUEUE_IMPORT -->|"Creates initial record"| E_DOC
    C_ENQUEUE_IMPORT -->|"Enqueues background task"| C_DOWNLOAD
    C_ENQUEUE_IMPORT -->|"Returns import ticket"| B_PROGRESS
    B_PROGRESS -->|"7. Renders import progress"| RESEARCHER

    B_PROGRESS -->|"8. Polls import state"| C_GET_STATUS
    C_GET_STATUS -->|"Reads import status"| E_DOC
    C_GET_STATUS -->|"Returns status update"| B_PROGRESS

    C_DOWNLOAD -->|"Validates token"| C_REFRESH_TOKEN
    C_DOWNLOAD -->|"Streams file bytes"| C_EXTRACT_TEXT
    C_EXTRACT_TEXT -->|"Extracts text pages"| C_SAVE_RESULT
    C_SAVE_RESULT -->|"Persists full text"| E_TEXT
    C_SAVE_RESULT -->|"Persists text pages"| E_PAGE
    C_SAVE_RESULT -->|"Updates document state"| E_DOC
    C_SAVE_RESULT -->|"Triggers indexing"| C_TRIGGER_UC03
```

<details>
<summary><b>Canonical PlantUML: UC-02 Robustness Diagram (Native BCE Icons)</b></summary>

```plantuml
@startuml
left to right direction
skinparam handwritten false
skinparam monochrome false
skinparam shadowing false

actor "Researcher" as Researcher
boundary "Drive File Browser\n(SCR-02)" as B_Browser
boundary "Import Confirmation Modal\n(SCR-03)" as B_Confirm
boundary "Import Progress View\n(SCR-04)" as B_Progress

control "DriveService" as C_ListFiles
control "DriveTokenService" as C_RefreshToken
control "DocumentService" as C_DocSvc
control "ImportWorkerTask" as C_Download
control "TextExtractor" as C_ExtractText

entity "Document" as E_Doc
entity "ExtractedText" as E_Text
entity "ExtractedPage" as E_Page
entity "OAuthCredential" as E_Cred

Researcher --> B_Browser : opens_browser()
B_Browser --> C_ListFiles : request_drive_files()
C_ListFiles --> C_RefreshToken : validate_access_token()
C_RefreshToken --> E_Cred : load_and_update_credentials()
C_RefreshToken --> C_ListFiles : valid_token
C_ListFiles --> B_Browser : file_listing
B_Browser --> Researcher : render_file_listing()

Researcher --> B_Confirm : confirm_import()
B_Confirm --> C_DocSvc : import_document()
C_DocSvc --> E_Doc : check_duplicate_drive_id()
C_DocSvc --> E_Doc : create_initial_document()
C_DocSvc --> C_Download : dispatch_import_job()
C_DocSvc --> B_Progress : return_import_ticket()
B_Progress --> Researcher : render_progress()

B_Progress --> C_DocSvc : query_status()
C_DocSvc --> E_Doc : read_import_status()
C_DocSvc --> B_Progress : deliver_status_update()

C_Download --> C_RefreshToken : validate_token()
C_Download --> C_ExtractText : extract_text_pages()
C_ExtractText --> E_Text : persist_full_text()
C_ExtractText --> E_Page : persist_pages()
C_Download --> E_Doc : mark_extracted()
@enduml
```
</details>

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

### Sequence Diagram: UC-02a: Browse and Search Drive Files

```mermaid
sequenceDiagram
    autonumber
    actor Researcher as Actor: Researcher
    participant Browser as Boundary: Drive File Browser (SCR-02)
    participant DriveSvc as Controller: DriveService
    participant TokenSvc as Controller: DriveTokenService
    participant Credential as Entity: OAuthCredential

    Researcher->>Browser: search_files(folder_id, search_query)
    Browser->>DriveSvc: list_files(researcher_id, folder_id, search_query)
    DriveSvc->>TokenSvc: get_valid_access_token(researcher_id)
    TokenSvc->>Credential: load_credentials(researcher_id)
    Credential-->>TokenSvc: credential_record
    alt Token expired
        TokenSvc->>TokenSvc: refresh_access_token(refresh_token)
        TokenSvc->>Credential: update_token_expiration(new_token, expiry)
        Credential-->>TokenSvc: updated
    end
    TokenSvc-->>DriveSvc: valid_access_token
    DriveSvc->>DriveSvc: fetch_drive_api(valid_access_token, query)
    DriveSvc-->>Browser: deliver_file_list(files, next_page_token)
    Browser-->>Researcher: render_file_browser(files, breadcrumbs)
```

<details>
<summary><b>Canonical PlantUML: UC-02a Sequence Diagram (Native BCE Lifeline Icons)</b></summary>

```plantuml
@startuml
autonumber
skinparam responseMessageBelowArrow true

actor "Researcher" as Researcher
boundary "Drive File Browser\n(SCR-02)" as Browser
control "DriveService" as DriveSvc
control "DriveTokenService" as TokenSvc
entity "OAuthCredential" as Credential

Researcher -> Browser : search_files(folder_id, search_query)
Browser -> DriveSvc : list_files(researcher_id, folder_id, search_query)
DriveSvc -> TokenSvc : get_valid_access_token(researcher_id)
TokenSvc -> Credential : load_credentials(researcher_id)
Credential --> TokenSvc : credential_record
alt Token expired
    TokenSvc -> TokenSvc : refresh_access_token(refresh_token)
    TokenSvc -> Credential : update_token_expiration(new_token, expiry)
    Credential --> TokenSvc : updated
end
TokenSvc --> DriveSvc : valid_access_token
DriveSvc -> DriveSvc : fetch_drive_api(valid_access_token, query)
DriveSvc --> Browser : deliver_file_list(files, next_page_token)
Browser --> Researcher : render_file_browser(files, breadcrumbs)
@enduml
```
</details>

### Sequence Diagram: UC-02: Import and Extract Document (Happy Path)

```mermaid
sequenceDiagram
    autonumber
    actor Researcher as Actor: Researcher
    participant ConfirmUI as Boundary: Import Confirmation Modal (SCR-03)
    participant DocSvc as Controller: DocumentService
    participant Document as Entity: Document
    participant Worker as Controller: ImportWorkerTask
    participant TokenSvc as Controller: DriveTokenService
    participant Credential as Entity: OAuthCredential
    participant Extractor as Controller: TextExtractor
    participant ExtractedText as Entity: ExtractedText
    participant ExtractedPage as Entity: ExtractedPage
    participant ProgressUI as Boundary: Import Progress View (SCR-04)

    Researcher->>ConfirmUI: confirm_import(drive_file_id, file_name, file_type)
    ConfirmUI->>DocSvc: import_document(drive_file_id, researcher_id)
    DocSvc->>Document: find_by_drive_id(drive_file_id, researcher_id)
    Document-->>DocSvc: none_found
    DocSvc->>Document: create_document_record(drive_file_id, status_importing)
    Document-->>DocSvc: document_record
    DocSvc->>Worker: dispatch_import_job(document_id)
    DocSvc-->>ConfirmUI: return_import_ticket(document_id)
    ConfirmUI->>ProgressUI: display_import_progress(document_id)
    ProgressUI-->>Researcher: render_progress_view()

    Note over Worker: Background Execution
    Worker->>TokenSvc: get_valid_access_token(researcher_id)
    TokenSvc->>Credential: load_credentials(researcher_id)
    Credential-->>TokenSvc: credential_record
    TokenSvc-->>Worker: access_token
    Worker->>Document: update_status(status_downloading)
    Worker->>Worker: download_file_stream(access_token, drive_file_id)
    Worker->>Document: update_status(status_extracting)
    Worker->>Extractor: extract_text(file_bytes, file_type)
    Extractor-->>Worker: extraction_result(pages, full_text)
    Worker->>ExtractedText: persist_extracted_text(document_id, full_text)
    ExtractedText-->>Worker: text_record
    Worker->>ExtractedPage: persist_pages(text_record_id, pages)
    ExtractedPage-->>Worker: pages_recorded
    Worker->>Document: mark_extracted(status_extracted, checksum)
    Worker->>Worker: notify_indexing_pipeline(document_id)

    ProgressUI->>DocSvc: query_status(document_id)
    DocSvc->>Document: get_current_status(document_id)
    Document-->>DocSvc: document_status
    DocSvc-->>ProgressUI: update_progress_state(status_extracted)
    ProgressUI-->>Researcher: render_extraction_completed()
```

<details>
<summary><b>Canonical PlantUML: UC-02 Sequence Diagram (Happy Path) (Native BCE Lifeline Icons)</b></summary>

```plantuml
@startuml
autonumber
skinparam responseMessageBelowArrow true

actor "Researcher" as Researcher
boundary "Import Confirmation Modal\n(SCR-03)" as ConfirmUI
control "DocumentService" as DocSvc
entity "Document" as Document
control "ImportWorkerTask" as Worker
control "DriveTokenService" as TokenSvc
entity "OAuthCredential" as Credential
control "TextExtractor" as Extractor
entity "ExtractedText" as ExtractedText
entity "ExtractedPage" as ExtractedPage
boundary "Import Progress View\n(SCR-04)" as ProgressUI

Researcher -> ConfirmUI : confirm_import(drive_file_id, file_name, file_type)
ConfirmUI -> DocSvc : import_document(drive_file_id, researcher_id)
DocSvc -> Document : find_by_drive_id(drive_file_id, researcher_id)
Document --> DocSvc : none_found
DocSvc -> Document : create_document_record(drive_file_id, status_importing)
Document --> DocSvc : document_record
DocSvc -> Worker : dispatch_import_job(document_id)
DocSvc --> ConfirmUI : return_import_ticket(document_id)
ConfirmUI -> ProgressUI : display_import_progress(document_id)
ProgressUI --> Researcher : render_progress_view()

note over Worker : Background Execution
Worker -> TokenSvc : get_valid_access_token(researcher_id)
TokenSvc -> Credential : load_credentials(researcher_id)
Credential --> TokenSvc : credential_record
TokenSvc --> Worker : access_token
Worker -> Document : update_status(status_downloading)
Worker -> Worker : download_file_stream(access_token, drive_file_id)
Worker -> Document : update_status(status_extracting)
Worker -> Extractor : extract_text(file_bytes, file_type)
Extractor --> Worker : extraction_result(pages, full_text)
Worker -> ExtractedText : persist_extracted_text(document_id, full_text)
ExtractedText --> Worker : text_record
Worker -> ExtractedPage : persist_pages(text_record_id, pages)
ExtractedPage --> Worker : pages_recorded
Worker -> Document : mark_extracted(status_extracted, checksum)
Worker -> Worker : notify_indexing_pipeline(document_id)

ProgressUI -> DocSvc : query_status(document_id)
DocSvc -> Document : get_current_status(document_id)
Document --> DocSvc : document_status
DocSvc --> ProgressUI : update_progress_state(status_extracted)
ProgressUI --> Researcher : render_extraction_completed()
@enduml
```
</details>

### Sequence Diagram: UC-02 — Import Failure (Scanned PDF)

```mermaid
sequenceDiagram
    autonumber
    participant Worker as Controller: ImportWorkerTask
    participant Extractor as Controller: TextExtractor
    participant Document as Entity: Document

    Worker->>Extractor: extract_text(file_bytes, "pdf")
    Extractor->>Extractor: verify_text_content(file_bytes)
    Extractor-->>Worker: raise_scanned_pdf_error("PDF contains no extractable text")
    Worker->>Document: mark_failed(status_failed, error_message)
    Document-->>Worker: status_updated
```

<details>
<summary><b>Canonical PlantUML: UC-02 Sequence Diagram (Failure Path)</b></summary>

```plantuml
@startuml
autonumber
skinparam responseMessageBelowArrow true

control "ImportWorkerTask" as Worker
control "TextExtractor" as Extractor
entity "Document" as Document

Worker -> Extractor : extract_text(file_bytes, "pdf")
Extractor -> Extractor : verify_text_content(file_bytes)
Extractor --> Worker : raise_scanned_pdf_error("PDF contains no extractable text")
Worker -> Document : mark_failed(status_failed, error_message)
Document --> Worker : status_updated
@enduml
```
</details>

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
