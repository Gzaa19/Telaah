# Technical Plan: UC-03 Document Indexing and Local Embedding – ICONIX Process

**Branch**: `003-document-indexing-embedding` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification dari `/specs/003-document-indexing-embedding/spec.md`
**Methodology Reference**: Doug Rosenberg & Matt Stephens, *Use Case Driven Object Modeling with UML*

---

## 1. System Architecture & Technical Context

### Stack Mapping

| Layer | Technology | Role dalam UC-03 |
|---|---|---|
| **Frontend** | Next.js App Router + TypeScript + Bun | Status polling, SCR-05/06/07, Retry/Re-index UI |
| **Backend API** | FastAPI (Python 3.12) + Pydantic v2 | REST endpoints indexing, spawn background task |
| **Background Worker** | `FastAPI BackgroundTasks` + `asyncio.to_thread()` | Pipeline indexing in-process; CPU-bound embedding di thread pool |
| **ORM** | SQLModel + SQLAlchemy (async) | Model `DocumentIndexVersion`, `DocumentChunk`, `IndexingJob` |
| **Primary DB** | PostgreSQL 16 | Metadata, status, chunk text, relasi, **status job** |
| **Vector Extension** | pgvector (HNSW) | `VECTOR(768)` kolom cosine similarity |
| **Embedding Model** | `intfloat/multilingual-e5-base` (Hugging Face) | Local inference, dimensi 768 |
| **LangChain** | Hybrid (splitter + embedding wrapper) | `RecursiveCharacterTextSplitter`, `HuggingFaceEmbeddings` |

