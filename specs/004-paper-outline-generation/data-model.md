# Data Model: UC-04 Template-Based Paper Outline Generation

**Feature**: UC-04 | **Branch**: `004-paper-outline-generation` | **Date**: 2026-09-29

---

## New Entities

### `PaperOutline`

Represents a versioned draft outline for a researcher's paper workspace.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default uuid4 | Primary key |
| `researcher_id` | UUID | FK → `researchers.id`, NOT NULL, INDEX | Ownership |
| `document_id` | UUID | FK → `documents.id`, NOT NULL, INDEX | Source document |
| `template_id` | VARCHAR(100) | NOT NULL | Template identifier (e.g., `icicos`) |
| `version_number` | INTEGER | NOT NULL, DEFAULT 1 | Version within same document |
| `language_choice` | ENUM | NOT NULL, DEFAULT `en_ieee` | `en_ieee` or `id_formal` |
| `generation_status` | ENUM | NOT NULL, DEFAULT `preparing` | See `GenerationStatusEnum` |
| `approval_status` | ENUM | NOT NULL, DEFAULT `draft` | `draft` or `approved` |
| `failure_reason` | TEXT | NULLABLE | Set when `generation_status=failed` |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| `approved_at` | TIMESTAMPTZ | NULLABLE | Set when approved |

**Indexes**:
- `(researcher_id, document_id)` — list outlines by researcher's document
- `(document_id, version_number)` — version lookup

**State transitions** (`approval_status`):
```
draft → approved
approved → (immutable; new draft fork = new row)
```

**State transitions** (`generation_status`):
```
preparing → reading → generating → validating → ready
                                              → failed
```

---

### `OutlineSection`

One row per section per `PaperOutline` version.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default uuid4 | Primary key |
| `outline_id` | UUID | FK → `paper_outlines.id`, NOT NULL, INDEX | Parent outline |
| `section_key` | VARCHAR(100) | NOT NULL | Stable section identifier (e.g., `introduction`) |
| `title` | VARCHAR(500) | NOT NULL | Official template title (e.g., `I. INTRODUCTION`) |
| `order_index` | INTEGER | NOT NULL | Display order |
| `is_required` | BOOLEAN | NOT NULL, DEFAULT TRUE | Whether section is mandatory |
| `section_status` | ENUM | NOT NULL, DEFAULT `needs_input` | `filled`, `needs_input`, `edited` |

**Indexes**:
- `(outline_id, order_index)` — ordered section list
- `(outline_id, section_key)` — section lookup by key

---

### `SectionField`

One row per field per `OutlineSection`.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default uuid4 | Primary key |
| `section_id` | UUID | FK → `outline_sections.id`, NOT NULL, INDEX | Parent section |
| `field_key` | VARCHAR(100) | NOT NULL | Stable field identifier (e.g., `background`) |
| `field_label` | VARCHAR(500) | NOT NULL | Display label |
| `content` | TEXT | NOT NULL, DEFAULT `[NEEDS INPUT]` | Field content (1–3 sentences or `[NEEDS INPUT]`) |
| `is_needs_input` | BOOLEAN | NOT NULL, DEFAULT TRUE | True if no source evidence found |
| `is_edited` | BOOLEAN | NOT NULL, DEFAULT FALSE | True if manually edited by researcher |
| `order_index` | INTEGER | NOT NULL | Display order within section |

**Indexes**:
- `(section_id, order_index)` — ordered field list

---

### `SourceReference`

Provenance record linking a `SectionField` to a `DocumentChunk`.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default uuid4 | Primary key |
| `field_id` | UUID | FK → `section_fields.id`, NOT NULL, INDEX | Parent field |
| `chunk_id` | UUID | FK → `document_chunks.id`, NOT NULL | Referenced chunk |
| `document_id` | UUID | FK → `documents.id`, NOT NULL | Source document |
| `page_number` | INTEGER | NULLABLE | Original page number in document |
| `excerpt_text` | TEXT | NOT NULL | Short excerpt from chunk for display |

**Indexes**:
- `(field_id)` — references per field

---

## Entity Relationships

```
Researcher
  └─ 1:* PaperOutline (researcher_id)
  
Document
  └─ 1:* PaperOutline (document_id)
  └─ 1:? DocumentIndexVersion → 1:* DocumentChunk

PaperOutline (1)
  └─ 1:* OutlineSection (outline_id)
       └─ 1:* SectionField (section_id)
                └─ 1:* SourceReference (field_id)
                         └─ → DocumentChunk (chunk_id) [read-only, UC-03]
```

---

## Enum Definitions

```python
# In backend/src/outlines/models.py

class OutlineLanguageEnum(str, Enum):
    en_ieee = "en_ieee"
    id_formal = "id_formal"

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

---

## Validation Rules

| Rule | Entity | Condition |
|---|---|---|
| Document must be `Indexed` | `PaperOutline` | `document.import_status == "indexed"` at generation time |
| No active generation for same doc | `PaperOutline` | Only one `generation_status IN (preparing, reading, generating, validating)` per `document_id` |
| Approved outlines are immutable | `PaperOutline` | No UPDATE when `approval_status = 'approved'` |
| New version on regen | `PaperOutline` | `version_number = SELECT MAX(version_number) + 1 FROM paper_outlines WHERE document_id = :doc_id AND researcher_id = :researcher_id` |
| Researcher owns outline | `PaperOutline` | `outline.researcher_id == current_researcher.id` on all operations |
| Section order invariant | `OutlineSection` | `order_index` values match `OutlineDefinition` — never mutated by LLM |

---

## Alembic Migration Notes

**Migration file**: `alembic/versions/XXXX_add_paper_outlines_uc04.py`

Required DDL operations:
1. Create enum types: `outline_language_enum`, `generation_status_enum`, `approval_status_enum`, `section_status_enum`
2. Create table `paper_outlines`
3. Create table `outline_sections`
4. Create table `section_fields`
5. Create table `source_references`
6. Create all indexes listed above

**Rollback**: All four tables dropped; enum types dropped.
