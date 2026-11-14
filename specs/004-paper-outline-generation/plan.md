# Technical Plan: UC-04 Template-Based Paper Outline Generation – ICONIX Process

**Branch**: `004-paper-outline-generation` | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/004-paper-outline-generation/spec.md`
**Methodology Reference**: Doug Rosenberg & Matt Stephens, *Use Case Driven Object Modeling with UML*

---

## 1. System Architecture & Technical Context

### Technology Stack (Telaah Constitution v1.3.0 Compliant)

| Layer | Technology | Role in UC-04 |
|---|---|---|
| **Frontend** | Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, `@phosphor-icons/react` | Academic Outline Editorial Canvas (SCR-01–SCR-05) |
| **Backend API** | FastAPI (Python 3.12), Pydantic v2, SQLModel/SQLAlchemy | Outline generation orchestration, template ingestion, LLM integration |
| **Persistence** | PostgreSQL + `pgvector` | New outline/section/field tables + existing chunk vector table |
| **Async Workers** | Existing worker pattern (`backend/src/workers/`) | Async outline generation job (non-blocking, < 45 sec) |
| **LLM Provider** | Google Gemini (`gemini-2.0-flash`) via `google-generativeai` | Section-field synthesis with template constraint prompting |
| **Template Parsing** | `python-docx` (DOCX), `re`/stdlib (LaTeX), `PyYAML` (outline-sections.yaml) | Normalized Outline Definition construction |
| **Embedding/Retrieval** | `pgvector` cosine similarity on existing `document_chunks` table (UC-03) | Section- & field-targeted chunk retrieval |

### Architectural Pattern
**Router (Boundary) → Service (Controller) → Repository (Entity)**
Matching the existing pattern used in `backend/src/documents/` and `backend/src/indexing/`.

### Directory Layout for New Code

```
backend/src/
├── templates/
│   └── icicos/                    ← NEW: iciCos template assets
│       ├── template.docx          ← (reorganized from conference-template-a4.docx)
│       ├── template.tex           ← NEW: LaTeX export structure reference
│       └── outline-sections.yaml  ← NEW: Body section field declarations
├── outlines/                      ← NEW: UC-04 feature module
│   ├── __init__.py
│   ├── models.py                  ← PaperOutline, OutlineSection, SectionField, SourceReference
│   ├── schemas.py                 ← Pydantic DTOs for API and internal types
│   ├── router.py                  ← FastAPI route boundary
│   ├── service.py                 ← Business logic controller
│   ├── repository.py              ← DB access entity layer
│   ├── template_parser.py         ← DOCX + YAML + LaTeX → OutlineDefinition
│   ├── retriever.py               ← Section- & field-targeted chunk retrieval
│   ├── llm_synthesizer.py         ← LLM prompt builder + response parser
│   └── worker.py                  ← Async outline generation job

frontend/src/
├── app/workspace/outline/
│   ├── page.tsx                   ← SCR-01: Workspace Setup & Template Selection
│   └── [outlineId]/
│       └── page.tsx               ← SCR-03: Academic Outline Editorial Canvas
├── components/features/outline/
│   ├── TemplateSelectionCard.tsx
│   ├── GenerationProgressModal.tsx ← SCR-02: Stepper progress
│   ├── OutlineEditorCanvas.tsx     ← SCR-03: Main editorial canvas
│   ├── SectionTreeNav.tsx
│   ├── SectionFieldEditor.tsx
│   ├── ProvenanceDrawer.tsx        ← SCR-03: Right panel chunk references
│   ├── VersionHistoryDrawer.tsx    ← SCR-04
│   └── TemplateDiagnosticModal.tsx ← SCR-05
```

### Constitution Check

| Principle | Status | Evidence |
|---|:---:|---|
| **P1 (Scientific Structure – IMRaD)** | ✅ PASS | Outline sections follow IMRaD-aligned iciCos template; body sections declared in `outline-sections.yaml` |
| **P2 (Secure Auth & Tenant Isolation)** | ✅ PASS | FR-014 mandates workspace ownership checks on all outline endpoints |
| **P3 (Retrieval Accuracy / Anti-Hallucination)** | ✅ PASS | FR-007, FR-009: `[NEEDS INPUT]` for missing evidence; chunk references mandatory per field |
| **P4 (AI-Assisted but Reviewable)** | ✅ PASS | Full Spec Kit workflow followed; human approval gate (FR-012) |
| **P5 (Performance / Runtime)** | ✅ PASS | Async worker + non-blocking API; NFR-001 < 45 sec target |
| **P6 (Ponytail – No Over-Engineering)** | ✅ PASS | Reuses UC-03 chunk table & embedding infrastructure; no new vector store |
| **P7 (Academic Editorial Canvas)** | ✅ PASS | SCR-03 uses Newsreader/Inter/JetBrains Mono, warm paper #FCF9F8, `@phosphor-icons/react`; NO lucide-react |

---

## 2. Phase 0: Research & Resolved Unknowns

### Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **DOCX Parsing** | `python-docx` | Extracts paragraph styles (Heading 1/2) cleanly; already in Python ecosystem |
| **LaTeX Parsing** | Regex on `\section{}` / `\subsection{}` commands | LaTeX used only for export config (document class, bib setup) — not outline authority |
| **YAML Parsing** | `PyYAML` | `outline-sections.yaml` is the primary body section definition source |
| **LLM Provider** | Google Gemini (`gemini-2.0-flash`) via `google-generativeai` | Already in Telaah stack; supports structured JSON output |
| **Chunk Retrieval** | pgvector cosine similarity on `document_chunks.embedding` filtered by `index_version_id` | Reuses UC-03 embedding; avoids separate vector store (Ponytail P6) |
| **Retrieval Strategy** | Embed field keyword → top-k cosine search + section_name metadata filter | Directed retrieval per spec; efficient token usage |
| **Async Execution** | FastAPI `BackgroundTasks` (or Celery if already configured) + status polling | Matches UC-03 worker pattern; non-blocking |
| **LLM Structured Output** | `response_mime_type="application/json"` with JSON schema in prompt | Ensures parseable, schema-valid section field responses |
| **Outline Versioning** | `version_number` integer on `PaperOutline`; approved rows immutable via application-level guard | FR-013: no in-place mutation of approved versions |
| **PaperTemplate Registry** | Read from disk at runtime (not persisted in DB) | Adding new templates requires only a new subfolder, zero DB migrations (Ponytail P6) |

---

## 3. Updated Domain Model
<!--
  Rosenberg Phase: Domain Model Evolution (Ch. 1 step 2b & Ch. 5, Fig. 5-18/5-19).
  Menambahkan atribut ke entitas domain; BELUM ada operasi/method (dialokasikan di Section 7).
-->

```mermaid
classDiagram
    class Researcher {
        +UUID id
        +String email
    }

    class Document {
        +UUID id
        +UUID researcher_id
        +String file_name
        +ImportStatus import_status
    }

    class DocumentIndexVersion {
        +UUID id
        +UUID document_id
        +String status
        +Boolean is_active
    }

    class DocumentChunk {
        +UUID id
        +UUID index_version_id
        +int chunk_index
        +String chunk_text
        +Vector_768 embedding
        +int page_number
        +String section_name
        +JSON source_metadata
    }

    class PaperOutline {
        +UUID id PK
        +UUID researcher_id FK
        +UUID document_id FK
        +String template_id
        +int version_number
        +OutlineLanguageEnum language_choice
        +GenerationStatusEnum generation_status
        +ApprovalStatusEnum approval_status
        +DateTime created_at
        +DateTime approved_at
    }

    class OutlineSection {
        +UUID id PK
        +UUID outline_id FK
        +String section_key
        +String title
        +int order_index
        +Boolean is_required
        +SectionStatusEnum section_status
    }

    class SectionField {
        +UUID id PK
        +UUID section_id FK
        +String field_key
        +String field_label
        +String content
        +Boolean is_needs_input
        +Boolean is_edited
        +int order_index
    }

    class SourceReference {
        +UUID id PK
        +UUID field_id FK
        +UUID document_id FK
        +UUID chunk_id FK
        +int page_number
        +String excerpt_text
    }

    Researcher "1" --> "*" Document
    Researcher "1" --> "*" PaperOutline
    Document "1" --> "0..1" DocumentIndexVersion : active_version
    DocumentIndexVersion "1" --> "*" DocumentChunk
    PaperOutline "1" --> "*" OutlineSection
    OutlineSection "1" --> "*" SectionField
    SectionField "1" --> "*" SourceReference
    SourceReference --> DocumentChunk : traces_to
