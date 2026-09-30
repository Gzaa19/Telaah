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

### UC-04.1: Generate Paper Outline

```mermaid
flowchart TD
    classDef actor fill:#1e293b,stroke:#64748b,stroke-width:2px,color:#f8fafc
    classDef boundary fill:#0c4a6e,stroke:#0284c7,stroke-width:2px,color:#f0f9ff
    classDef controller fill:#451a03,stroke:#d97706,stroke-width:2px,color:#fef3c7
    classDef entity fill:#064e3b,stroke:#059669,stroke-width:2px,color:#ecfdf5

    ACTOR["Actor: Peneliti"]:::actor
    B_SCR01[/"Boundary: SCR-01 Workspace Setup & Template Selection"/]:::boundary
    B_SCR02[/"Boundary: SCR-02 Generation Progress Modal"/]:::boundary
    B_SCR03[/"Boundary: SCR-03 Academic Outline Editorial Canvas"/]:::boundary
    B_ERR[/"Boundary: SCR-05 Template Diagnostic Modal"/]:::boundary

    C_AUTH(["Controller: Validate Researcher Workspace & Document Ownership"]):::controller
    C_TMPL(["Controller: Load & Validate Template Files → OutlineDefinition"]):::controller
    C_RETR(["Controller: Retrieve Targeted Chunks per Section-Field"]):::controller
    C_LLM(["Controller: Synthesize Section Fields via LLM"]):::controller
    C_VAL(["Controller: Validate Outline Structure vs OutlineDefinition"]):::controller
    C_SAVE(["Controller: Persist Draft Outline v1"]):::controller

    E_DOC[("Entity: Document / DocumentIndexVersion")]:::entity
    E_CHUNK[("Entity: DocumentChunk (pgvector)")]:::entity
    E_OUTLINE[("Entity: PaperOutline")]:::entity
    E_SECTION[("Entity: OutlineSection")]:::entity
    E_FIELD[("Entity: SectionField")]:::entity
    E_REF[("Entity: SourceReference")]:::entity

    ACTOR -->|"1. Select Indexed Doc + Language, Click Generate"| B_SCR01
    B_SCR01 -->|"2. Dispatch generate request"| C_AUTH
    C_AUTH -->|"3. Verify ownership & Indexed status"| E_DOC
    C_AUTH -->|"Sunny Day"| C_TMPL
    C_AUTH -->|"Alt-1: Doc not Indexed"| B_SCR01
    C_TMPL -->|"4. Read docx + yaml + tex"| B_SCR02
    C_TMPL -->|"Alt-2: Missing/corrupt files"| B_ERR
    C_TMPL -->|"Alt-3: Inconsistency → log + continue"| C_RETR
    C_RETR -->|"5. Cosine search chunks per field"| E_CHUNK
    C_RETR -->|"6. Pass chunks + field rules"| C_LLM
    C_LLM -->|"7. Synthesize 1-2 bullets or [NEEDS INPUT]"| C_VAL
    C_VAL -->|"Alt-6: Schema mismatch → retry max 2x"| C_LLM
    C_VAL -->|"Alt-6 final fail → status=Failed"| B_SCR02
    C_VAL -->|"8. Valid → Save"| C_SAVE
    C_SAVE -->|"Write PaperOutline v1"| E_OUTLINE
    C_SAVE -->|"Write sections"| E_SECTION
    C_SAVE -->|"Write fields"| E_FIELD
    C_SAVE -->|"Write provenance"| E_REF
    C_SAVE -->|"Ready for Review"| B_SCR03
```

### UC-04.2: Review & Edit Outline Sections

```mermaid
flowchart TD
    classDef actor fill:#1e293b,stroke:#64748b,stroke-width:2px,color:#f8fafc
    classDef boundary fill:#0c4a6e,stroke:#0284c7,stroke-width:2px,color:#f0f9ff
    classDef controller fill:#451a03,stroke:#d97706,stroke-width:2px,color:#fef3c7
    classDef entity fill:#064e3b,stroke:#059669,stroke-width:2px,color:#ecfdf5

    ACTOR["Actor: Peneliti"]:::actor
    B_CANVAS[/"Boundary: SCR-03 Academic Outline Editorial Canvas"/]:::boundary
    C_LOAD(["Controller: Load Section Content & Provenance"]):::controller
    C_SAVE_EDIT(["Controller: Save Edited Field → Mark is_edited=True"]):::controller
    E_FIELD[("Entity: SectionField")]:::entity
    E_REF[("Entity: SourceReference")]:::entity

    ACTOR -->|"1. Click section in tree"| B_CANVAS
    B_CANVAS -->|"2. Fetch section detail"| C_LOAD
    C_LOAD -->|"3. Read fields"| E_FIELD
    C_LOAD -->|"3a. Read provenance"| E_REF
    C_LOAD -->|"4. Return section + chunks"| B_CANVAS
    B_CANVAS -->|"5. Peneliti edits textarea"| C_SAVE_EDIT
    C_SAVE_EDIT -->|"6. Update content, is_edited=True"| E_FIELD
    C_SAVE_EDIT -->|"7. Confirm save"| B_CANVAS
    B_CANVAS -->|"8. Show Edited badge"| ACTOR
```