> [!NOTE] **Ponytail Engineering (Prinsip 6)** — Redis dihilangkan karena sistem ini berjalan single-instance lokal untuk kebutuhan TA. `FastAPI BackgroundTasks` cukup dan tidak membutuhkan infra tambahan. Trade-off didokumentasikan di [research.md](./research.md#r-01-background-processing).

### Architectural Pattern

```
Router (Boundary) → Service (Controller) → Repository (Controller) → Model/DB (Entity)
```

- **UC-03 dilarang keras** menggunakan Gemini Text Embedding API atau external embedding service.
- **UC-03 tidak mengimplementasi ulang** Google OAuth, Drive API, atau logika UC-02. Hanya mengkonsumsi hasil UC-02.
- **UC-03 tidak menyentuh** outline paper, LLM generatif, citation validation, atau rendering LaTeX.

### Module Boundaries

```
backend/
├── src/
│   ├── indexing/              ← Module utama UC-03
│   │   ├── router.py          ← Boundary: REST API endpoints
│   │   ├── service.py         ← Controller: DocumentIndexingService
│   │   ├── repository.py      ← Controller: IndexingRepository + ChunkMetadataRepository
│   │   ├── models.py          ← Entity: DocumentIndexVersion, DocumentChunk, IndexingJob
│   │   ├── schemas.py         ← Pydantic DTOs request/response
│   │   ├── worker.py          ← Background pipeline: run_indexing_pipeline() (asyncio + to_thread)
│   │   ├── embedding.py       ← LocalEmbeddingProvider (singleton HuggingFaceEmbeddings)
│   │   ├── chunker.py         ← ChunkingService (LangChain RecursiveCharacterTextSplitter)
│   │   ├── cleaner.py         ← TextCleaningService
│   │   ├── fingerprint.py     ← ChecksumService (deterministic fingerprint)
│   │   └── exceptions.py      ← IndexingError, DimensionMismatchError, dll.
│   ├── documents/             ← Entity UC-02 (read-only dari UC-03)
│   └── shared/
│       ├── access_control.py  ← researcher_id guard
│       └── db.py              ← SQLAlchemy async session
frontend/
└── src/
    ├── components/features/indexing/
    │   ├── IndexingStatusBadge.tsx
    │   ├── IndexingDetailPanel.tsx
    │   └── ReindexConfirmModal.tsx    ← SCR-07
    └── app/(dashboard)/library/
        └── page.tsx                  ← SCR-05 extended
```

---

## 2. Updated Domain Model

```mermaid
classDiagram
    class DocumentIndexVersion {
        +UUID id
        +UUID document_id
        +UUID researcher_id
        +String status
        +String model_name
        +String model_version
        +String model_commit_hash
        +Integer embedding_dimension
        +Integer chunk_size
        +Integer chunk_overlap
        +String preprocessing_version
        +String source_checksum
        +String index_fingerprint
        +Boolean is_active
        +Integer total_chunks
        +String failure_reason
        +DateTime started_at
        +DateTime completed_at
        +DateTime created_at
    }

    class DocumentChunk {
        +UUID id
        +UUID document_id
        +UUID researcher_id
        +UUID index_version_id
        +Integer chunk_index
        +Text chunk_text
        +Vector embedding
        +Integer page_number
        +String section_name
        +JSONB source_metadata
        +DateTime created_at
    }

    class IndexingJob {
        +UUID id
        +UUID document_id
        +UUID researcher_id
        +UUID index_version_id
        +String status
        +String current_stage
        +String failure_reason
        +Integer retry_count
        +Integer max_retries
        +DateTime enqueued_at
        +DateTime started_at
        +DateTime completed_at
        +DateTime heartbeat_at
    }

    class EmbeddingModelMetadata {
        +UUID id
        +String model_name
        +String model_version
        +String model_commit_hash
        +Integer embedding_dimension
        +String hf_cache_path
        +DateTime loaded_at
    }

    class ChunkingConfiguration {
        +UUID id
        +Integer chunk_size
        +Integer chunk_overlap
        +String splitter_type
        +String preprocessing_version
        +DateTime created_at
    }

    class Document {
        +UUID id
        +UUID researcher_id
        +String import_status
        +String source_checksum
    }

    Document "1" --> "0..*" DocumentIndexVersion : tracked_by
    DocumentIndexVersion "1" --> "0..*" DocumentChunk : produces
    Document "1" --> "0..*" DocumentChunk : sourced_from
    IndexingJob "1" --> "1" DocumentIndexVersion : drives
```

### Database Schema Notes

- **`document_index_versions`**: `is_active = TRUE` hanya pada satu record per `document_id` pada satu waktu; record lama di-set `is_active = FALSE` (status `archived`).
- **`document_chunks`**: Kolom `embedding VECTOR(768)` — HNSW index dengan `vector_cosine_ops`.
- **`index_fingerprint`**: Hash deterministik dari `source_checksum + model_name + model_version + embedding_dimension + chunk_size + chunk_overlap + preprocessing_version`.
- **`indexing_jobs`**: `heartbeat_at` diperbarui setiap 30 detik oleh background task; job dengan `heartbeat_at` lebih dari 5 menit tanpa completion dan status non-terminal dianggap stale — dapat di-retry manual oleh peneliti.

---

## 3. ICONIX Robustness Analysis

### Robustness Diagram: UC-03 Document Indexing and Local Embedding

```mermaid
flowchart TD
    classDef actor fill:#1e293b,stroke:#64748b,stroke-width:2px,color:#f8fafc
    classDef boundary fill:#0c4a6e,stroke:#0284c7,stroke-width:2px,color:#f0f9ff
    classDef controller fill:#451a03,stroke:#d97706,stroke-width:2px,color:#fef3c7
    classDef entity fill:#064e3b,stroke:#059669,stroke-width:2px,color:#ecfdf5

    UC02[/"Upstream: UC-02 Event (document_id)"/]:::actor
    RESEARCHER[/"Actor: Peneliti"/]:::actor

    B_EVENT[/"Boundary: FastAPI BackgroundTasks (in-process)"/]:::boundary
    B_API_TRIGGER[/"Boundary: POST /api/indexing/documents/{id}"/]:::boundary
    B_API_STATUS[/"Boundary: GET /api/indexing/jobs/{job_id}"/]:::boundary
    B_API_REINDEX[/"Boundary: POST /api/documents/{id}/reindex"/]:::boundary
    B_UI_LIBRARY[/"Boundary: SCR-05 Library View"/]:::boundary
    B_UI_DETAIL[/"Boundary: SCR-06 Indexing Detail View"/]:::boundary
    B_UI_CONFIRM[/"Boundary: SCR-07 Re-index Confirmation Modal"/]:::boundary

    C1(["Controller: Validate Document Access & Status"]):::controller
    C2(["Controller: Check Duplicate Fingerprint"]):::controller
    C3(["Controller: Create IndexingJob & Spawn BackgroundTask"]):::controller
    C4(["Controller: Load & Clean Extracted Text"]):::controller
    C5(["Controller: Chunk Text & Preserve Metadata"]):::controller
    C6(["Controller: Generate Local Embeddings (Batch via to_thread)"]):::controller
    C7(["Controller: Validate Embedding Dimensions"]):::controller
    C8(["Controller: Store Chunks & Index Version (Transactional)"]):::controller
    C9(["Controller: Update Status & Mark Indexed"]):::controller
    C10(["Controller: Handle Failure & Log Safe Error"]):::controller
    C11(["Controller: Archive Old Index Version"]):::controller
    C12(["Controller: Execute Similarity Search (Verification)"]):::controller

    E_DOC[("Entity: Document")]:::entity
    E_EXTRACTED[("Entity: ExtractedText + ExtractedPage")]:::entity
    E_INDEX_VER[("Entity: DocumentIndexVersion")]:::entity
    E_CHUNK[("Entity: DocumentChunk + VECTOR")]:::entity
    E_JOB[("Entity: IndexingJob")]:::entity

    UC02 -->|"trigger: document_id (extracted)"| B_API_TRIGGER
    B_API_TRIGGER -->|"dispatch"| C1
    C1 -->|"read"| E_DOC
    C1 -->|"read"| E_EXTRACTED
    C1 -->|"pass"| C2
    C2 -->|"read fingerprint"| E_INDEX_VER
    C2 -->|"no duplicate"| C3
    C3 -->|"write job"| E_JOB
    C3 -->|"write index_version queued"| E_INDEX_VER
    C3 -->|"background_tasks.add_task()"| B_EVENT
    B_EVENT -->|"run async pipeline"| C4
    C4 -->|"read"| E_EXTRACTED
    C4 -->|"clean text → pass"| C5
    C5 -->|"chunks with metadata"| C6
    C6 -->|"embeddings batch"| C7
    C7 -->|"valid 768-dim"| C8
    C8 -->|"write transactional"| E_CHUNK
    C8 -->|"write"| E_INDEX_VER
    C8 -->|"pass"| C9
    C9 -->|"update status indexed"| E_INDEX_VER
    C9 -->|"update job"| E_JOB

    C7 -->|"dim mismatch"| C10
    C6 -->|"model error"| C10
    C10 -->|"write failure_reason"| E_JOB
    C10 -->|"write status failed"| E_INDEX_VER

    RESEARCHER -->|"klik Re-index"| B_UI_CONFIRM
    B_UI_CONFIRM -->|"konfirmasi"| B_API_REINDEX
    B_API_REINDEX -->|"dispatch"| C11
    C11 -->|"set is_active=false"| E_INDEX_VER
    C11 -->|"create new version"| C3

    RESEARCHER -->|"memantau status"| B_UI_LIBRARY
    B_UI_LIBRARY -->|"poll"| B_API_STATUS
    B_API_STATUS -->|"read"| C_STATUS(["Controller: Query Job Status & Summary"]):::controller
    C_STATUS -->|"read"| E_JOB

    RESEARCHER -->|"klik verify search"| B_UI_DETAIL
    B_UI_DETAIL -->|"call"| B_API_TRIGGER
    B_API_TRIGGER -->|"dispatch"| C12
    C12 -->|"cosine query"| E_CHUNK
```

### BCE Inventory & Method Allocation

| BCE Type | Element | Responsibility → Implementation |
|---|---|---|
| **Boundary** | `POST /api/indexing/documents/{document_id}` | `indexing/router.py` → `trigger_indexing()` |
| **Boundary** | `GET /api/indexing/jobs/{job_id}` | `indexing/router.py` → `get_job_status()` |
| **Boundary** | `GET /api/documents/{document_id}/index-status` | `indexing/router.py` → `get_index_status()` |
| **Boundary** | `POST /api/documents/{document_id}/reindex` | `indexing/router.py` → `request_reindex()` |
| **Boundary** | `GET /api/documents/{document_id}/index-summary` | `indexing/router.py` → `get_index_summary()` |
| **Boundary** | `GET /api/search/similarity` | `indexing/router.py` → `similarity_search_verify()` |
| **Boundary** | `SCR-05 Library View` | `frontend/.../library/page.tsx` |
| **Boundary** | `SCR-06 Indexing Detail` | `frontend/.../IndexingDetailPanel.tsx` |
| **Boundary** | `SCR-07 Re-index Confirmation` | `frontend/.../ReindexConfirmModal.tsx` |
| **Boundary** | `FastAPI BackgroundTasks (in-process)` | `indexing/worker.py` → `run_indexing_pipeline()` — spawned oleh router |
| **Controller** | Validate Document Access & Status | `IndexingService.validate_document_access()` |
| **Controller** | Check Duplicate Fingerprint | `IndexingService.check_duplicate_fingerprint()` |
| **Controller** | Create IndexingJob & Spawn BackgroundTask | `IndexingService.create_job_and_spawn()` |
| **Controller** | Load & Clean Extracted Text | `TextCleaningService.clean()` |
| **Controller** | Chunk Text & Preserve Metadata | `ChunkingService.chunk_with_metadata()` |
| **Controller** | Generate Local Embeddings (Batch via to_thread) | `LocalEmbeddingProvider.embed_batch()` |
| **Controller** | Validate Embedding Dimensions | `LocalEmbeddingProvider.validate_dimensions()` |
| **Controller** | Store Chunks & Index Version (Transactional) | `IndexingRepository.save_chunks_transactional()` |
| **Controller** | Update Status & Mark Indexed | `IndexingService.finalize()` |
| **Controller** | Handle Failure & Log Safe Error | `IndexingService.handle_failure()` |
| **Controller** | Archive Old Index Version | `IndexingRepository.archive_index_version()` |
| **Controller** | Execute Similarity Search (Verification) | `IndexingService.similarity_search()` |
| **Controller** | Query Job Status & Summary | `IndexingRepository.get_job_with_summary()` |
| **Entity** | `Document` | `documents/models.py` → `Document` (read-only dari UC-03) |
| **Entity** | `ExtractedText` / `ExtractedPage` | `documents/models.py` (UC-02 output, read-only) |
| **Entity** | `DocumentIndexVersion` | `indexing/models.py` |
| **Entity** | `DocumentChunk` | `indexing/models.py` |
| **Entity** | `IndexingJob` | `indexing/models.py` |

### BCE Rule Compliance Audit

- [x] **Rule 1**: Peneliti dan UC-02 hanya berinteraksi dengan Boundary (REST API, FastAPI BackgroundTasks, UI).
- [x] **Rule 2**: Semua Boundary (router, BackgroundTasks, UI) hanya memanggil Controller — tidak menyentuh Entity langsung.
- [x] **Rule 3**: Entity (`DocumentChunk`, `DocumentIndexVersion`, `IndexingJob`) hanya diakses oleh Controller/Repository.
- [x] **Rule 4**: Controller tidak berinteraksi langsung ke Actor; hasil dikembalikan melalui Boundary.
- [x] **Zero Direct Boundary-to-Entity Links**: Tidak ada link langsung dari router/UI ke database model.

---

## 4. Preliminary Design Review (PDR) Checkpoint Gate

| PDR Criteria | Status | Evidence |
|---|:---:|---|
| **1. Use Case Coverage** | ✅ PASS | Semua 8 Basic Course steps UC-03 tercakup di robustness diagram (C1–C9) |
| **2. Alternate Courses Handled** | ✅ PASS | Alt-1 (C1), Alt-2 (C4), Alt-3 (C6→C10), Alt-4 (C7→C10), Alt-5 (C2), Alt-6 (C11→C3), Alt-7 (C8→C10), Alt-8 (heartbeat stale), Alt-9 (C1) |
| **3. Domain Model Updated** | ✅ PASS | `DocumentIndexVersion`, `DocumentChunk`, `IndexingJob`, `EmbeddingModelMetadata`, `ChunkingConfiguration` ditambahkan |
| **4. Strict BCE Adherence** | ✅ PASS | Tidak ada link Boundary→Entity |

*GATE STATUS*: **✅ APPROVED TO PROCEED TO DETAILED DESIGN**

---

## 5. Detailed Design: Sequence Diagrams

### Sequence Diagram 1: UC-03 Sunny Day — Full Indexing Pipeline

```mermaid
sequenceDiagram
    autonumber
    participant UC02 as UC-02 Trigger
    participant Router as POST /api/indexing/documents/{id}
    participant BgTask as FastAPI BackgroundTasks
    participant IService as IndexingService
    participant Cleaner as TextCleaningService
    participant Chunker as ChunkingService
    participant Embedder as LocalEmbeddingProvider
    participant Repo as IndexingRepository
    participant DB as PostgreSQL + pgvector

    UC02->>Router: POST /api/indexing/documents/{doc_id} (Bearer token)
    Router->>IService: validate_document_access(doc_id, researcher_id)
    IService->>DB: SELECT document WHERE id=doc_id AND researcher_id=...
    DB-->>IService: Document(status=extracted)
    IService->>DB: compute fingerprint, check duplicate
    DB-->>IService: no duplicate found
    IService->>DB: INSERT IndexingJob(status=queued)
    IService->>DB: INSERT DocumentIndexVersion(status=queued)
    DB-->>IService: index_version_id
    IService->>Router: IndexingJob
    Router->>BgTask: background_tasks.add_task(run_indexing_pipeline, job_id, ...)
    Router-->>UC02: 202 Accepted {job_id, index_version_id}

    Note over BgTask,DB: Pipeline berjalan in-process setelah response dikirim

    BgTask->>IService: update_status(job_id, "cleaning")
    IService->>DB: UPDATE indexing_jobs SET status=cleaning, heartbeat_at=now()
    BgTask->>Cleaner: clean(extracted_text)
    Cleaner-->>BgTask: cleaned_text

    BgTask->>IService: update_status(job_id, "chunking")
    BgTask->>Chunker: chunk_with_metadata(cleaned_text, pages, sections)
    Chunker-->>BgTask: List[ChunkWithMeta]

    BgTask->>IService: update_status(job_id, "embedding")
    BgTask->>Embedder: embed_batch(["passage: " + chunk for chunk in chunks])
    Note over Embedder: asyncio.to_thread() — CPU-bound, tidak block event loop
    Embedder-->>BgTask: List[Vector(768)]
    BgTask->>Embedder: validate_dimensions(vectors, expected=768)
    Embedder-->>BgTask: OK

    BgTask->>IService: update_status(job_id, "storing")
    BgTask->>Repo: save_chunks_transactional(chunks, vectors, index_version_id)
    Repo->>DB: BEGIN TRANSACTION
    Repo->>DB: INSERT INTO document_chunks (batch)
    Repo->>DB: UPDATE document_index_versions SET status=indexed, total_chunks=N
    Repo->>DB: COMMIT
    DB-->>Repo: success
    Repo-->>BgTask: saved

    BgTask->>IService: finalize(job_id, index_version_id)
    IService->>DB: UPDATE indexing_jobs SET status=completed, completed_at=now()
```


### Sequence Diagram 2: UC-03a — Monitor Status (Polling)

```mermaid
sequenceDiagram
    autonumber
    actor Researcher as Peneliti
    participant UI as SCR-05/06 (Next.js)
    participant Router as GET /api/documents/{id}/index-status
    participant Repo as IndexingRepository
    participant DB as PostgreSQL

    loop Every 3-5 seconds while status not terminal
        Researcher->>UI: halaman Library terbuka
        UI->>Router: GET /api/documents/{doc_id}/index-status (Bearer token)
        Router->>Repo: get_job_with_summary(doc_id, researcher_id)
        Repo->>DB: SELECT indexing_jobs JOIN document_index_versions WHERE doc_id=... AND researcher_id=...
        DB-->>Repo: JobSummary(status, current_stage, total_chunks, model_name, completed_at)
        Repo-->>Router: IndexStatusResponseDTO
        Router-->>UI: 200 OK {status, stage, chunks, model, completed_at}
        UI-->>Researcher: Render badge status + progress
    end
```

### Sequence Diagram 3: UC-03c — Re-index (Archive + New Pipeline)

```mermaid
sequenceDiagram
    autonumber
    actor Researcher as Peneliti
    participant UI as SCR-07 Modal
    participant Router as POST /api/documents/{id}/reindex
    participant IService as IndexingService
    participant Repo as IndexingRepository
    participant BgTask as FastAPI BackgroundTasks
    participant DB as PostgreSQL

    Researcher->>UI: klik "Re-index Dokumen"
    UI-->>Researcher: Tampilkan SCR-07 konfirmasi
    Researcher->>UI: klik "Ya, Re-index"
    UI->>Router: POST /api/documents/{doc_id}/reindex (Bearer token)
    Router->>IService: request_reindex(doc_id, researcher_id)
    IService->>DB: SELECT active DocumentIndexVersion WHERE doc_id=...
    DB-->>IService: active_version_id
    IService->>Repo: archive_index_version(active_version_id)
    Repo->>DB: UPDATE document_index_versions SET is_active=FALSE, status=archived
    DB-->>Repo: OK
    IService->>DB: INSERT DocumentIndexVersion(status=queued, is_active=TRUE)
    IService->>DB: INSERT IndexingJob(status=queued)
    DB-->>IService: new_job_id
    IService->>Router: new IndexingJob
    Router->>BgTask: background_tasks.add_task(run_indexing_pipeline, new_job_id, ...)
    Router-->>UI: 202 Accepted {job_id, new_index_version_id, archived_index_version_id}
    UI-->>Researcher: Navigasi ke SCR-05, status = queued
```


---

## 6. Detailed Design: Static Class Model

```mermaid
classDiagram
    class IndexingRouter {
        +trigger_indexing(doc_id: UUID, researcher: ResearcherDep) JobResponseDTO
        +get_job_status(job_id: UUID, researcher: ResearcherDep) JobStatusDTO
        +get_index_status(doc_id: UUID, researcher: ResearcherDep) IndexStatusDTO
        +request_reindex(doc_id: UUID, researcher: ResearcherDep) ReindexResponseDTO
        +get_index_summary(doc_id: UUID, researcher: ResearcherDep) IndexSummaryDTO
        +similarity_search_verify(query: str, doc_id: UUID, researcher: ResearcherDep) SearchResultDTO
    }

    class DocumentIndexingService {
        -repo: IndexingRepository
        -chunk_repo: ChunkMetadataRepository
        -embedder: LocalEmbeddingProvider
        -chunker: ChunkingService
        -cleaner: TextCleaningService
        +validate_document_access(doc_id, researcher_id) Document
        +check_duplicate_fingerprint(doc_id, fingerprint) bool
        +create_and_enqueue_job(doc_id, researcher_id) IndexingJob
        +update_status(job_id, stage, heartbeat) void
        +finalize_and_notify(index_version_id) void
        +handle_failure(job_id, error) void
        +request_reindex(doc_id, researcher_id) IndexingJob
        +similarity_search(query, doc_id, researcher_id, top_k) List~SearchResult~
    }

    class IndexingRepository {
        -db: AsyncSession
        +get_document_with_access(doc_id, researcher_id) Document
        +get_extracted_text(doc_id) ExtractedText
        +get_extracted_pages(doc_id) List~ExtractedPage~
        +find_by_fingerprint(fingerprint) DocumentIndexVersion|None
        +create_index_version(dto) DocumentIndexVersion
        +create_indexing_job(dto) IndexingJob
        +update_job_status(job_id, status, stage, heartbeat) void
        +save_chunks_transactional(chunks: List~ChunkDTO~, index_version_id) void
        +archive_index_version(version_id) void
        +get_job_with_summary(doc_id, researcher_id) JobSummaryDTO
        +get_stale_jobs(threshold_minutes) List~IndexingJob~
    }

    class ChunkMetadataRepository {
        -db: AsyncSession
        +similarity_search(query_vector, researcher_id, doc_id, top_k) List~SearchResult~
        +get_chunk_count(index_version_id) int
        +delete_chunks_by_version(version_id) void
    }

    class LocalEmbeddingProvider {
        -_instance: HuggingFaceEmbeddings
        -model_name: str
        -model_version: str
        -embedding_dim: int
        +get_instance() HuggingFaceEmbeddings
        +embed_batch(texts: List~str~, batch_size: int) List~Vector~
        +validate_dimensions(vectors, expected: int) void
        +get_model_metadata() EmbeddingModelMetadata
    }

    class ChunkingService {
        -splitter: RecursiveCharacterTextSplitter
        -chunk_size: int
        -chunk_overlap: int
        +chunk_with_metadata(text, pages, sections) List~ChunkWithMeta~
        +get_configuration() ChunkingConfiguration
    }

    class TextCleaningService {
        +clean(raw_text: str) str
        +remove_control_chars(text: str) str
        +normalize_whitespace(text: str) str
        +strip_extraction_artifacts(text: str) str
    }

    class ChecksumService {
        +compute_document_checksum(text: str) str
        +compute_index_fingerprint(checksum, model_name, model_version, dim, chunk_size, chunk_overlap, preproc_version) str
    }

    IndexingRouter ..> DocumentIndexingService : invokes
    DocumentIndexingService --> IndexingRepository : delegates
    DocumentIndexingService --> ChunkMetadataRepository : delegates
    DocumentIndexingService --> LocalEmbeddingProvider : uses
    DocumentIndexingService --> ChunkingService : uses
    DocumentIndexingService --> TextCleaningService : uses
    DocumentIndexingService --> ChecksumService : uses
```

### Concrete File & Method Signatures

**Boundaries (Router)**
- `backend/src/indexing/router.py`
  - `POST /api/indexing/documents/{document_id}` → `trigger_indexing(...) → JobResponseDTO`
  - `GET /api/indexing/jobs/{job_id}` → `get_job_status(...) → JobStatusDTO`
  - `GET /api/documents/{document_id}/index-status` → `get_index_status(...) → IndexStatusDTO`
  - `POST /api/documents/{document_id}/reindex` → `request_reindex(...) → ReindexResponseDTO`
  - `GET /api/documents/{document_id}/index-summary` → `get_index_summary(...) → IndexSummaryDTO`
  - `GET /api/search/similarity` → `similarity_search_verify(...) → SearchResultDTO`

**Controllers (Service)**
- `backend/src/indexing/service.py` → `class DocumentIndexingService`
- `backend/src/indexing/repository.py` → `class IndexingRepository`, `class ChunkMetadataRepository`
- `backend/src/indexing/embedding.py` → `class LocalEmbeddingProvider` (singleton)
- `backend/src/indexing/chunker.py` → `class ChunkingService`
- `backend/src/indexing/cleaner.py` → `class TextCleaningService`
- `backend/src/indexing/fingerprint.py` → `class ChecksumService`

**Workers**
- `backend/src/indexing/worker.py`
  - `async def run_indexing_pipeline(job_id: UUID, db_session_factory: Callable) → None`
  - Dipanggil via `background_tasks.add_task(run_indexing_pipeline, job_id, ...)` dari router
  - Embedding step menggunakan `await asyncio.to_thread(embedder.embed_documents, texts)` agar tidak memblok event loop

**Entities**
- `backend/src/indexing/models.py`
  - `class DocumentIndexVersion(SQLModel, table=True)`
  - `class DocumentChunk(SQLModel, table=True)` — dengan kolom `embedding: Vector(768)`
  - `class IndexingJob(SQLModel, table=True)`

---

## 7. Critical Design Review (CDR) Checkpoint Gate

| CDR Criteria | Status | Evidence |
|---|:---:|---|
| **1. Method Allocation** | ✅ PASS | Semua pesan di sequence diagram dipetakan ke method pada Section 6 |
| **2. Class Signatures** | ✅ PASS | Parameter types, return types, dan exception types terdefinisi |
| **3. Test Plan Feasibility** | ✅ PASS | Setiap controller method unit-testable; embedding provider dapat di-mock; BackgroundTasks dapat diuji via `TestClient` dengan `app.dependency_overrides` |
| **4. PDR Traceability** | ✅ PASS | Semua controller dari robustness diagram (C1–C12) ada di class model |

*GATE STATUS*: **✅ APPROVED TO PROCEED TO IMPLEMENTATION**

---

## 8. Constitution Check

| Prinsip Constitution | Compliance Status | Catatan |
|---|:---:|---|
| **P1: Scientific Structure Integrity** | ✅ N/A | UC-03 tidak generate paper — hanya indexing |
| **P2: Secure Auth & Data Access** | ✅ PASS | `researcher_id` divalidasi setiap query; token tidak disimpan plaintext |
| **P3: Retrieval Accuracy (RAG)** | ✅ PASS | pgvector HNSW, traceable ke doc+page, anti-hallucination via `FR-010` |
| **P4: AI-Assisted but Reviewable** | ✅ PASS | Spec Kit flow diikuti; code sensitif di-review |
| **P5: Performance & Runtime** | ✅ PASS | FastAPI backend, Bun frontend, model loaded sekali |
| **P6: Ponytail Engineering** | ✅ PASS | Hybrid LangChain (splitter+embedder only), YAGNI, minimal abstraksi |
| **P7: Anti-Slop Frontend** | ✅ PASS | Next.js App Router, Tailwind, shadcn/ui, `@phosphor-icons/react` |
| **No Gemini Embedding** | ✅ ENFORCED | FR-010 + SC-003 + test assertion wajib |
| **No Drive/OAuth in UC-03** | ✅ ENFORCED | UC-03 tidak mengakses Drive API |

---

## 9. Version Control & Git Milestone Plan

| Milestone | Scope | Commit | Verifikasi |
|---|---|---|---|
| **M1: Foundation** | Migrations, models, Alembic | `feat(core): setup UC-03 DB schema — document_index_versions, document_chunks, indexing_jobs` | Migration up/down green |
| **M2: Core Pipeline** | Cleaner, chunker, embedding provider, indexing service | `feat(UC-03): implement text cleaning, chunking, local embedding (multilingual-e5-base)` | Unit tests green |
| **M3: Worker & Pipeline** | BackgroundTasks, asyncio.to_thread(), status machine | `feat(UC-03): implement FastAPI BackgroundTasks indexing pipeline with status tracking` | Integration test green |
| **M4: API Layer** | FastAPI router, endpoints, DTOs | `feat(UC-03): implement indexing REST API endpoints with researcher isolation` | API contract tests green |
| **M5: Retry & Re-index** | Retry logic, archive, re-index flow, stale detector | `feat(UC-03b/c): implement retry, re-index, and archived version management` | Alt-6/7/8 tests green |
| **M6: Similarity Search** | Verification search endpoint | `feat(UC-03): implement similarity search verification endpoint` | SC-006/007 tests green |
| **M7: Frontend** | SCR-05/06/07 components, polling | `feat(UC-03): implement indexing status UI — library column, detail panel, reindex modal` | E2E polling test green |
| **M8: Release** | Full test suite, observability, docs | `chore(release): complete UC-03 verification and documentation` | All tests green |

---

## 9. Observability Plan

### Logging

| Event | Level | Fields | Dilarang |
|-------|-------|--------|----------|
| Job enqueued | INFO | `job_id`, `doc_id`, `researcher_id` | ❌ Isi dokumen, token |
| Stage transition | INFO | `job_id`, `stage`, `timestamp` | ❌ `chunk_text`, stack trace internal |
| Embedding batch | DEBUG | `batch_size`, `duration_ms` | ❌ Vektor raw |
| Job failed | ERROR | `job_id`, `error_type`, `safe_message` | ❌ Stack trace ke researcher |
| Heartbeat update | DEBUG | `job_id`, `heartbeat_at` | — |

### Metrics (Prometheus format)

```
indexing_job_duration_seconds{stage="cleaning|chunking|embedding|storing"} histogram
embedding_throughput_chunks_per_second gauge
total_chunks_indexed_total counter
indexing_failure_total{error_type="model_load|dim_mismatch|db_error"} counter
indexing_retry_total counter
similarity_search_latency_seconds histogram
```

---

## 10. Design Artifacts Reference

| Artifact | Path | Description |
|----------|------|-------------|
| **Spec** | [spec.md](./spec.md) | Use case, requirements, acceptance criteria |
| **Research** | [research.md](./research.md) | Keputusan teknis: BackgroundTasks vs ARQ, embedding, chunking, pgvector |
| **Data Model** | [data-model.md](./data-model.md) | Entity definitions, SQL, SQLModel, Alembic |
| **API Contracts** | [contracts/api.md](./contracts/api.md) | 6 endpoint, DTOs, error codes |
| **Quickstart** | [quickstart.md](./quickstart.md) | 9 validation scenarios, unit test checklist |