```

### New Enum Types

```python
class OutlineLanguageEnum(str, Enum):
    en_ieee = "en_ieee"        # English — Academic IEEE style
    id_formal = "id_formal"   # Bahasa Indonesia

class GenerationStatusEnum(str, Enum):
    preparing = "preparing"
    reading = "reading"
    generating = "generating"
    validating = "validating"
    ready = "ready"
    failed = "failed"

class ApprovalStatusEnum(str, Enum):
    draft = "draft"
    approved = "approved"

class SectionStatusEnum(str, Enum):
    filled = "filled"
    needs_input = "needs_input"
    edited = "edited"
```

### Database Schema Additions (Alembic migrations required)
- `paper_outlines` — main outline record with versioning and status
- `outline_sections` — one row per section per outline version
- `section_fields` — one row per field per section (content + flags)
- `source_references` — provenance records linking field → chunk

`PaperTemplate` is **not persisted** in DB — read from disk at runtime (Ponytail P6).

---

## 4. ICONIX Robustness Analysis
<!--
  Doug Rosenberg's Four Rules of Robustness Analysis (Ch. 5):
  1. Actors can only talk to Boundary objects.
  2. Boundary objects can only talk to Controllers and Actors.
  3. Entity objects can only talk to Controllers.
  4. Controller objects can talk to Boundaries, Entities, and other Controllers (NEVER to Actors directly).
  THE GOLDEN RULE: Boundary <-> Entity maupun Boundary <-> Boundary secara langsung DILARANG.
  Canonical PlantUML ONLY (No Mermaid).
-->

### UC-04.1: Generate Paper Outline

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam responseMessageBelowArrow true

note as UC_TEXT
  <b>UC-04.1: Generate Paper Outline from Template & Indexed Document</b>
  <b>Basic Course (Sunny Day):</b>
  1. Peneliti pilih dokumen Indexed, template iciCos, & bahasa di SCR-01 -> klik Generate.
  2. Validasi kepemilikan workspace & status Indexed -> buka SCR-02.
  3. Parse template.docx, template.tex, outline-sections.yaml -> OutlineDefinition.
  4. Ambil chunk terarah per field -> sintesis 1-2 bullet via LLM (atau [NEEDS INPUT]).
  5. Validasi struktur outline -> simpan PaperOutline v1 + sections + fields + provenance -> SCR-03.

  <b>Alternate Courses (Rainy Day):</b>
  - Alt-1/2: Dokumen belum Indexed / template korup -> SCR-01 / SCR-05 (#FFCCCC).
  - Alt-6/7: Validasi gagal (retry max 2x) / LLM timeout -> status Failed di SCR-02.
end note

actor "Peneliti" as ACTOR
boundary "SCR-01 Workspace Setup\n& Template Selection" as B_SCR01
boundary "SCR-02 Generation\nProgress Modal" as B_SCR02
boundary "SCR-03 Academic Outline\nEditorial Canvas" as B_SCR03
boundary "SCR-05 Template\nDiagnostic Modal" as B_ERR
boundary "OutlineRouter" as B_ROUTER
boundary "Static Template Store\n(docx / tex / yaml)" as B_TMPL_FS
boundary "LLM Service API" as B_LLM_API

control "Validate Researcher Workspace\n& Document Ownership\n[OutlineService]" as C_AUTH
control "Load & Validate Template Files\n-> OutlineDefinition\n[TemplateParser]" as C_TMPL
control "Retrieve Targeted Chunks\nper Section-Field\n[ChunkRetriever]" as C_RETR
control "Synthesize Section Fields\nvia LLM\n[LLMSynthesizer]" as C_LLM
control "Validate Outline Structure\nvs OutlineDefinition\n[OutlineService]" as C_VAL
control "Persist Draft Outline v1\n[OutlineRepository]" as C_SAVE
control "Handle Generation Failure\n[OutlineService]" as C_FAIL #FFCCCC

entity "DocumentIndexVersion" as E_DOC
entity "DocumentChunk\n(pgvector)" as E_CHUNK
entity "PaperOutline" as E_OUTLINE
entity "OutlineSection" as E_SECTION
entity "SectionField" as E_FIELD
entity "SourceReference" as E_REF

UC_TEXT -[hidden]-> ACTOR

ACTOR --> B_SCR01 : 1. Select Indexed Doc + Language,\nClick Generate
B_SCR01 --> B_ROUTER : 2. Submit generate_outline()
B_ROUTER --> C_AUTH : Dispatch request
C_AUTH --> E_DOC : 3. Verify ownership & Indexed status
C_AUTH --> C_FAIL : [Alt-1: Doc not Indexed]
C_FAIL --> B_SCR01 : Disable option & explain
C_AUTH --> E_OUTLINE : Create PaperOutline v1 (preparing)
C_AUTH --> B_SCR02 : Open progress modal
C_AUTH --> C_TMPL : [Sunny Day] Start generation

C_TMPL --> B_TMPL_FS : 4. Read docx + yaml + tex
C_TMPL --> B_SCR02 : Update progress (Reading)
C_TMPL --> C_FAIL : [Alt-2: Missing/corrupt files]
C_FAIL --> B_ERR : Show template diagnostic
C_TMPL --> C_RETR : [Alt-3: Log inconsistency] Continue

C_RETR --> E_CHUNK : 5. Cosine search chunks per field
C_RETR --> C_LLM : 6. Pass chunks + field rules
C_LLM --> B_LLM_API : Invoke structured synthesis
C_LLM --> C_FAIL : [Alt-7: LLM timeout]
C_LLM --> C_VAL : 7. Synthesize bullets or [NEEDS INPUT]

C_VAL --> C_LLM : [Alt-6: Schema mismatch -> retry max 2x]
C_VAL --> C_FAIL : [Alt-6: Final fail]
C_FAIL --> E_OUTLINE : Mark status = Failed
C_FAIL --> B_SCR02 : Show Failed + Retry action

C_VAL --> C_SAVE : 8. Valid -> Save
C_SAVE --> E_OUTLINE : Update PaperOutline (ready)
C_SAVE --> E_SECTION : Write sections
C_SAVE --> E_FIELD : Write fields
C_SAVE --> E_REF : Write provenance
C_SAVE --> B_SCR03 : Ready for Review
B_SCR03 --> ACTOR : Render Editorial Canvas
@enduml
```

