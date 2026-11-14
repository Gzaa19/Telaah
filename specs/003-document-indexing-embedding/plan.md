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

### Frontend Styling System & @theme Mapping (Academic Editorial Canvas)

Sesuai Konstitusi Telaah v1.3.0 Prinsip 7 dan [DESIGN.md](file:///Users/gzaaa19/Telaah/DESIGN.md), frontend Telaah mengimplementasikan sistem desain **Academic Editorial Canvas** yang dibangun di atas Tailwind CSS v4 dengan pemetaan token `@theme`:

```css
@import "tailwindcss";

@theme {
  /* Typography Families */
  --font-serif: var(--font-newsreader), Georgia, serif;
  --font-sans: var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: var(--font-jetbrains-mono), Menlo, Monaco, Consolas, monospace;

  /* Surfaces & Canvas */
  --color-canvas-base: #fcf9f8;        /* Warm parchment document canvas */
  --color-canvas-sidebar: #f7f6f3;     /* Warm-grey paper sidebar / inspector */
  --color-canvas-card: #ffffff;        /* Pure card & dialog background */
  --color-border-hairline: #e5e7eb;    /* 1px neutral structural rule */
  --color-border-subtle: #e2e8f0;      /* Subtle inner divider */

  /* Ink & Typography */
  --color-ink-primary: #191919;        /* Deep Carbon Ink for headings & body */
  --color-ink-secondary: #434655;      /* Sub-headings and active secondary text */
  --color-ink-muted: #64748b;          /* Metadata labels, timestamp, line numbers */

  /* Academic Accents & Semantic Signals */
  --color-academic-blue: #1d4ed8;      /* Primary CTA, active tab, focus ring */
  --color-academic-blue-hover: #1e40af;
  --color-archival-emerald: #006c4a;   /* Indexed status, verified telemetry */
  --color-archival-emerald-bg: #ecfdf5;
  --color-archival-emerald-border: #a7f3d0;
  --color-archival-amber: #d97706;     /* Reindex warning, retry signals */
  --color-archival-amber-bg: #fef3c7;
  --color-archival-crimson: #b91c1c;   /* Indexing failed status */
  --color-archival-crimson-bg: #fef2f2;
}
```

#### Component & Layout Mapping for UC-03
1. **Font Loading & Injection** (`frontend/src/app/layout.tsx`):
   - `Newsreader`: Headings, display titles, modal document titles (`--font-newsreader`).
   - `Inter`: Running copy, table content, control buttons, status labels (`--font-inter`).
   - `JetBrains Mono`: Dimensionality (768), vector metadata, chunk count, SHA-256 fingerprint (`--font-jetbrains-mono`).
2. **Three-Pane Architecture**:
   - Left Navigation (`260px`): `#F7F6F3` with 1px `#E5E7EB` right hairline.
   - Main Document Library (`SCR-05`): `#FCF9F8` warm-paper canvas, max width `1120px`.
   - Inspection Panel / Modals (`SCR-06`, `SCR-07`): `#FFFFFF` with 8px radius (`rounded-lg`) and 1px `#E5E7EB` border.
3. **Index-Card Geometry**:
   - Status badges use physical 4px corner geometry (`rounded-sm`), 6px solid status pips, and monospaced indicators.
   - Strict ban on `lucide-react` is preserved; all UI icons utilize `@phosphor-icons/react`.

---

## 2. Updated Domain Model
<!--
  Rosenberg Phase: Domain Model Evolution (Ch. 1 step 2b & Ch. 5, Fig. 5-18/5-19).
  Menambahkan atribut ke entitas domain; BELUM ada operasi/method (dialokasikan di Section 6).
-->

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
    DocumentIndexVersion "0..*" --> "1" EmbeddingModelMetadata : uses_model
    DocumentIndexVersion "0..*" --> "1" ChunkingConfiguration : uses_config
```

### Database Schema Notes

- **`document_index_versions`**: `is_active = TRUE` hanya pada satu record per `document_id` pada satu waktu; record lama di-set `is_active = FALSE` (status `archived`).
- **`document_chunks`**: Kolom `embedding VECTOR(768)` — HNSW index dengan `vector_cosine_ops`.
- **`index_fingerprint`**: Hash deterministik dari `source_checksum + model_name + model_version + embedding_dimension + chunk_size + chunk_overlap + preprocessing_version`.
- **`indexing_jobs`**: `heartbeat_at` diperbarui setiap 30 detik oleh background task; job dengan `heartbeat_at` lebih dari 5 menit tanpa completion dan status non-terminal dianggap stale — dapat di-retry manual oleh peneliti.

---

## 3. ICONIX Robustness Analysis
<!--
  Doug Rosenberg's Four Rules of Robustness Analysis (Ch. 5):
  1. Actors can only talk to Boundary objects.
  2. Boundary objects can only talk to Controllers and Actors.
  3. Entity objects can only talk to Controllers.
  4. Controller objects can talk to Boundaries, Entities, and other Controllers (NEVER to Actors directly).
  THE GOLDEN RULE: Boundary <-> Entity secara langsung DILARANG (no Noun-Noun links).
  Canonical PlantUML ONLY (No Mermaid).
-->

### Robustness Diagram: UC-03 Document Indexing and Local Embedding

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam responseMessageBelowArrow true

note as UC_TEXT
  <b>UC-03: Document Indexing and Local Embedding</b>
  <b>Basic Course (Sunny Day):</b>
  1. UC-02 mengirim document_id ke Indexing Event Boundary -> validasi akses & status extracted.
  2. Cek fingerprint -> buat IndexingJob & DocumentIndexVersion (queued).
  3. Worker bersihkan teks -> chunk + metadata -> embed lokal ("passage: ") -> validasi dimensi 768.
  4. Simpan DocumentChunk ke pgvector -> tandai version = indexed & job = completed.
  5. Peneliti pantau status (SCR-05), uji similarity search (SCR-06), atau re-index (SCR-07).

  <b>Alternate Courses (Rainy Day):</b>
  - Alt-1/5/9: Bukan extracted / duplikat fingerprint / akses ditolak -> tolak tanpa side effect.
  - Alt-3/4/7: Model lokal gagal / dimensi mismatch / batch gagal -> failed (#FFCCCC), tanpa simpan parsial.
  - Alt-6 (UC-03c): Re-index -> arsipkan versi lama, buat versi baru.
end note

actor "UC-02 Extraction Event" as UC02
actor "Peneliti" as Peneliti

boundary "Indexing Trigger API /\nEvent Listener" as B_Event
boundary "Library View\n(SCR-05)" as B_Library
boundary "Indexing Detail View\n(SCR-06)" as B_Detail
boundary "Re-index Confirmation Modal\n(SCR-07)" as B_Confirm

control "Validate Document Access & Status\n[IndexingService]" as C1
control "Check Duplicate Fingerprint\n[IndexingService]" as C2
control "Create IndexingJob & Spawn Pipeline\n[IndexingService]" as C3
control "Load & Clean Extracted Text\n[TextCleaningService]" as C4
control "Chunk Text & Preserve Metadata\n[ChunkingService]" as C5
control "Generate Local Embeddings\n[LocalEmbeddingProvider]" as C6
control "Validate Embedding Dimensions\n[LocalEmbeddingProvider]" as C7
control "Store Chunks & Index Version\n[IndexingPipelineWorker]" as C8
control "Update Status & Mark Indexed\n[IndexingService]" as C9
control "Handle Failure & Log Safe Error\n[IndexingService]" as C10 #FFCCCC
control "Archive Old Index Version\n[IndexingService]" as C11
control "Execute Similarity Search\n[IndexingService]" as C12
control "Query Job Status & Summary\n[IndexingService]" as C13

entity "Document" as E_Doc
entity "ExtractedText" as E_Text
entity "DocumentIndexVersion" as E_Version
entity "DocumentChunk" as E_Chunk
entity "IndexingJob" as E_Job

UC_TEXT -[hidden]-> UC02

UC02 --> B_Event : Trigger event (document_id)
B_Event --> C1 : Dispatch indexing request
C1 --> E_Doc : Validate researcher & status
C1 --> E_Text : Read extracted text
C1 --> C10 : [Alt-1/9: Invalid status / access]
C1 --> C2 : [Sunny Day: Valid extracted doc]

C2 --> E_Version : Check existing fingerprint
C2 --> C10 : [Alt-5: Duplicate fingerprint]
C2 --> C3 : [Unique fingerprint]
C3 --> E_Job : Persist initial job
C3 --> E_Version : Persist initial version
C3 --> C4 : Spawn async pipeline

C4 --> E_Text : Read raw text
C4 --> C10 : [Alt-2: Empty text]
C4 --> C5 : Deliver cleaned text
C5 --> C6 : Deliver chunks & metadata
C6 --> C10 : [Alt-3/7: Model / batch error]
C6 --> C7 : Deliver vector embeddings
C7 --> C10 : [Alt-4: Dimension mismatch]
C7 --> C8 : [Valid 768-dim vectors]

C8 --> E_Chunk : Persist chunks batch
C8 --> E_Version : Update version chunks
C8 --> C9 : Finalize indexing
C9 --> E_Version : Mark version = indexed
C9 --> E_Job : Mark job = completed

C10 --> E_Job : Log safe failure reason
C10 --> E_Version : Mark version = failed

Peneliti --> B_Confirm : Confirm re-index (SCR-07)
B_Confirm --> C11 : Archive active version
C11 --> E_Version : Mark old version archived
C11 --> C3 : Enqueue new version job

Peneliti --> B_Library : Monitor indexing status
B_Library --> C13 : Query status summary
C13 --> E_Job : Read job telemetry
C13 --> E_Version : Read version metadata
C13 --> B_Library : Deliver status summary
B_Library --> Peneliti : Render status badge

Peneliti --> B_Detail : Request similarity test
B_Detail --> C12 : Dispatch query vector
C12 --> C6 : Embed query ("query: ")
C12 --> E_Chunk : Execute cosine search
C12 --> B_Detail : Deliver ranked matches
B_Detail --> Peneliti : Render search preview
@enduml
```

### BCE Inventory & Method Allocation

| BCE Type | Element | Responsibility → Implementation |
|---|---|---|
| **Boundary** | `Indexing Trigger API / Event Listener` | `POST /api/indexing/documents/{document_id}` & ARQ/background event receiver (`indexing/router.py`) |
| **Boundary** | `Library View (SCR-05)` | `frontend/.../library/page.tsx` |
| **Boundary** | `Indexing Detail View (SCR-06)` | `frontend/.../IndexingDetailPanel.tsx` |
| **Boundary** | `Re-index Confirmation Modal (SCR-07)` | `frontend/.../ReindexConfirmModal.tsx` |
| **Controller** | `Validate Document Access & Status` | `IndexingService.validate_document_access()` |
| **Controller** | `Check Duplicate Fingerprint` | `IndexingService.check_duplicate_fingerprint()` |
| **Controller** | `Create IndexingJob & Spawn Pipeline` | `IndexingService.create_job_and_spawn()` |
| **Controller** | `Load & Clean Extracted Text` | `TextCleaningService.clean()` |
| **Controller** | `Chunk Text & Preserve Metadata` | `ChunkingService.chunk_with_metadata()` |
| **Controller** | `Generate Local Embeddings` | `LocalEmbeddingProvider.embed_batch()` |
| **Controller** | `Validate Embedding Dimensions` | `LocalEmbeddingProvider.validate_dimensions()` |
| **Controller** | `Store Chunks & Index Version` | `IndexingRepository.save_chunks_transactional()` |
| **Controller** | `Update Status & Mark Indexed` | `IndexingService.finalize()` |
| **Controller** | `Handle Failure & Log Safe Error` | `IndexingService.handle_failure()` |
| **Controller** | `Archive Old Index Version` | `IndexingRepository.archive_index_version()` |
| **Controller** | `Execute Similarity Search` | `IndexingService.similarity_search()` |
| **Controller** | `Query Job Status & Summary` | `IndexingRepository.get_job_with_summary()` |
| **Entity** | `Document` | `documents/models.py` → `Document` |
| **Entity** | `ExtractedText` | `documents/models.py` → `ExtractedText` |
| **Entity** | `DocumentIndexVersion` | `indexing/models.py` → `DocumentIndexVersion` |
| **Entity** | `DocumentChunk` | `indexing/models.py` → `DocumentChunk` |
| **Entity** | `IndexingJob` | `indexing/models.py` → `IndexingJob` |

### BCE Rule Compliance Audit

- [x] **Rule 1**: Peneliti dan UC-02 hanya berinteraksi dengan Boundary (Client UI `SCR-05`–`SCR-07` dan `Indexing Trigger API / Event Listener`), tidak pernah langsung ke Controller.
- [x] **Rule 2**: Semua Boundary hanya memanggil Controller — tidak menyentuh Entity langsung.
- [x] **Rule 3**: Entity (`DocumentChunk`, `DocumentIndexVersion`, `IndexingJob`, `Document`, `ExtractedText`) hanya diakses dan dimutasi melalui Controller.
- [x] **Rule 4**: Controller tidak berinteraksi langsung ke Actor; hasil dikembalikan melalui Boundary ke Actor.
- [x] **Zero Direct Boundary-to-Entity Links**: Tidak ada link langsung dari Boundary ke model database.

---

## 4. Preliminary Design Review (PDR) Checkpoint Gate

| PDR Criteria | Status | Evidence |
|---|:---:|---|
| **1. Use Case Coverage** | ✅ PASS | Semua langkah sunny-day dan rainy-day tercakup di robustness analysis |
| **2. Alternate Courses Handled** | ✅ PASS | Alt-1 (C1), Alt-2 (C4), Alt-3 (C6→C10), Alt-4 (C7→C10), Alt-5 (C2), Alt-6 (C11→C3) |
| **3. Domain Model Updated** | ✅ PASS | Entitas domain sesuai skema database SQLModel |
| **4. Strict BCE Adherence** | ✅ PASS | Zero direct Boundary-to-Entity links. Boundary murni Client UI |

*GATE STATUS*: **✅ APPROVED TO PROCEED TO DETAILED DESIGN**

---

## 5. Detailed Design: Sequence Diagrams
<!--
  Rosenberg Phase: Detailed Design (Ch. 8). Canonical PlantUML ONLY (No Mermaid).
-->

### Sequence Diagram 1: UC-03 Document Indexing Pipeline (Sunny Day & Failure Paths)

```plantuml
@startuml
autoactivate off
autonumber
skinparam shadowing false
skinparam responseMessageBelowArrow true

actor "UC-02 Extraction Event" as UC02
boundary "Indexing Trigger API /\nEvent Listener" as EventBnd
control "IndexingService" as IService
entity "Document" as Document
entity "ExtractedText" as ExtractedText
entity "DocumentIndexVersion" as IndexVersion
entity "IndexingJob" as IndexJob
control "IndexingPipelineWorker" as Pipeline
control "TextCleaningService" as Cleaner
control "ChunkingService" as Chunker
control "LocalEmbeddingProvider" as Embedder
entity "DocumentChunk" as ChunkEntity

note left of UC02
  <b>UC-03: Document Indexing and Local Embedding</b>
  <b>Basic Course:</b>
  1. Event/trigger masuk melalui EventBnd -> validasi akses & status extracted.
  2. Cek fingerprint -> buat IndexingJob & DocumentIndexVersion (queued).
  3. Worker clean -> chunk -> embed lokal -> validate 768 dim -> store chunks batch.
  4. Mark version = indexed & job = completed.

  <b>Alternate Courses:</b>
  - Alt-5: Fingerprint sudah ada -> tolak duplikasi tanpa side effect.
  - Alt-3/4/7: Model gagal / dimensi mismatch -> mark failed tanpa chunk parsial.
end note

UC02 -> EventBnd : emit_document_extracted(document_id, researcher_id)
EventBnd -> IService : trigger_indexing(document_id, researcher_id)
IService -> Document : validate_access_and_status(document_id, researcher_id)
Document --> IService : document_record
IService -> ExtractedText : load_extracted_text(document_id)
ExtractedText --> IService : text_record
IService -> IndexVersion : check_fingerprint_exists(fingerprint)

alt Alt-5: Duplicate Fingerprint Exists
    IndexVersion --> IService : existing_indexed_version
    IService --> EventBnd : reject_duplicate(existing_indexed_version)
    EventBnd --> UC02 : duplicate_acknowledged
else Sunny Day: Unique Fingerprint
    IndexVersion --> IService : none_found
    IService -> IndexJob : create_job_record(document_id, status_queued)
    IndexJob --> IService : job_record
    IService -> IndexVersion : create_version_record(document_id, fingerprint, status_queued)
    IndexVersion --> IService : version_record
    IService -> Pipeline : spawn_pipeline(job_id, version_id, document_id)
    IService --> EventBnd : accept_indexing(job_id, version_id)
    EventBnd --> UC02 : acknowledge_acceptance(job_id, version_id)

    note over Pipeline : Async In-Process Execution
    Pipeline -> IndexJob : update_stage(status_cleaning)
    Pipeline -> Cleaner : clean(text_content)
    Cleaner --> Pipeline : cleaned_text

    Pipeline -> IndexJob : update_stage(status_chunking)
    Pipeline -> Chunker : chunk_text_with_metadata(cleaned_text, pages)
    Chunker --> Pipeline : text_chunks

    Pipeline -> IndexJob : update_stage(status_embedding)
    Pipeline -> Embedder : embed_batch(text_chunks)
    Embedder --> Pipeline : vector_embeddings
    Pipeline -> Embedder : validate_dimensions(vector_embeddings, expected_dim_768)

    alt Sunny Day: Dimensions Valid
        Embedder --> Pipeline : dimensions_valid
        Pipeline -> IndexJob : update_stage(status_storing)
        Pipeline -> ChunkEntity : store_chunks_batch(version_id, text_chunks, vector_embeddings)
        ChunkEntity --> Pipeline : chunks_persisted
        Pipeline -> IndexVersion : mark_indexed(status_indexed, total_chunks)
        IndexVersion --> Pipeline : version_indexed
        Pipeline -> IndexJob : mark_completed(status_completed)
        IndexJob --> Pipeline : job_completed
    else Alt-3 / Alt-4 / Alt-7: Model Load or Dimension Mismatch Failure
        Embedder --> Pipeline : raise_embedding_error(reason)
        Pipeline -> IndexVersion : mark_failed(status_failed, reason)
        Pipeline -> IndexJob : mark_failed(status_failed, reason)
    end
end
@enduml
```

### Sequence Diagram 2: UC-03a — Monitor Status (Polling)

```plantuml
@startuml
autoactivate off
autonumber
skinparam shadowing false
skinparam responseMessageBelowArrow true

actor "Peneliti" as Peneliti
boundary "Library View\n(SCR-05)" as LibraryUI
control "IndexingService" as IService
entity "IndexingJob" as IndexJob
entity "DocumentIndexVersion" as IndexVersion

note left of Peneliti
  <b>UC-03a: Monitor Indexing Status</b>
  Peneliti memantau status bertahap & ringkasan
  chunk/model melalui polling berkala pada SCR-05.
end note

loop Periodic Status Refresh
    Peneliti -> LibraryUI : open_library_view()
    LibraryUI -> IService : get_indexing_summary(document_id, researcher_id)
    IService -> IndexJob : load_job_telemetry(document_id)
    IndexJob --> IService : job_telemetry
    IService -> IndexVersion : load_active_version_metadata(document_id)
    IndexVersion --> IService : version_metadata
    IService --> LibraryUI : deliver_indexing_summary(job_telemetry, version_metadata)
    LibraryUI --> Peneliti : render_status_badge_and_progress()
end
@enduml
```

### Sequence Diagram 3: UC-03c — Re-index (Archive + New Pipeline)

```plantuml
@startuml
autoactivate off
autonumber
skinparam shadowing false
skinparam responseMessageBelowArrow true

actor "Peneliti" as Peneliti
boundary "Re-index Confirmation Modal\n(SCR-07)" as ConfirmModal
control "IndexingService" as IService
entity "DocumentIndexVersion" as IndexVersion
entity "IndexingJob" as IndexJob
control "IndexingPipelineWorker" as Pipeline
boundary "Library View\n(SCR-05)" as LibraryUI

note left of Peneliti
  <b>UC-03c: Re-index Dokumen</b>
  1. Peneliti konfirmasi Re-index di SCR-07.
  2. Versi lama ditandai archived (tetap tersimpan untuk audit).
  3. Versi & job baru berstatus queued dijalankan di background.
end note

Peneliti -> ConfirmModal : confirm_reindex(document_id)
ConfirmModal -> IService : request_reindex(document_id, researcher_id)
IService -> IndexVersion : archive_active_version(document_id)
IndexVersion --> IService : version_archived
IService -> IndexVersion : create_new_active_version(document_id, status_queued)
IndexVersion --> IService : new_version_record
IService -> IndexJob : create_reindex_job(document_id, status_queued)
IndexJob --> IService : new_job_record
IService -> Pipeline : spawn_pipeline(new_job_id, new_version_id, document_id)
IService --> ConfirmModal : confirm_reindex_started(new_job_id)
ConfirmModal -> LibraryUI : navigate_to_library()
LibraryUI --> Peneliti : render_queued_status()
@enduml
```

### Sequence Diagram 4: Similarity Search Verification (SCR-06)

```plantuml
@startuml
autoactivate off
autonumber
skinparam shadowing false
skinparam responseMessageBelowArrow true

actor "Peneliti" as Peneliti
boundary "Indexing Detail View\n(SCR-06)" as DetailUI
control "IndexingService" as IService
control "LocalEmbeddingProvider" as Embedder
entity "DocumentChunk" as ChunkEntity

note left of Peneliti
  <b>UC-03 Verification: Similarity Search (SCR-06)</b>
  Peneliti menguji pencarian semantik dasar ("query: ")
  terhadap DocumentChunk pada versi indeks aktif.
end note

Peneliti -> DetailUI : submit_similarity_query(document_id, query_text)
DetailUI -> IService : similarity_search(query_text, document_id, researcher_id)
IService -> Embedder : embed_query("query: " + query_text)
Embedder --> IService : query_vector_768
IService -> ChunkEntity : cosine_search(query_vector_768, researcher_id, document_id)
ChunkEntity --> IService : ranked_chunks_with_scores
IService --> DetailUI : deliver_ranked_matches(ranked_chunks_with_scores)
DetailUI --> Peneliti : render_search_preview()
@enduml
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
| **P7: Anti-Slop Frontend** | ✅ PASS | Academic Editorial Canvas: Newsreader, Inter, JetBrains Mono, warm paper #FCF9F8, Royal Blue #1D4ED8, Archival Emerald #006C4A, @phosphor-icons/react (Constitution v1.3.0) |
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