### UC-04.3: Regenerate Outline or Single Section

```mermaid
flowchart TD
    classDef actor fill:#1e293b,stroke:#64748b,stroke-width:2px,color:#f8fafc
    classDef boundary fill:#0c4a6e,stroke:#0284c7,stroke-width:2px,color:#f0f9ff
    classDef controller fill:#451a03,stroke:#d97706,stroke-width:2px,color:#fef3c7
    classDef entity fill:#064e3b,stroke:#059669,stroke-width:2px,color:#ecfdf5

    ACTOR["Actor: Peneliti"]:::actor
    B_CANVAS[/"Boundary: SCR-03 Editorial Canvas"/]:::boundary
    B_MODAL[/"Boundary: Regeneration Confirm Modal"/]:::boundary
    C_GUARD(["Controller: Check Concurrent Request Guard"]):::controller
    C_FORK(["Controller: Fork New Outline Version vX+1"]):::controller
    C_PRESERVE(["Controller: Copy Edited Sections to New Version"]):::controller
    C_REGEN(["Controller: Re-run Retrieval + LLM Synthesis"]):::controller
    C_SAVE_R(["Controller: Persist New Outline Version"]):::controller
    E_OUTLINE[("Entity: PaperOutline")]:::entity
    E_SECTION[("Entity: OutlineSection")]:::entity

    ACTOR -->|"1. Click Regenerate Entire Outline"| B_CANVAS
    B_CANVAS -->|"2. Show confirm modal"| B_MODAL
    ACTOR -->|"3. Confirm (with/without Reset All)"| B_MODAL
    B_MODAL -->|"4. Dispatch regen"| C_GUARD
    C_GUARD -->|"Alt-8: Concurrent job → 409"| B_CANVAS
    C_GUARD -->|"OK"| C_FORK
    C_FORK -->|"5. Create PaperOutline vX+1"| E_OUTLINE
    C_FORK -->|"6. If not Reset All"| C_PRESERVE
    C_PRESERVE -->|"Clone Edited sections"| E_SECTION
    C_FORK -->|"7. Trigger regen for non-edited"| C_REGEN
    C_REGEN -->|"Same pipeline as UC-04.1"| C_SAVE_R
    C_SAVE_R -->|"8. Persist new version"| E_SECTION
    C_SAVE_R -->|"Done"| B_CANVAS
```

### UC-04.4: Approve & Version Paper Outline

```mermaid
flowchart TD
    classDef actor fill:#1e293b,stroke:#64748b,stroke-width:2px,color:#f8fafc
    classDef boundary fill:#0c4a6e,stroke:#0284c7,stroke-width:2px,color:#f0f9ff
    classDef controller fill:#451a03,stroke:#d97706,stroke-width:2px,color:#fef3c7
    classDef entity fill:#064e3b,stroke:#059669,stroke-width:2px,color:#ecfdf5

    ACTOR["Actor: Peneliti"]:::actor
    B_CANVAS[/"Boundary: SCR-03 Editorial Canvas"/]:::boundary
    B_CONFIRM[/"Boundary: Approve Confirm Dialog"/]:::boundary
    C_CHECK(["Controller: Check NEEDS INPUT Presence"]):::controller
    C_LOCK(["Controller: Set Outline Status to Approved + Timestamp"]):::controller
    C_FORK_EDIT(["Controller: Fork New Draft vX+1 on Post-Approval Edit Attempt"]):::controller
    E_OUTLINE[("Entity: PaperOutline")]:::entity

    ACTOR -->|"1. Click Approve Outline"| B_CANVAS
    B_CANVAS -->|"2. Trigger approval check"| C_CHECK
    C_CHECK -->|"3a. Unresolved NEEDS INPUT → warning"| B_CONFIRM
    C_CHECK -->|"3b. All clear → confirm"| B_CONFIRM
    ACTOR -->|"4. Confirm approval"| B_CONFIRM
    B_CONFIRM -->|"5. Lock"| C_LOCK
    C_LOCK -->|"6. approval_status=approved, approved_at=now()"| E_OUTLINE
    C_LOCK -->|"7. Show Approved badge"| B_CANVAS
    ACTOR -->|"Alt-1: Try to edit Approved outline"| B_CANVAS
    B_CANVAS -->|"Fork check"| C_FORK_EDIT
    C_FORK_EDIT -->|"Create vX+1 Draft"| E_OUTLINE
    C_FORK_EDIT -->|"Open new draft in canvas"| B_CANVAS
```

### BCE Inventory & Method Allocation