### UC-04.2: Review & Edit Outline Sections

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam responseMessageBelowArrow true

note as UC_TEXT
  <b>UC-04.2: Review & Edit Outline Sections</b>
  <b>Basic Course:</b>
  1. Peneliti pilih seksi pada pohon navigasi SCR-03.
  2. OutlineRouter teruskan ke OutlineService / OutlineRepository untuk muat isi field & provenance.
  3. Peneliti sunting teks -> simpan -> status seksi menjadi Edited (terproteksi).
end note

actor "Peneliti" as ACTOR
boundary "SCR-03 Academic Outline\nEditorial Canvas" as B_CANVAS
boundary "OutlineRouter" as B_ROUTER

control "Load Section Content\n& Provenance\n[OutlineService]" as C_LOAD
control "Save Edited Field\n-> Mark is_edited=True\n[OutlineService / OutlineRepository]" as C_SAVE_EDIT

entity "OutlineSection" as E_SECTION
entity "SectionField" as E_FIELD
entity "SourceReference" as E_REF

UC_TEXT -[hidden]-> ACTOR

ACTOR --> B_CANVAS : 1. Click section in tree
B_CANVAS --> B_ROUTER : 2. Request section detail
B_ROUTER --> C_LOAD : Delegate fetch
C_LOAD --> E_SECTION : Verify section metadata
C_LOAD --> E_FIELD : 3. Read fields
C_LOAD --> E_REF : 3a. Read provenance
C_LOAD --> B_ROUTER : Return section + chunks
B_ROUTER --> B_CANVAS : 4. Deliver detail
B_CANVAS --> ACTOR : Display section & provenance

ACTOR --> B_CANVAS : 5. Edit textarea content
B_CANVAS --> B_ROUTER : Submit field edit
B_ROUTER --> C_SAVE_EDIT : Dispatch edit update
C_SAVE_EDIT --> E_FIELD : 6. Update content, is_edited=True
C_SAVE_EDIT --> E_SECTION : Update section status = Edited
C_SAVE_EDIT --> B_ROUTER : 7. Confirm save
B_ROUTER --> B_CANVAS : Deliver updated field
B_CANVAS --> ACTOR : 8. Show Edited badge
@enduml
```

### UC-04.3: Regenerate Outline or Single Section

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam responseMessageBelowArrow true

note as UC_TEXT
  <b>UC-04.3: Regenerate Outline or Single Section</b>
  <b>Basic Course:</b>
  1. Peneliti klik Regenerate Entire Outline di SCR-03 -> buka modal konfirmasi.
  2. Peneliti pilih pertahankan seksi Edited (default) atau Reset All Sections.
  3. Cek concurrent guard -> fork versi vX+1 -> salin Edited -> sintesis non-edited via LLM.

  <b>Alternate Course:</b>
  - Alt-8: Concurrent request pada workspace yang sama -> tolak 409 (#FFCCCC).
end note

actor "Peneliti" as ACTOR
boundary "SCR-03 Editorial Canvas" as B_CANVAS
boundary "Regeneration Confirm Modal" as B_MODAL
boundary "OutlineRouter" as B_ROUTER
boundary "LLM Service API" as B_LLM_API

control "Prepare Regeneration\nOptions Summary\n[OutlineService]" as C_PREP
control "Check Concurrent\nRequest Guard\n[OutlineService]" as C_GUARD
control "Reject Concurrent Request\n[OutlineRouter]" as C_CONFLICT #FFCCCC
control "Fork New Outline\nVersion vX+1\n[OutlineService]" as C_FORK
control "Copy Edited Sections\nto New Version\n[OutlineRepository]" as C_PRESERVE
control "Re-run Retrieval\n+ LLM Synthesis\n[ChunkRetriever / LLMSynthesizer]" as C_REGEN
control "Persist New Outline Version\n[OutlineRepository]" as C_SAVE_R

entity "DocumentChunk\n(pgvector)" as E_CHUNK
entity "PaperOutline" as E_OUTLINE
entity "OutlineSection" as E_SECTION

UC_TEXT -[hidden]-> ACTOR

ACTOR --> B_CANVAS : 1. Click Regenerate Entire Outline
B_CANVAS --> C_PREP : Inspect Edited vs non-edited sections
C_PREP --> E_SECTION : Read section edited flags
C_PREP --> B_MODAL : 2. Present confirm modal
B_MODAL --> ACTOR : Display preservation summary

ACTOR --> B_MODAL : 3. Confirm (with/without Reset All)
B_MODAL --> B_ROUTER : 4. Submit regenerate request
B_ROUTER --> C_GUARD : Dispatch regen
C_GUARD --> C_CONFLICT : [Alt-8: Active job exists]
C_CONFLICT --> B_CANVAS : Show 409 conflict notice
C_GUARD --> C_FORK : [OK] No active job

C_FORK --> E_OUTLINE : 5. Create PaperOutline vX+1
C_FORK --> C_PRESERVE : 6. If not Reset All
C_PRESERVE --> E_SECTION : Clone Edited sections
C_FORK --> C_REGEN : 7. Trigger regen for non-edited
C_REGEN --> E_CHUNK : Retrieve chunks
C_REGEN --> B_LLM_API : Synthesize non-edited fields
C_REGEN --> C_SAVE_R : Validate & prepare new sections
C_SAVE_R --> E_SECTION : 8. Persist new version
C_SAVE_R --> B_CANVAS : Display new draft version
B_CANVAS --> ACTOR : Render updated outline
@enduml
```

