# Research: UC-04 Template-Based Paper Outline Generation

**Feature**: UC-04 | **Branch**: `004-paper-outline-generation` | **Date**: 2026-09-29  
**Purpose**: Resolve all NEEDS CLARIFICATION items from Technical Context in plan.md

---

## 1. DOCX Parsing Strategy

**Decision**: Use `python-docx` library  
**Rationale**: The iciCos template (`conference-template-a4.docx`) is a standard IEEE DOCX. `python-docx` parses paragraph styles (Heading 1, Heading 2, Normal) and table structures cleanly. No OCR needed — document is machine-readable. Sections are identified by `Heading 1` style paragraphs.  
**Alternatives considered**:  
- Raw XML parsing via `zipfile` + `xml.etree.ElementTree`: More brittle, harder to maintain across docx versions.  
- Apache Tika: Overkill for a known, controlled template file; adds Java dependency.

**Implementation note**: The parser will build a list of `RawSection(title: str, order: int, heading_level: int)` from the DOCX. The `outline-sections.yaml` then provides the field-level granularity.

---

## 2. LaTeX Template Role

**Decision**: LaTeX file (`template.tex`) is used only for export configuration — NOT for outline structure authority.  
**Rationale**: The DOCX is the human-readable authoring format that defines section names and order. The LaTeX file defines `\documentclass`, bibliography commands (`\bibliographystyle{IEEEtran}`), and column layout — not content structure. The spec's precedence rule (DOCX > LaTeX for structure) is confirmed by inspecting the existing `backend/src/templates/` files.  
**Alternatives considered**:  
- Parsing LaTeX `\section{}` commands as outline authority: Rejected — LaTeX sections in IEEE templates are often generic placeholders, not the canonical section list.

---

## 3. `outline-sections.yaml` Schema Design

**Decision**: YAML file defines body sections with fields, field labels, field types, and guidance notes.  
**Rationale**: The DOCX template for IEEE iciCos conference does not explicitly enumerate all body subsections (Introduction sub-fields, Methodology sub-fields, etc.). These come from academic writing conventions. The YAML externalizes this without code changes.

**Proposed schema**:
```yaml
sections:
  - key: introduction
    title: "I. INTRODUCTION"
    is_required: true
    order: 1
    fields:
      - key: background
        label: "Background"
        guidance: "Situate the research in its broader academic context (1–3 sentences)."
        order: 1
      - key: problem_statement
        label: "Problem Statement"
        guidance: "State the specific problem or research gap addressed (1–2 sentences)."
        order: 2
      - key: research_gap
        label: "Research Gap"
        guidance: "Identify what prior work has not addressed (1–2 sentences)."
        order: 3
      - key: objective
        label: "Objective"
        guidance: "State the research objective or contribution (1–2 sentences)."
        order: 4
  - key: related_work
    title: "II. RELATED WORK"
    is_required: true
    order: 2
    fields:
      - key: prior_approaches
        label: "Prior Approaches"
        guidance: "Summarize key prior methods or systems (1–3 sentences)."
        order: 1
      - key: limitations
        label: "Limitations of Prior Work"
        guidance: "Identify gaps or weaknesses in prior work that motivate this paper (1–2 sentences)."
        order: 2
  - key: methodology
    title: "III. METHODOLOGY"
    is_required: true
    order: 3
    fields:
      - key: dataset_materials
        label: "Dataset / Materials"
        guidance: "Describe datasets, tools, or experimental materials used (1–2 sentences)."
        order: 1
      - key: proposed_method
        label: "Proposed Method"
        guidance: "Describe the proposed approach, algorithm, or system architecture (2–3 sentences)."
        order: 2
      - key: evaluation_metrics
        label: "Evaluation Metrics"
        guidance: "State evaluation criteria or metrics used (1–2 sentences)."
        order: 3
  - key: results
    title: "IV. RESULTS AND DISCUSSION"
    is_required: true
    order: 4
    fields:
      - key: key_findings
        label: "Key Findings"
        guidance: "Summarize primary experimental results or observations (1–3 sentences)."
        order: 1
      - key: comparison
        label: "Comparison with Baseline / Prior Work"
        guidance: "Compare results with baseline or related methods (1–2 sentences)."
        order: 2
  - key: conclusion
    title: "V. CONCLUSION"
    is_required: true
    order: 5
    fields:
      - key: summary
        label: "Summary"
        guidance: "Concisely state what was achieved in this work (1–2 sentences)."
        order: 1
      - key: future_work
        label: "Future Work"
        guidance: "State planned or suggested future research directions (1–2 sentences)."
        order: 2
# Components taken directly from DOCX template structure:
template_components:
  - key: title
    title: "Paper Title"
    is_required: true
    order: 0
    source: docx_component
  - key: abstract
    title: "Abstract"
    is_required: true
    order: 6
    source: docx_component
    fields:
      - key: abstract_text
        label: "Abstract"
        guidance: "Summarize the paper in 150–250 words covering problem, method, results, and conclusion."
        order: 1
  - key: keywords
    title: "Index Terms / Keywords"
    is_required: true
    order: 7
    source: docx_component
    fields:
      - key: keywords_list
        label: "Keywords"
        guidance: "List 4–6 IEEE-style index terms."
        order: 1
```

