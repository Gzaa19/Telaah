# Quickstart Validation Guide: UC-03 Document Indexing and Local Embedding

**Feature Branch**: `003-document-indexing-embedding`
**Date**: 2026-09-22
**Purpose**: Panduan validasi end-to-end untuk memverifikasi implementasi UC-03 berfungsi sesuai spec.

> [!NOTE] Dokumen ini adalah panduan **validasi dan verifikasi** — bukan implementation guide. Detail implementasi ada di [plan.md](./plan.md), [data-model.md](./data-model.md), dan [contracts/api.md](./contracts/api.md).

---

## Prerequisites

### Infrastructure

```bash
# 1. PostgreSQL 16 dengan pgvector (Cukup 1 container database, tanpa Redis)
docker run -d \
  --name telaah-postgres \
  -e POSTGRES_USER=telaah \
  -e POSTGRES_PASSWORD=telaah_dev \
  -e POSTGRES_DB=telaah_db \
  -p 5432:5432 \
  pgvector/pgvector:pg16

# 2. Verifikasi pgvector aktif
psql postgresql://telaah:telaah_dev@localhost:5432/telaah_db \
  -c "CREATE EXTENSION IF NOT EXISTS vector; SELECT extversion FROM pg_extension WHERE extname='vector';"
```

### Python Environment

```bash
# Install dependencies
cd backend
pip install -r requirements.txt
# Pastikan termasuk: fastapi, langchain-huggingface, torch,
#                    sentence-transformers, pgvector, sqlmodel, alembic

# Run Alembic migrations
alembic upgrade head

# Verifikasi tabel terbuat
psql postgresql://telaah:telaah_dev@localhost:5432/telaah_db \
  -c "\dt" | grep -E "document_index_versions|document_chunks|indexing_jobs"
```

### Model Download (one-time)

```bash
# Pre-download model (opsional — akan auto-download pada startup pertama)
python -c "
from langchain_huggingface import HuggingFaceEmbeddings
HuggingFaceEmbeddings(
    model_name='intfloat/multilingual-e5-base',
    model_kwargs={'revision': 'd711e52f514b8a7c0ec13b56cf8601db54ebc5e9'},
    cache_folder='./models/hf_cache'
)
print('Model ready.')
"
```

### Environment Variables

```bash
# .env (development)
DATABASE_URL=postgresql+asyncpg://telaah:telaah_dev@localhost:5432/telaah_db
EMBEDDING_MODEL_NAME=intfloat/multilingual-e5-base
EMBEDDING_MODEL_COMMIT_HASH=d711e52f514b8a7c0ec13b56cf8601db54ebc5e9
EMBEDDING_DIMENSION=768
CHUNK_SIZE=1200
CHUNK_OVERLAP=150
EMBEDDING_BATCH_SIZE=32
HF_CACHE_DIR=./models/hf_cache
INDEXING_MAX_RETRIES=3
```

---

## Validation Scenarios

### Scenario 1 — Happy Path: Indexing Dokumen PDF

**Prerequisites**: Ada dokumen dengan `import_status = 'extracted'` di database (dari UC-02).

```bash
# 1. Jalankan FastAPI backend (BackgroundTasks berjalan otomatis in-process)
uvicorn backend.src.main:app --reload --port 8000

# 2. Trigger indexing via API
DOC_ID="<uuid-dokumen-extracted>"
TOKEN="<jwt-token-peneliti>"

curl -X POST "http://localhost:8000/api/indexing/documents/${DOC_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

**Expected Response**: `202 Accepted`
```json
{
  "job_id": "<uuid>",
  "index_version_id": "<uuid>",
  "status": "queued"
}
```

```bash
# 3. Poll status setiap 3 detik hingga indexed
JOB_ID="<job-id-dari-response-atas>"
watch -n3 "curl -s http://localhost:8000/api/indexing/jobs/${JOB_ID} \
  -H 'Authorization: Bearer ${TOKEN}' | python3 -m json.tool"
```

**Expected Final Status**: `"status": "indexed"` dengan `"failure_reason": null`

```bash
# 4. Verifikasi chunk tersimpan di database
psql postgresql://telaah:telaah_dev@localhost:5432/telaah_db \
  -c "SELECT COUNT(*), MIN(chunk_index), MAX(chunk_index) FROM document_chunks WHERE document_id='${DOC_ID}';"