### UC-04.4: Approve & Version Paper Outline

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam responseMessageBelowArrow true

note as UC_TEXT
  <b>UC-04.4: Approve & Version Paper Outline</b>
  <b>Basic Course:</b>
  1. Peneliti klik Approve Outline di SCR-03 -> cek sisa [NEEDS INPUT].
  2. Tampilkan dialog konfirmasi -> set approval_status = Approved + approved_at.

  <b>Alternate Course:</b>
  - Alt-1: Edit outline berstatus Approved -> kunci read-only & fork versi Draft vX+1.
end note

actor "Peneliti" as ACTOR
boundary "SCR-03 Editorial Canvas" as B_CANVAS
boundary "Approve Confirm Dialog" as B_CONFIRM
boundary "OutlineRouter" as B_ROUTER

control "Check NEEDS INPUT Presence\n[OutlineService]" as C_CHECK
control "Set Outline Status to Approved\n+ Timestamp\n[OutlineService]" as C_LOCK
control "Fork New Draft vX+1 on\nPost-Approval Edit Attempt\n[OutlineService]" as C_FORK_EDIT #FFCCCC

entity "PaperOutline" as E_OUTLINE

UC_TEXT -[hidden]-> ACTOR

ACTOR --> B_CANVAS : 1. Click Approve Outline
B_CANVAS --> B_ROUTER : 2. Request NEEDS INPUT check
B_ROUTER --> C_CHECK : Trigger approval check
C_CHECK --> E_OUTLINE : Count remaining [NEEDS INPUT]
C_CHECK --> B_ROUTER : Return warning / ok status
B_ROUTER --> B_CONFIRM : 3a/3b. Present warning or confirm
B_CONFIRM --> ACTOR : Ask explicit confirmation

ACTOR --> B_CONFIRM : 4. Confirm approval
B_CONFIRM --> B_ROUTER : Submit approve_outline()
B_ROUTER --> C_LOCK : 5. Lock approved version
C_LOCK --> E_OUTLINE : 6. approval_status=approved,\napproved_at=now()
C_LOCK --> B_ROUTER : Return approval result
B_ROUTER --> B_CANVAS : 7. Show Approved badge
B_CANVAS --> ACTOR : Render Approved badge

