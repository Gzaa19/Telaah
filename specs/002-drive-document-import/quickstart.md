# Quickstart Validation Guide: Google Drive Document Import (UC-02)

**Branch**: `002-drive-document-import` | **Date**: 2026-09-19
**Purpose**: Runnable validation scenarios to prove UC-02 works end-to-end
**References**: [data-model.md](data-model.md) | [contracts/api.md](contracts/api.md) | [plan.md](plan.md)

---

## Prerequisites

1. **PostgreSQL** running with migration `002_document_import_schema.py` applied:
   ```bash
   cd backend && alembic upgrade head
   ```
2. **Redis** running (ARQ queue):
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```
3. **ARQ Worker** running:
   ```bash
   cd backend && python -m arq src.workers.worker.WorkerSettings
   ```
4. **FastAPI** server running:
   ```bash
   cd backend && uvicorn src.main:app --reload
   ```
5. **Frontend** dev server:
   ```bash
   cd frontend && bun dev
   ```
6. **Test user** authenticated via Google OAuth (UC-01 complete, session cookie active).
7. **Google Drive test files** prepared in test account Drive:
   - `test_paper.pdf` — Digital PDF with real text (>5 pages)
   - `test_paper_scan.pdf` — Scanned PDF (images only, no extractable text)
   - `test_paper_encrypted.pdf` — Password-protected PDF
   - `test_doc.docx` — DOCX file with paragraphs and tables
   - `test_image.jpg` — JPEG file (to validate type filter)

---

## Scenario 1: Browse Drive & Filter File Types ✅

**Goal**: Validate SC-001, SC-003 — File browser opens and only PDF/DOCX files are selectable.

```bash
# API validation
curl -s -b session.cookie "http://localhost:8000/api/drive/files?folder_id=root" | jq '.files[] | {name, file_type, can_import}'
```

**Expected**:
- `test_paper.pdf` → `can_import: true`
- `test_doc.docx` → `can_import: true`
- `test_image.jpg` → `can_import: false`
- Folders → `is_folder: true, can_import: false`

**Frontend**: Open `http://localhost:3000/library` → click "Tambah Dokumen". Verify non-PDF/DOCX files cannot be selected.

---

## Scenario 2: PDF Import Success (Happy Path) ✅

**Goal**: Validate SC-004, SC-005, SC-006, SC-007 — Import and extraction succeed, UC-03 is triggered.

```bash
# Step 1: Get drive_file_id for test_paper.pdf
FILE_ID=$(curl -s -b session.cookie "http://localhost:8000/api/drive/files?q=test_paper" | jq -r '.files[0].id')

# Step 2: Initiate import
RESULT=$(curl -s -b session.cookie -X POST "http://localhost:8000/api/documents/import" \
  -H "Content-Type: application/json" \
  -d "{\"drive_file_id\": \"$FILE_ID\", \"file_name\": \"test_paper.pdf\", \"file_type\": \"pdf\"}")
DOC_ID=$(echo $RESULT | jq -r '.document_id')
echo "Document ID: $DOC_ID"

# Step 3: Poll status until extracted (max 60 seconds)
for i in {1..20}; do
  STATUS=$(curl -s -b session.cookie "http://localhost:8000/api/documents/$DOC_ID/status" | jq -r '.import_status')
  echo "[$i] status: $STATUS"
  if [ "$STATUS" = "extracted" ] || [ "$STATUS" = "failed" ]; then break; fi
  sleep 3
done
```

**Expected**:
- Sequential status transitions: `importing → extracting → extracted`
- `indexing_status` transitions to `queued` shortly after `extracted` (UC-03 triggered)

**DB Validation**:
```sql
SELECT d.import_status, t.total_pages, COUNT(p.id) as page_count
FROM documents d
JOIN extracted_texts t ON t.document_id = d.id
JOIN extracted_pages p ON p.extracted_text_id = t.id
WHERE d.id = '<DOC_ID>'
GROUP BY d.import_status, t.total_pages;
-- Expected: import_status='extracted', total_pages > 0, page_count = total_pages
```

---

## Scenario 3: DOCX Import Success ✅

**Goal**: Validate FR-007, FR-008 — DOCX extracted with paragraphs and tables preserved.