```

**Expected**: `count > 0`, `min = 0`, max = count - 1 (sequential)

**Maps to**: SC-001, FR-001–FR-014

---

### Scenario 2 — Metadata Traceability

```bash
# Cek bahwa setiap chunk memiliki metadata lengkap
psql postgresql://telaah:telaah_dev@localhost:5432/telaah_db \
  -c "
  SELECT
    chunk_index,
    LEFT(chunk_text, 80) AS preview,
    page_number,
    section_name,
    source_metadata->>'document_title' AS title
  FROM document_chunks
  WHERE document_id = '${DOC_ID}'
  ORDER BY chunk_index
  LIMIT 5;
  "
```

**Expected**: Semua row memiliki `chunk_index` sequential, minimal salah satu dari `page_number` atau `section_name` tidak NULL, `source_metadata` tidak kosong.

**Maps to**: SC-002, FR-007, FR-023

---

### Scenario 3 — No External API Calls (FR-010)

```bash
# Run indexing dengan network monitoring
# Metode 1: pytest assertion (preferred)
pytest backend/tests/test_indexing_pipeline.py::test_no_gemini_api_calls -v

# Metode 2: network intercept manual
tcpdump -i lo0 -n 'host generativelanguage.googleapis.com' &
TCPDUMP_PID=$!

curl -X POST "http://localhost:8000/api/indexing/documents/${DOC_ID}" \
  -H "Authorization: Bearer ${TOKEN}"

sleep 30  # tunggu pipeline selesai
kill $TCPDUMP_PID
```

**Expected**: Tidak ada paket ke `generativelanguage.googleapis.com` atau domain Google AI selama pipeline berjalan.

**Maps to**: SC-003, FR-010

---

### Scenario 4 — Similarity Search Verification

```bash
# Setelah dokumen ter-indexed, jalankan similarity search
QUERY="pengaruh temperatur terhadap efisiensi sel surya"

curl -G "http://localhost:8000/api/search/similarity" \
  -H "Authorization: Bearer ${TOKEN}" \
  --data-urlencode "document_id=${DOC_ID}" \
  --data-urlencode "query=${QUERY}" \
  --data-urlencode "top_k=5"
```

**Expected Response**:
- `total_results >= 1`
- Setiap result memiliki `similarity_score > 0`
- Setiap result memiliki `source_metadata` dengan minimal `document_title`
- `page_number` atau `section_name` tidak NULL pada minimal satu result

**Maps to**: SC-004, SC-006, SC-007, FR-018, FR-019

---

### Scenario 5 — Deduplication (No Duplicate Index)

```bash
# Trigger indexing dua kali untuk dokumen yang sama
curl -X POST "http://localhost:8000/api/indexing/documents/${DOC_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
# → 202 Accepted (first time)

curl -X POST "http://localhost:8000/api/indexing/documents/${DOC_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
# → 409 Conflict (duplicate fingerprint)

# Verifikasi hanya satu IndexingRecord aktif
psql postgresql://telaah:telaah_dev@localhost:5432/telaah_db \
  -c "SELECT COUNT(*) FROM document_index_versions WHERE document_id='${DOC_ID}' AND is_active=TRUE;"
```

**Expected**: Kedua kondisi: `409 Conflict` pada trigger kedua; `COUNT(*) = 1` pada query.

**Maps to**: SC-005, FR-015, Alt-5

---

### Scenario 6 — Re-index (Archive + New Version)

```bash
# 1. Request re-indexing (setelah dokumen ter-indexed)
curl -X POST "http://localhost:8000/api/documents/${DOC_ID}/reindex" \
  -H "Authorization: Bearer ${TOKEN}"
# → 202 Accepted dengan archived_index_version_id

# 2. Verifikasi versi lama diarsipkan, bukan dihapus
psql postgresql://telaah:telaah_dev@localhost:5432/telaah_db \
  -c "
  SELECT id, status, is_active, created_at
  FROM document_index_versions
  WHERE document_id = '${DOC_ID}'
  ORDER BY created_at;
  "
```

**Expected**:
- Ada 2 record: satu `status=archived, is_active=false`, satu `status=queued/indexed, is_active=true`
- Chunk lama masih ada di `document_chunks` (linked ke archived version)

**Maps to**: FR-016, Alt-6, spec Clarification 2026-09-22

---

### Scenario 7 — Researcher Isolation

```bash
# Login sebagai peneliti LAIN (researcher_id berbeda)
TOKEN_OTHER="<jwt-token-peneliti-lain>"