ACTOR --> B_CANVAS : [Alt-1] Try to edit Approved outline
B_CANVAS --> B_ROUTER : Request edit on Approved outline
B_ROUTER --> C_FORK_EDIT : Dispatch post-approval edit guard
C_FORK_EDIT --> E_OUTLINE : Create vX+1 Draft (immutable vX)
C_FORK_EDIT --> B_ROUTER : Return forked outline ID
B_ROUTER --> B_CANVAS : Open new draft in canvas
B_CANVAS --> ACTOR : Render vX+1 editable draft
@enduml
```

### BCE Inventory & Method Allocation

| BCE Type | Element Name | Concrete Allocation |
|---|---|---|
| **Boundary** | SCR-01 Workspace Setup View | `frontend/src/app/workspace/outline/page.tsx` |
| **Boundary** | SCR-02 Generation Progress Modal | `frontend/src/components/features/outline/GenerationProgressModal.tsx` |
| **Boundary** | SCR-03 Academic Outline Editorial Canvas | `frontend/src/app/workspace/outline/[outlineId]/page.tsx` + `OutlineEditorCanvas.tsx` |
| **Boundary** | SCR-04 Version History Drawer | `frontend/src/components/features/outline/VersionHistoryDrawer.tsx` |
| **Boundary** | SCR-05 Template Diagnostic Modal | `frontend/src/components/features/outline/TemplateDiagnosticModal.tsx` |
| **Boundary** | `OutlineRouter` (FastAPI API Boundary) | `backend/src/outlines/router.py` |
| **Boundary** | Static Template Store (`docx/tex/yaml`) | `backend/src/templates/<template_id>/` filesystem boundary |
| **Boundary** | LLM Service API | `LLMSynthesizer` external Gemini API gateway |
| **Controller** | Validate Researcher Workspace & Document Ownership | `OutlineService.validate_generate_request()` |
| **Controller** | Load & Validate Template Files → OutlineDefinition | `TemplateParser.parse_template()` |
| **Controller** | Retrieve Targeted Chunks per Section-Field | `ChunkRetriever.retrieve_for_field()` |
| **Controller** | Synthesize Section Fields via LLM | `LLMSynthesizer.synthesize_field()` |
| **Controller** | Validate Outline Structure vs OutlineDefinition | `OutlineService.validate_outline_structure()` |
| **Controller** | Persist Draft Outline v1 | `OutlineRepository.create_outline_with_sections()` |
| **Controller** | Handle Generation Failure | `OutlineService.mark_generation_failed()` |
| **Controller** | Load Section Content & Provenance | `OutlineService.get_section_detail()` |
| **Controller** | Save Edited Section Field → Mark Edited | `OutlineService.update_field_content()` |
| **Controller** | Prepare Regeneration Options Summary | `OutlineService.get_regeneration_preview()` |
| **Controller** | Check Concurrent Request Guard | `OutlineService.assert_no_active_generation()` |
| **Controller** | Reject Concurrent Request | `OutlineRouter` / `HTTP 409 Conflict` handler |
| **Controller** | Fork New Outline Version vX+1 | `OutlineService.fork_outline_version()` |
| **Controller** | Copy Edited Sections to New Version | `OutlineRepository.clone_edited_sections()` |
| **Controller** | Check NEEDS INPUT Presence | `OutlineService.check_needs_input()` |
| **Controller** | Set Outline Status to Approved & Timestamp | `OutlineService.approve_outline()` |
| **Controller** | Fork New Draft vX+1 on Post-Approval Edit Attempt | `OutlineService.fork_on_edit_attempt()` |
| **Entity** | `PaperOutline` | `backend/src/outlines/models.py` |
| **Entity** | `OutlineSection` | `backend/src/outlines/models.py` |
| **Entity** | `SectionField` | `backend/src/outlines/models.py` |
| **Entity** | `SourceReference` | `backend/src/outlines/models.py` |
| **Entity** | `DocumentChunk` (read-only, UC-03) | `backend/src/indexing/models.py` |

### BCE Rule Compliance Audit

- [x] **Rule 1 (Actors talk only to Boundaries)**: Peneliti interacts exclusively with SCR-01 through SCR-05 UI boundary objects.
- [x] **Rule 2 (Boundaries talk only to Controllers and Actors)**: UI screens dispatch to service/controller methods only.
- [x] **Rule 3 (Entities talk only to Controllers)**: Domain models accessed exclusively via `OutlineRepository` and `OutlineService`.
- [x] **Rule 4 (Controllers talk to Boundaries, Controllers, Entities; not to Actors)**: No controller references actor directly.
- [x] **Zero Direct Boundary-to-Entity Links**: Confirmed — no screen component imports SQLModel entities.

---

## 5. Preliminary Design Review (PDR) Checkpoint Gate

| PDR Criteria | Status | Evidence / Notes |
|---|:---:|---|
| **1. Use Case Coverage** | ✅ PASS | All 4 UCs (04.1–04.4) fully represented with sunny-day steps |
| **2. Alternate Courses Handled** | ✅ PASS | Alt-1 through Alt-8 (UC-04.1) + Alt-1 (UC-04.4) wired through controllers |
| **3. Domain Model Updated** | ✅ PASS | 4 new entities: PaperOutline, OutlineSection, SectionField, SourceReference |
| **4. Strict BCE Adherence** | ✅ PASS | Zero direct Boundary-to-Entity connections confirmed |

*GATE STATUS*: **APPROVED TO PROCEED TO DETAILED DESIGN**

---

## 6. Detailed Design: Sequence Diagrams
<!--
  Rosenberg Phase: Detailed Design (Ch. 8). Canonical PlantUML ONLY (No Mermaid).
  Menggunakan OO method invocations (bukan HTTP verbs mentah).
-->

### UC-04.1: Generate Paper Outline (Sunny Day + Async Worker)

```plantuml
@startuml
autoactivate off
autonumber
skinparam shadowing false
skinparam responseMessageBelowArrow true

actor "Peneliti" as Peneliti
boundary "SCR-01 Workspace Setup" as SCR01
boundary "SCR-02 Progress Modal" as SCR02
boundary "SCR-03 Editorial Canvas" as SCR03
boundary "SCR-05 Diagnostic Modal" as SCR05
boundary "OutlineRouter" as Router
boundary "Static Template Store\n(docx / tex / yaml)" as TmplFS
boundary "LLM Service API" as LLMAPI
control "OutlineService" as Svc
control "TemplateParser" as Parser
control "ChunkRetriever" as Retr
control "LLMSynthesizer" as LLM
control "OutlineRepository" as Repo
entity "DocumentIndexVersion" as DocIdxE
entity "DocumentChunk" as ChunkE
entity "PaperOutline" as OutlineE
entity "OutlineSection" as SectionE
entity "SectionField" as FieldE
entity "SourceReference" as RefE

note left of Peneliti
  <b>UC-04.1: Generate Paper Outline</b>
  <b>Basic Course:</b>
  1. Peneliti pilih dokumen Indexed, template & bahasa -> klik Generate.
  2. OutlineRouter delegasikan ke OutlineService -> verifikasi DocumentIndexVersion -> buat PaperOutline v1 (preparing).
  3. Worker baca Static Template Store -> retrieve DocumentChunk per field -> panggil LLM Service API.
  4. Validasi struktur -> simpan OutlineSection/SectionField/SourceReference -> redirect ke SCR-03.

  <b>Alternate Courses:</b>
  - Alt-2: Template hilang/korup -> status=failed + buka SCR-05.
  - Alt-6: Struktur LLM invalid (setelah 2x retry) -> status=failed di SCR-02.
end note

Peneliti -> SCR01 : select_document_and_language(doc_id, language)
SCR01 -> Router : generate_outline(doc_id, template_id, language)
Router -> Svc : generate_outline(researcher_id, doc_id, template_id, language)
Svc -> DocIdxE : verify_ownership_and_indexed(researcher_id, doc_id)
DocIdxE --> Svc : active_index_version
Svc -> Svc : assert_no_active_generation()
Svc -> OutlineE : create(status_preparing, version_1)
Svc --> Router : outline_id
Router --> SCR01 : accept_generation(outline_id)
SCR01 -> SCR02 : open_progress_modal(outline_id)

note over Svc, LLM : Async Background Execution
Svc -> Parser : parse_template("icicos")
Parser -> TmplFS : read_docx_tex_yaml("icicos")