| BCE Type | Element Name | Concrete Allocation |
|---|---|---|
| **Boundary** | SCR-01 Workspace Setup View | `frontend/src/app/workspace/outline/page.tsx` |
| **Boundary** | SCR-02 Generation Progress Modal | `frontend/src/components/features/outline/GenerationProgressModal.tsx` |
| **Boundary** | SCR-03 Academic Outline Editorial Canvas | `frontend/src/app/workspace/outline/[outlineId]/page.tsx` + `OutlineEditorCanvas.tsx` |
| **Boundary** | SCR-04 Version History Drawer | `frontend/src/components/features/outline/VersionHistoryDrawer.tsx` |
| **Boundary** | SCR-05 Template Diagnostic Modal | `frontend/src/components/features/outline/TemplateDiagnosticModal.tsx` |
| **Controller** | Validate Researcher Workspace & Document Ownership | `OutlineService.validate_generate_request()` |
| **Controller** | Load & Validate Template Files → OutlineDefinition | `TemplateParser.parse_template()` |
| **Controller** | Retrieve Targeted Chunks per Section-Field | `ChunkRetriever.retrieve_for_field()` |
| **Controller** | Synthesize Section Fields via LLM | `LLMSynthesizer.synthesize_field()` |
| **Controller** | Validate Outline Structure vs OutlineDefinition | `OutlineService.validate_outline_structure()` |
| **Controller** | Persist Draft Outline v1 | `OutlineRepository.create_outline_with_sections()` |
| **Controller** | Load Section Content & Provenance | `OutlineService.get_section_detail()` |
| **Controller** | Save Edited Section Field → Mark Edited | `OutlineService.update_field_content()` |
| **Controller** | Check Concurrent Request Guard | `OutlineService.assert_no_active_generation()` |
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

### UC-04.1: Generate Paper Outline (Sunny Day + Async Worker)

```mermaid
sequenceDiagram
    autonumber
    actor Peneliti as Actor: Peneliti
    participant SCR01 as Boundary: SCR-01 Workspace Setup
    participant SCR02 as Boundary: SCR-02 Progress Modal
    participant SCR03 as Boundary: SCR-03 Editorial Canvas
    participant Router as Boundary: POST /api/outlines/generate
    participant Svc as Controller: OutlineService
    participant Parser as Controller: TemplateParser
    participant Retr as Controller: ChunkRetriever
    participant LLM as Controller: LLMSynthesizer
    participant Repo as Controller: OutlineRepository
    participant ChunkE as Entity: DocumentChunk
    participant OutlineE as Entity: PaperOutline
    participant FieldE as Entity: SectionField
    participant RefE as Entity: SourceReference

    Peneliti->>SCR01: select_document(), select_language(), click_generate()
    SCR01->>Router: POST /api/outlines/generate
    Router->>Svc: generate_outline(researcher_id, doc_id, template_id, language)
    Svc->>Svc: validate_generate_request()
    Svc->>Svc: assert_no_active_generation()
    Svc->>OutlineE: create(status=preparing, version=1)
    Svc-->>Router: outline_id
    Router-->>SCR01: 202 Accepted {outline_id}
    SCR01->>SCR02: open_progress_modal(outline_id)

    Note over Svc,LLM: Background Worker
    Svc->>Parser: parse_template("icicos")
    Parser-->>Svc: OutlineDefinition
    Svc->>OutlineE: update(status=reading)

    loop For each section.field in OutlineDefinition
        Svc->>Retr: retrieve_for_field(field_key, index_version_id)
        Retr->>ChunkE: cosine_search(field_embedding, top_k=5)
        ChunkE-->>Retr: List~Chunk~
        Retr-->>Svc: List~ChunkContext~
        Svc->>OutlineE: update(status=generating)
        Svc->>LLM: synthesize_field(field_rule, chunk_contexts, language)
        LLM-->>Svc: FieldResult
    end

    Svc->>Svc: validate_outline_structure(draft, OutlineDefinition)
    Svc->>OutlineE: update(status=validating)
    Svc->>Repo: create_outline_with_sections(outline_id, sections, fields, refs)
    Repo->>FieldE: bulk_insert(fields)
    Repo->>RefE: bulk_insert(refs)
    Svc->>OutlineE: update(status=ready)
    SCR02-->>SCR03: redirect on status=ready
    SCR03-->>Peneliti: render_editorial_canvas()
```

### UC-04.4: Approve Outline

```mermaid
sequenceDiagram
    autonumber
    actor Peneliti as Actor: Peneliti
    participant SCR03 as Boundary: SCR-03 Editorial Canvas
    participant Dialog as Boundary: Approve Confirm Dialog
    participant Router as Boundary: POST /api/outlines/{id}/approve
    participant Svc as Controller: OutlineService
    participant OutlineE as Entity: PaperOutline

    Peneliti->>SCR03: click_approve_outline()
    SCR03->>Svc: check_needs_input(outline_id)
    Svc->>OutlineE: count required fields with is_needs_input=True
    alt Unresolved NEEDS INPUT found
        Svc-->>SCR03: warning response
        SCR03->>Dialog: show_warning_dialog()
        Peneliti->>Dialog: confirm_anyway()
    else No unresolved fields
        SCR03->>Dialog: show_confirm_dialog()
        Peneliti->>Dialog: confirm()
    end
    Dialog->>Router: POST /api/outlines/{id}/approve
    Router->>Svc: approve_outline(outline_id, researcher_id)
    Svc->>OutlineE: update(approval_status=approved, approved_at=now())
    Svc-->>Router: approved
    Router-->>SCR03: 200 OK
    SCR03-->>Peneliti: show_approved_badge()
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