```bash
FILE_ID=$(curl -s -b session.cookie "http://localhost:8000/api/drive/files?q=test_doc" | jq -r '.files[0].id')
curl -s -b session.cookie -X POST "http://localhost:8000/api/documents/import" \
  -H "Content-Type: application/json" \
  -d "{\"drive_file_id\": \"$FILE_ID\", \"file_name\": \"test_doc.docx\", \"file_type\": \"docx\"}" | jq
```

**Expected**: `202 Accepted`. Status reaches `extracted`. `extracted_texts.full_text` contains paragraph and table text.

---

## Scenario 4: Scanned PDF Import — Permanent Failure (Alt-5) ✅

**Goal**: Validate SC-009 — Scanned PDF produces human-readable error without automatic retry.

```bash
FILE_ID=$(curl -s -b session.cookie "http://localhost:8000/api/drive/files?q=test_paper_scan" | jq -r '.files[0].id')
DOC_ID=$(curl -s -b session.cookie -X POST "http://localhost:8000/api/documents/import" \
  -H "Content-Type: application/json" \
  -d "{\"drive_file_id\": \"$FILE_ID\", \"file_name\": \"test_paper_scan.pdf\", \"file_type\": \"pdf\"}" | jq -r '.document_id')

sleep 10
curl -s -b session.cookie "http://localhost:8000/api/documents/$DOC_ID/status" | jq '{import_status, failure_reason}'
```

**Expected**:
```json
{
  "import_status": "failed",
  "failure_reason": "PDF does not contain extractable text (likely a scanned image)."
}
```
**ARQ logs**: Task executed only once (no retry). No entry created in `extracted_texts`.

---

## Scenario 5: Duplicate Import — 409 Conflict (Alt-3) ✅

**Goal**: Validate SC-008 — Importing the same Drive file twice without `force_reimport` yields 409 Conflict.

```bash
# Using FILE_ID from Scenario 2 (test_paper.pdf already imported)
curl -s -b session.cookie -X POST "http://localhost:8000/api/documents/import" \
  -H "Content-Type: application/json" \
  -d "{\"drive_file_id\": \"$FILE_ID\", \"file_name\": \"test_paper.pdf\", \"file_type\": \"pdf\"}" | jq
```

**Expected**: `HTTP 409 Conflict` with `error_code: "DUPLICATE_DOCUMENT"` and existing `document_id`.

**Override test** (`force_reimport: true`):
```bash
curl -s -b session.cookie -X POST "http://localhost:8000/api/documents/import" \
  -H "Content-Type: application/json" \
  -d "{\"drive_file_id\": \"$FILE_ID\", \"file_name\": \"test_paper.pdf\", \"file_type\": \"pdf\", \"force_reimport\": true}" | jq
```
**Expected**: `HTTP 202 Accepted` — re-import process begins.

---

## Scenario 6: Retry Failed Import (UC-02b) ✅

**Goal**: Validate FR-012 — Failed documents can be retried.

```bash
# Using DOC_ID from Scenario 4 (Scanned PDF — status failed)
curl -s -b session.cookie -X POST "http://localhost:8000/api/documents/$DOC_ID/retry" | jq
```

**Expected**: `HTTP 202 Accepted` with `status: "importing"`.

---

## Scenario 7: Drive Change Detection via Checksum ✅

**Goal**: Validate SC-006 — `drive_md5_checksum` is persisted and used for content change detection.

```sql
-- Verify drive_md5_checksum is stored
SELECT file_name, drive_md5_checksum, import_status
FROM documents
WHERE file_name = 'test_paper.pdf';
-- Expected: drive_md5_checksum IS NOT NULL
```

---

## Expected Final State (After All Scenarios)

```sql
SELECT file_name, import_status, failure_reason
FROM documents
ORDER BY imported_at;
```

| `file_name` | `import_status` | `failure_reason` |
|---|---|---|
| `test_paper.pdf` | `extracted` | `null` |
| `test_doc.docx` | `extracted` | `null` |
| `test_paper_scan.pdf` | `failed` | `"PDF does not contain extractable text..."` |

---

## Pre-Implementation Checklist

- [ ] Scenarios 1–7 all pass in test environment
- [ ] ARQ worker runs cleanly without memory leaks
- [ ] `extracted_texts` + `extracted_pages` populated accurately for PDF and DOCX
- [ ] `documents.drive_md5_checksum` populated for successful imports
- [ ] UC-03 triggered automatically (`indexing_status: "queued"`) upon `extracted` status
- [ ] No modification to any Google Drive files (SC-010, read-only constraint)