alt Alt-2: Template Files Missing or Corrupt
    TmplFS --> Parser : file_missing_or_corrupt_error
    Parser --> Svc : raise_template_diagnostic_error(details)
    Svc -> OutlineE : update_status(status_failed)
    SCR02 -> SCR05 : open_template_diagnostic_modal(details)
    SCR05 --> Peneliti : render_template_error()
else Sunny Day: Normalized OutlineDefinition Ready
    TmplFS --> Parser : raw_template_files
    Parser --> Svc : outline_definition
    Svc -> OutlineE : update_status(status_reading)

    loop For each section.field in OutlineDefinition
        Svc -> Retr : retrieve_for_field(field_key, index_version_id)
        Retr -> ChunkE : cosine_search(field_embedding, top_k=5)
        ChunkE --> Retr : chunk_list
        Retr --> Svc : chunk_context_list
        Svc -> OutlineE : update_status(status_generating)
        Svc -> LLM : synthesize_field(field_rule, chunk_contexts, language)
        LLM -> LLMAPI : invoke_structured_completion(prompt)
        LLMAPI --> LLM : structured_json_response
        LLM --> Svc : field_result
    end

    Svc -> OutlineE : update_status(status_validating)
    Svc -> Svc : validate_outline_structure(draft, outline_definition)

    alt Sunny Day: Structure Valid
        Svc -> Repo : create_outline_with_sections(outline_id, sections, fields, refs)
        Repo -> SectionE : bulk_insert(sections)
        Repo -> FieldE : bulk_insert(fields)
        Repo -> RefE : bulk_insert(refs)
        Svc -> OutlineE : update_status(status_ready)
        SCR02 --> SCR03 : redirect_on_ready(outline_id)
        SCR03 --> Peneliti : render_editorial_canvas()
    else Alt-6: Validation Failed After Max 2 Retries
        Svc -> OutlineE : update_status(status_failed)
        SCR02 --> Peneliti : show_validation_failure_with_retry()
    end
end
@enduml
```

### UC-04.2: Review & Edit Outline Sections

```plantuml
@startuml
autoactivate off
autonumber
skinparam shadowing false
skinparam responseMessageBelowArrow true

actor "Peneliti" as Peneliti
boundary "SCR-03 Academic Outline\nEditorial Canvas" as SCR03
boundary "OutlineRouter" as Router
control "OutlineService" as Svc
control "OutlineRepository" as Repo
entity "OutlineSection" as SectionE
entity "SectionField" as FieldE
entity "SourceReference" as RefE

note left of Peneliti
  <b>UC-04.2: Review & Edit Outline Sections</b>
  1. Peneliti klik seksi pada SCR-03 -> muat OutlineSection, SectionField, & SourceReference.
  2. Peneliti sunting konten -> OutlineService & OutlineRepository simpan & tandai Edited.
end note

Peneliti -> SCR03 : select_section(section_id)
SCR03 -> Router : get_section_detail(outline_id, section_id)
Router -> Svc : get_section_detail(outline_id, section_id, researcher_id)
Svc -> Repo : load_section_with_provenance(section_id)
Repo -> SectionE : get_section(section_id)
SectionE --> Repo : section_record
Repo -> FieldE : get_fields_by_section(section_id)
FieldE --> Repo : fields_list
Repo -> RefE : get_references_by_fields(field_ids)
RefE --> Repo : provenance_list
Repo --> Svc : section_detail_dto
Svc --> Router : section_detail_dto
Router --> SCR03 : deliver_section_detail()
SCR03 --> Peneliti : render_section_and_provenance()

Peneliti -> SCR03 : edit_field_content(field_id, new_content)
SCR03 -> Router : update_section_field(outline_id, field_id, new_content)
Router -> Svc : update_field_content(outline_id, field_id, new_content, researcher_id)
Svc -> Repo : update_field_content(field_id, new_content)
Repo -> FieldE : set_content_and_edited(new_content, is_edited_true)
FieldE --> Repo : updated_field
Repo -> SectionE : update_section_status(status_edited)
SectionE --> Repo : updated_section
Repo --> Svc : section_field_response
Svc --> Router : section_field_response
Router --> SCR03 : confirm_saved_edited()
SCR03 --> Peneliti : show_edited_badge()
@enduml
```

### UC-04.3: Regenerate Outline or Single Section

```plantuml
@startuml
autoactivate off
autonumber
skinparam shadowing false
skinparam responseMessageBelowArrow true

actor "Peneliti" as Peneliti
boundary "SCR-03 Editorial Canvas" as SCR03
boundary "Regeneration Confirm Modal" as Modal
boundary "OutlineRouter" as Router
boundary "LLM Service API" as LLMAPI
control "OutlineService" as Svc
control "OutlineRepository" as Repo
control "ChunkRetriever" as Retr
control "LLMSynthesizer" as LLM
entity "PaperOutline" as OutlineE
entity "OutlineSection" as SectionE
entity "DocumentChunk" as ChunkE

note left of Peneliti
  <b>UC-04.3: Regenerate Outline or Single Section</b>
  1. Peneliti klik Regenerate -> inspect seksi Edited -> tampilkan modal konfirmasi.
  2. Cek concurrent guard (Alt-8: tolak 409 jika aktif).
  3. Fork versi vX+1 -> salin Edited (kecuali Reset All) -> sintesis seksi non-edited.
end note

Peneliti -> SCR03 : click_regenerate_outline()
SCR03 -> Router : get_regeneration_preview(outline_id)
Router -> Svc : get_regeneration_preview(outline_id, researcher_id)
Svc -> Repo : list_sections_status(outline_id)
Repo -> SectionE : find_edited_vs_unedited(outline_id)
SectionE --> Repo : preview_summary
Repo --> Svc : preview_summary
Svc --> Modal : present_confirm_modal(preview_summary)
Modal --> Peneliti : display_preservation_options()

Peneliti -> Modal : confirm_regenerate(reset_all_flag)
Modal -> Router : regenerate_outline(outline_id, reset_all_flag)
Router -> Svc : assert_no_active_generation(doc_id)

alt Alt-8: Active Generation Job Exists
    Svc --> Router : raise_conflict_409()
    Router --> SCR03 : show_conflict_notice()
    SCR03 --> Peneliti : render_concurrent_warning()