# Coba akses dokumen milik peneliti pertama
curl "http://localhost:8000/api/documents/${DOC_ID}/index-status" \
  -H "Authorization: Bearer ${TOKEN_OTHER}"
# → 404 Not Found (tidak ada informasi tentang keberadaan dokumen)

# Coba similarity search dokumen milik peneliti lain
curl -G "http://localhost:8000/api/search/similarity" \
  -H "Authorization: Bearer ${TOKEN_OTHER}" \
  --data-urlencode "document_id=${DOC_ID}" \
  --data-urlencode "query=test"
# → 404 Not Found
```

**Expected**: Semua endpoint mengembalikan `404` — tidak ada informasi tentang eksistensi dokumen peneliti lain.

**Maps to**: SC-001 (isolation), FR-022, NFR-005, Alt-9

---

### Scenario 8 — Failure & Retry

```bash
# 1. Simulate model loading failure (test environment)
pytest backend/tests/test_indexing_failure.py::test_model_load_failure -v

# 2. Setelah failure, verifikasi status
curl "http://localhost:8000/api/indexing/jobs/${JOB_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
# → 200 dengan status=failed, failure_reason berisi pesan aman

# 3. Retry manual
curl -X POST "http://localhost:8000/api/indexing/documents/${DOC_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
# → 202 Accepted (new job)
```

**Expected**: `failure_reason` tidak mengandung stack trace, path filesystem, atau informasi sistem internal.

**Maps to**: SC-009, FR-017, Alt-3, Alt-7, Alt-8

---

### Scenario 9 — Status Update Freshness (NFR-009)

```bash
# Monitor status update latency saat pipeline berjalan
START=$(date +%s)
PREV_STATUS=""

for i in {1..30}; do
  STATUS=$(curl -s "http://localhost:8000/api/documents/${DOC_ID}/index-status" \
    -H "Authorization: Bearer ${TOKEN}" | python3 -c "import sys,json; print(json.load(sys.stdin)['index_status'])")

  if [ "$STATUS" != "$PREV_STATUS" ]; then
    echo "$(( $(date +%s) - START ))s: Status changed to ${STATUS}"
    PREV_STATUS=$STATUS
  fi
  sleep 1
done
```

**Expected**: Status transition tampil dalam < 5 detik setelah perubahan aktual.

**Maps to**: SC-010, NFR-009

---

## Unit Test Checklist

Validasi berikut harus hijau sebelum push ke branch:

```bash
# Jalankan semua unit test UC-03
pytest backend/tests/unit/test_text_cleaning.py -v
pytest backend/tests/unit/test_chunking.py -v
pytest backend/tests/unit/test_e5_prefix.py -v
pytest backend/tests/unit/test_embedding_provider.py -v
pytest backend/tests/unit/test_dimension_validation.py -v
pytest backend/tests/unit/test_fingerprint.py -v
pytest backend/tests/unit/test_index_versioning.py -v

# Integration tests
pytest backend/tests/integration/test_pgvector_storage.py -v
pytest backend/tests/integration/test_indexing_pipeline.py -v
pytest backend/tests/integration/test_researcher_isolation.py -v
pytest backend/tests/integration/test_retry_flow.py -v
pytest backend/tests/integration/test_similarity_search.py -v
pytest backend/tests/integration/test_reindex_flow.py -v

# Critical assertion: no Gemini API call
pytest backend/tests/test_no_external_embedding.py -v
```

---

## Observability Verification

```bash
# Periksa log format (tidak ada full document text atau token sensitif)
grep -i "chunk_text\|full_text\|access_token\|refresh_token" backend/logs/indexing.log
# Expected: No matches

# Periksa bahwa metrics tersedia (jika Prometheus dikonfigurasi)
curl http://localhost:8000/metrics | grep -E "indexing_latency|embedding_throughput|chunk_count|indexing_failure"
```

**Expected Metrics** (lihat [plan.md](./plan.md) Section 1 Observability):
- `indexing_job_duration_seconds` — histogram per stage
- `embedding_throughput_chunks_per_second` — gauge
- `total_chunks_indexed` — counter
- `indexing_failure_total` — counter per error type
- `indexing_retry_total` — counter