**Alternatives considered**:  
- JSON schema: Less human-editable. YAML preferred for authoring by non-developers.  
- Hardcoded Python dict: Rejected — violates the no-code-change template extension principle.

---

## 4. LLM Provider & Structured Output

**Decision**: Google Gemini `gemini-2.0-flash` via `google-generativeai` SDK, using `response_mime_type="application/json"` with a JSON schema specified in the system prompt.  
**Rationale**: Already used in Telaah backend for other LLM tasks. Flash model is fast (low latency) and cheap. Structured JSON output mode ensures parseable responses without fragile regex.  
**Alternatives considered**:  
- OpenAI GPT-4o: Not in Telaah stack; would require new API key management.  
- Anthropic Claude: Same issue.  
- Gemini 1.5 Pro: More capable but slower/more expensive; flash is sufficient for 1–3 sentence per-field synthesis.

**LLM Prompt Strategy**:
- System prompt: Template section rules + field schema + anti-hallucination constraints + language instruction
- User content: Top-k chunk excerpts with chunk IDs and page numbers
- Output schema: `{"field_key": "...", "content": "...", "is_needs_input": bool, "chunk_refs": [{"chunk_id": "...", "page": N}]}`

---

## 5. Chunk Retrieval Strategy

**Decision**: Embed the field's `label + guidance` text → cosine similarity search against `document_chunks.embedding` (pgvector), filtered by the document's active `index_version_id`, top-k=5 per field.  
**Rationale**: Reuses UC-03's existing 768-dimensional embeddings (Google Embedding model via `pgvector`). No new vector index needed. Section metadata filter (`section_name`) can optionally narrow results for chapters with obvious mapping.  
**Alternatives considered**:  
- BM25 keyword search: Lower recall for semantic fields like "research gap". Cosine preferred.  
- Full-document context: Sending entire doc to LLM exceeds token limits and wastes inference cost.  
- Separate embedding store: Rejected (Ponytail P6 — reuse UC-03 infrastructure).

**Query text per field**:
- `background` → embed: "research background motivation context domain problem"
- `problem_statement` → embed: "research problem challenge limitation gap"
- `research_gap` → embed: "research gap missing prior work not addressed"
- `objective` → embed: "research objective goal contribution proposed"
- etc.

---

## 6. Async Generation & Status Polling

**Decision**: Use FastAPI `BackgroundTasks` for the generation pipeline. Frontend polls `GET /api/outlines/{id}/status` every 3 seconds until status is `ready` or `failed`.  
**Rationale**: Matches the UC-03 indexing worker pattern already in `backend/src/workers/`. No new infrastructure. Generation target is < 45 seconds (NFR-001).  
**Alternatives considered**:  
- WebSocket for real-time push: More complex; polling with 3s interval is acceptable for < 45s jobs.  
- Celery task queue: Only needed if job queue management/retry-at-scale is required; YAGNI for current scope.

---

## 7. Outline Versioning & Immutability

**Decision**: `version_number` integer on `PaperOutline`. Approved outlines: `approval_status='approved'` + `approved_at` timestamp. Application-level guard prevents any PATCH/PUT on approved outlines; instead creates a new `PaperOutline` row with `version_number = max(version) + 1` for the same `document_id`.  
**Rationale**: Simpler than DB-level triggers. Consistent with existing SQLModel pattern. Approved outlines are effectively immutable once saved.  
**Alternatives considered**:  
- DB trigger on UPDATE: More robust but harder to test and maintain across migrations.  
- Event sourcing / append-only log: Over-engineered for TA scope (Ponytail P6).

---

## All NEEDS CLARIFICATION: RESOLVED

| Item | Resolution |
|---|---|
| DOCX parsing library | `python-docx` ✅ |
| LaTeX role | Export config only; structure from DOCX + YAML ✅ |
| YAML schema | Defined above ✅ |
| LLM provider | Gemini Flash + JSON mode ✅ |
| Chunk retrieval | pgvector cosine, top-k=5 per field ✅ |
| Async execution | FastAPI BackgroundTasks + polling ✅ |
| Versioning | Application-level fork on edit/regen ✅ |