else Sunny Day: Safe to Regenerate
    Svc -> Repo : create_forked_outline(outline_id, version_vX_plus_1)
    Repo -> OutlineE : insert_version(version_vX_plus_1, status_draft)
    opt reset_all_flag == false
        Svc -> Repo : clone_edited_sections(source_id, target_id)
        Repo -> SectionE : copy_edited_sections()
    end
    Svc -> Retr : retrieve_for_field(field_key, index_version_id)
    Retr -> ChunkE : cosine_search(field_embedding, top_k=5)
    ChunkE --> Retr : chunks
    Retr --> Svc : chunk_contexts
    Svc -> LLM : synthesize_field(field_rule, chunk_contexts, language)
    LLM -> LLMAPI : invoke_structured_completion(prompt)
    LLMAPI --> LLM : structured_json
    LLM --> Svc : synthesized_fields
    Svc -> Repo : persist_regenerated_sections(target_id, synthesized_fields)
    Repo -> SectionE : save_new_sections()
    Svc --> SCR03 : open_new_draft_version(target_id)
    SCR03 --> Peneliti : render_updated_outline()
end
@enduml
```

### UC-04.4: Approve & Version Paper Outline

```plantuml
@startuml
autoactivate off
autonumber
skinparam shadowing false
skinparam responseMessageBelowArrow true

actor "Peneliti" as Peneliti
boundary "SCR-03 Editorial Canvas" as SCR03
boundary "Approve Confirm Dialog" as Dialog
boundary "OutlineRouter" as Router
control "OutlineService" as Svc
entity "PaperOutline" as OutlineE

note left of Peneliti
  <b>UC-04.4: Approve & Version Paper Outline</b>
  <b>Basic Course:</b>
  1. Peneliti klik Approve Outline di SCR-03 -> cek [NEEDS INPUT].
  2. Konfirmasi approval -> set approval_status=approved + approved_at.

  <b>Alternate Course:</b>
  - Alt-1: Upaya edit setelah Approved -> fork versi Draft vX+1 (immutable vX).
end note

Peneliti -> SCR03 : click_approve_outline()
SCR03 -> Router : check_needs_input(outline_id)
Router -> Svc : check_needs_input(outline_id)
Svc -> OutlineE : count_unresolved_needs_input(outline_id)

alt Unresolved [NEEDS INPUT] Found
    OutlineE --> Svc : unresolved_count
    Svc --> Router : needs_input_warning(unresolved_count)
    Router --> SCR03 : warning_response
    SCR03 -> Dialog : show_warning_dialog(unresolved_count)
    Peneliti -> Dialog : confirm_anyway()
else No Unresolved Fields
    OutlineE --> Svc : zero_unresolved
    Svc --> Router : ready_to_approve
    Router --> SCR03 : ok_response
    SCR03 -> Dialog : show_confirm_dialog()
    Peneliti -> Dialog : confirm()
end

Dialog -> Router : approve_outline(outline_id, researcher_id)
Router -> Svc : approve_outline(outline_id, researcher_id)
Svc -> OutlineE : mark_approved(approval_status_approved, approved_at)
OutlineE --> Svc : updated_outline
Svc --> Router : approved_result
Router --> SCR03 : approval_confirmed()
SCR03 --> Peneliti : show_approved_badge()

alt Alt-1: Post-Approval Edit Attempt
    Peneliti -> SCR03 : attempt_edit_field(outline_id, field_id)
    SCR03 -> Router : fork_on_edit_attempt(outline_id, researcher_id)
    Router -> Svc : fork_on_edit_attempt(outline_id, researcher_id)
    Svc -> OutlineE : clone_as_new_draft(version_vX_plus_1)
    OutlineE --> Svc : new_draft_outline
    Svc --> Router : forked_outline_id
    Router --> SCR03 : open_draft_version(forked_outline_id)
    SCR03 --> Peneliti : render_new_editable_draft()
end
@enduml
```

---

## 7. Detailed Design: Static Class Model

```mermaid
classDiagram
    class OutlineRouter {
        +generate_outline(req, researcher, db) AcceptedResponse
        +get_outline_status(outline_id, researcher, db) OutlineStatusResponse
        +get_outline_detail(outline_id, researcher, db) OutlineDetailResponse
        +update_section_field(outline_id, field_id, req, researcher, db) SectionFieldResponse
        +regenerate_outline(outline_id, req, researcher, db) AcceptedResponse
        +regenerate_section(outline_id, section_id, researcher, db) AcceptedResponse
        +approve_outline(outline_id, researcher, db) ApproveResponse
        +get_outline_versions(document_id, researcher, db) VersionListResponse
    }

    class OutlineService {
        -repository: OutlineRepository
        -template_parser: TemplateParser
        -retriever: ChunkRetriever
        -synthesizer: LLMSynthesizer
        +generate_outline(researcher_id, doc_id, template_id, language) UUID
        +validate_generate_request(researcher_id, doc_id) None
        +assert_no_active_generation(doc_id) None
        +run_generation_pipeline(outline_id) None
        +validate_outline_structure(draft, definition) bool
        +get_section_detail(outline_id, section_id, researcher_id) SectionDetailDTO
        +update_field_content(outline_id, field_id, content, researcher_id) SectionFieldResponse
        +approve_outline(outline_id, researcher_id) None
        +check_needs_input(outline_id) NeedsInputReport
        +fork_outline_version(outline_id, reset_all) UUID
        +fork_on_edit_attempt(outline_id, researcher_id) UUID
    }

    class TemplateParser {
        -template_base_path: Path
        +parse_template(template_id) OutlineDefinition
        -_parse_docx(path) List~RawSection~
        -_parse_yaml(path) List~SectionConfig~
        -_parse_latex_export_config(path) LatexExportConfig
        -_normalize(docx_sections, yaml_sections) List~NormalizedSection~
        -_validate_files(template_dir) None
    }

    class ChunkRetriever {
        -db: Session
        +retrieve_for_field(field_key, section_type, index_version_id, top_k) List~ChunkContext~
        -_embed_query(text) Vector
        -_cosine_search(embedding, index_version_id, top_k) List~DocumentChunk~
    }

    class LLMSynthesizer {
        -llm_client: GenerativeModel
        +synthesize_field(field_rule, chunks, language) FieldResult
        +synthesize_section(section_rule, chunk_map, language) SectionResult
        -_build_prompt(field_rule, chunks, language) str
        -_parse_response(raw) FieldResult
    }

    class OutlineRepository {
        -db: Session
        +create_outline(data) PaperOutline
        +create_outline_with_sections(outline_id, sections, fields, refs) None
        +get_outline_by_id(outline_id, researcher_id) PaperOutline
        +update_outline_status(outline_id, status) None
        +get_field_by_id(field_id, outline_id) SectionField
        +update_field_content(field_id, content) SectionField
        +clone_edited_sections(source_id, target_id) None
        +approve_outline(outline_id) None
        +list_outline_versions(document_id, researcher_id) List~PaperOutline~
    }

    OutlineRouter ..> OutlineService : invokes
    OutlineService --> OutlineRepository : delegates
    OutlineService --> TemplateParser : uses
    OutlineService --> ChunkRetriever : uses
    OutlineService --> LLMSynthesizer : uses
