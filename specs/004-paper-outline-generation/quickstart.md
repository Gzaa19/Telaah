# Quickstart Validation Guide: UC-04 Paper Outline Generation

**Feature**: UC-04 | **Branch**: `004-paper-outline-generation` | **Date**: 2026-09-29  
**Purpose**: Runnable scenarios to validate the feature works end-to-end against success criteria SC-001–SC-006.

---

## Prerequisites

1. UC-01, UC-02, and UC-03 implemented and working (researcher authenticated, at least one document with status `indexed`).
2. Template assets in place: `backend/src/templates/icicos/template.docx`, `template.tex`, `outline-sections.yaml`.
3. Backend running: `cd backend && uvicorn src.main:app --reload`
4. Frontend running: `cd frontend && bun dev`
5. PostgreSQL running with pgvector extension enabled.

---

## Scenario 1: Successful Outline Generation (SC-001, SC-003)

**Goal**: Verify all mandatory iciCos template sections are present in correct order with provenance.

**Steps**:
1. Log in as a researcher with at least one `indexed` document.
2. Navigate to `/workspace/outline`.
3. Select the indexed document from the dropdown.
4. Confirm template card shows `iciCos IEEE Conference Template`.
5. Select language `English — Academic IEEE style`.
6. Click **Generate Outline**.
7. Observe the SCR-02 progress modal cycle through: Preparing → Reading Document → Generating → Validating → Ready for Review.
8. After redirect to SCR-03, verify the section tree contains all sections in order:
   - Abstract, Keywords, I. INTRODUCTION (with Background, Problem Statement, Research Gap, Objective), II. RELATED WORK, III. METHODOLOGY, IV. RESULTS AND DISCUSSION, V. CONCLUSION
9. Click each section and verify fields display either content or `[NEEDS INPUT]`.
10. Verify `[NEEDS INPUT]` fields have empty provenance panel; verify filled fields show at least one chunk reference with page number.

**Expected outcome**: SC-001 ✅ (all sections present in template order) | SC-003 ✅ (≥95% filled fields have chunk refs)

---

## Scenario 2: Anti-Hallucination Verification (SC-002)

**Goal**: Verify no fabricated content appears without provenance.

**Steps**:
1. After Scenario 1, expand any filled section field.
2. Click the chunk reference in the Provenance Drawer.
3. Verify the excerpt shown is actually text from the source document (cross-reference manually).
4. Check that no metric values, citation keys, or conclusions appear in fields that lack source references.

**Expected outcome**: SC-002 ✅ (0% hallucinated content without `[NEEDS INPUT]` marker)

---

## Scenario 3: Manual Edit & Edited Badge (SC-005)

**Goal**: Verify edited sections are protected from regeneration.

**Steps**:
1. Edit the `Background` field of the Introduction section.
2. Observe the `Edited` badge appears on the section in the tree nav.
3. Click **Regenerate Entire Outline**.
4. In the confirm modal, verify the list shows Introduction > Background as "will be preserved".
5. Confirm regeneration (without checking Reset All).
6. After completion, verify Introduction > Background still shows your edited text (unchanged).
7. Verify version number incremented from v1 to v2.

**Expected outcome**: SC-005 ✅ (Edited sections preserved; new version number created)

---

## Scenario 4: Approve Outline (SC-005, SC-006)

**Goal**: Verify approval locks the outline and protects it from overwrite.

**Steps**:
1. Open the outline (any status `ready` draft).
2. Click **Approve Outline**.
3. If any `[NEEDS INPUT]` fields exist: observe the warning dialog appears with a count.
4. Confirm approval.
5. Verify the `Approved` badge appears in the header.
6. Try editing a field on the approved outline.
7. Observe the dialog: "This outline has been approved. Editing will create a new draft (v3)."
8. Confirm. Verify a new draft v3 is created and shown in the editor.
9. Open Version History (SCR-04) and verify v2 (approved) is still present and read-only.

**Expected outcome**: SC-005 ✅ (immutable approved version) | SC-006 ✅ (review + edit + approve < 5 min)

---

## Scenario 5: Template Error Handling (SC-004)

**Goal**: Verify SCR-05 diagnostic modal on missing template files.

**Steps** (dev environment only):
1. Temporarily rename `backend/src/templates/icicos/outline-sections.yaml` to `outline-sections.yaml.bak`.
2. Attempt to generate a new outline.
3. Observe the Progress Modal transitions to `Failed`.
4. Verify the Template Diagnostic Modal (SCR-05) appears with a clear, actionable message.
5. Verify no stack trace is shown in the UI.
6. Restore the file.

**Expected outcome**: SC-004 ✅ (error message shown < 2 sec; no crash)

---

## Backend-Only Validation (API)

```bash
# 1. Generate outline (replace with real researcher token and document ID)
curl -X POST http://localhost:8000/api/outlines/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"document_id": "<uuid>", "template_id": "icicos", "language": "en_ieee"}'
# Expected: 202 {"outline_id": "..."}

# 2. Poll status
curl http://localhost:8000/api/outlines/<outline_id>/status \
  -H "Authorization: Bearer <token>"
# Expected: generation_status cycles to "ready"

# 3. Get detail
curl http://localhost:8000/api/outlines/<outline_id> \
  -H "Authorization: Bearer <token>"
# Expected: sections array with all template sections in order

# 4. Concurrent request guard test
curl -X POST http://localhost:8000/api/outlines/generate ... &
curl -X POST http://localhost:8000/api/outlines/generate ...
# Second request expected: 409 Conflict

# 5. Approve
curl -X POST http://localhost:8000/api/outlines/<outline_id>/approve \
  -H "Authorization: Bearer <token>"
# Expected: 200 {"approval_status": "approved"}
```

---

## Key Files to Check After Implementation

- [`backend/src/outlines/models.py`](../../../backend/src/outlines/models.py) — DB entities
- [`backend/src/outlines/template_parser.py`](../../../backend/src/outlines/template_parser.py) — DOCX + YAML parser
- [`backend/src/outlines/router.py`](../../../backend/src/outlines/router.py) — REST endpoints
- [`backend/src/templates/icicos/outline-sections.yaml`](../../../backend/src/templates/icicos/outline-sections.yaml) — section definitions
- [`frontend/src/app/workspace/outline/page.tsx`](../../../frontend/src/app/workspace/outline/page.tsx) — SCR-01
- API contracts: [contracts/outline-api.md](./contracts/outline-api.md)
- Data model: [data-model.md](./data-model.md)