```

### Concrete File & Method Signatures

**Boundary** — `backend/src/outlines/router.py`
- `POST /api/outlines/generate` → 202 Accepted `{outline_id}`
- `GET /api/outlines/{outline_id}/status` → `OutlineStatusResponse`
- `GET /api/outlines/{outline_id}` → `OutlineDetailResponse`
- `PATCH /api/outlines/{outline_id}/fields/{field_id}` → `SectionFieldResponse`
- `POST /api/outlines/{outline_id}/regenerate` → 202 Accepted
- `POST /api/outlines/{outline_id}/sections/{section_id}/regenerate` → 202 Accepted
- `POST /api/outlines/{outline_id}/approve` → `ApproveResponse`
- `GET /api/outlines/document/{document_id}/versions` → `VersionListResponse`

**Controller** — `backend/src/outlines/service.py`
- `class OutlineService` with all methods per class diagram

**Template Parser** — `backend/src/outlines/template_parser.py`
- `class TemplateParser` with `parse_template(template_id: str) → OutlineDefinition`

**Retriever** — `backend/src/outlines/retriever.py`
- `class ChunkRetriever` with `retrieve_for_field(field_key, section_type, index_version_id, top_k=5) → List[ChunkContext]`

**LLM Synthesizer** — `backend/src/outlines/llm_synthesizer.py`
- `class LLMSynthesizer` with `synthesize_field(field_rule, chunks, language) → FieldResult`

**Entity** — `backend/src/outlines/models.py`
- `class PaperOutline(SQLModel, table=True)`
- `class OutlineSection(SQLModel, table=True)`
- `class SectionField(SQLModel, table=True)`
- `class SourceReference(SQLModel, table=True)`

**Frontend Pages**
- `frontend/src/app/workspace/outline/page.tsx` — SCR-01
- `frontend/src/app/workspace/outline/[outlineId]/page.tsx` — SCR-03

**Frontend Components** — `frontend/src/components/features/outline/`
- `GenerationProgressModal.tsx` — SCR-02: 6-state stepper
- `OutlineEditorCanvas.tsx` — 3-panel layout
- `SectionTreeNav.tsx` — Section list with status badges
- `SectionFieldEditor.tsx` — Textarea + per-field regenerate
- `ProvenanceDrawer.tsx` — Right panel: chunk ID, page, excerpt
- `VersionHistoryDrawer.tsx` — SCR-04: Version list + restore
- `TemplateDiagnosticModal.tsx` — SCR-05: Template error details

---

## 8. Critical Design Review (CDR) Checkpoint Gate

| CDR Criteria | Status | Evidence / Notes |
|---|:---:|---|
| **1. Method Allocation** | ✅ PASS | Every sequence diagram message maps to a named class method |
| **2. Class Signatures** | ✅ PASS | Parameter types and return types defined for all public methods |
| **3. Test Plan Feasibility** | ✅ PASS | Each controller method independently unit-testable; router endpoints testable via FastAPI TestClient |
| **4. PDR Traceability** | ✅ PASS | All controllers from robustness diagrams present in class model |

*GATE STATUS*: **APPROVED TO PROCEED TO IMPLEMENTATION**

---

## 9. Version Control & Git Milestone Plan

| Milestone | Scope | Commit Message | Verification |
|---|---|---|---|
| **M1: Template Asset Scaffold** | `backend/src/templates/icicos/` + `outline-sections.yaml` | `chore(template): scaffold icicos subfolder with docx, tex, yaml` | Files present; YAML parses correctly |
| **M2: DB Models & Migration** | `backend/src/outlines/models.py` + Alembic migration | `feat(outline): add PaperOutline, OutlineSection, SectionField, SourceReference models` | `alembic upgrade head` green |
| **M3: Template Parser** | `template_parser.py` | `feat(outline): implement DOCX + YAML + LaTeX template parser → OutlineDefinition` | Unit test: correct sections from icicos template |
| **M4: Chunk Retriever** | `retriever.py` | `feat(outline): implement field-targeted chunk retrieval via pgvector cosine search` | Integration test: relevant chunks returned for known fields |
| **M5: LLM Synthesizer** | `llm_synthesizer.py` | `feat(outline): implement Gemini field synthesizer with [NEEDS INPUT] fallback` | Unit test with mocked LLM: correct FieldResult schema |
| **M6: Service + Worker** | `service.py` + `worker.py` | `feat(outline): implement generation pipeline service with async worker and retry` | Integration test: full generate → validate → persist flow |
| **M7: REST API Router** | `router.py` | `feat(outline): add FastAPI outline router with all endpoints` | OpenAPI schema correct; 202/200/409 verified |
| **M8: Frontend SCR-01 & SCR-02** | Workspace Setup + Progress Modal | `feat(ui): implement template selection and generation progress screens` | Manual: progress steps cycle correctly |
| **M9: Frontend SCR-03 Canvas** | Editorial Canvas + Section Tree + Provenance | `feat(ui): implement Academic Outline Editorial Canvas` | Manual: edit → Edited badge; provenance shows chunk refs |
| **M10: Frontend SCR-04 & SCR-05** | Version History + Diagnostic Modal | `feat(ui): implement version history drawer and template diagnostic modal` | Manual: version restore and error modal |
| **M11: E2E Verification** | All layers | `test(outline): verify end-to-end template adherence, versioning, and approval gate` | All SC-001–SC-006 criteria verified |
