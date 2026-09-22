# API Contracts: UC-03 Document Indexing and Local Embedding

**Feature Branch**: `003-document-indexing-embedding`
**Date**: 2026-09-22
**Base URL**: `/api` (FastAPI backend)
**Auth**: Bearer token (JWT) — semua endpoint memerlukan header `Authorization: Bearer <token>`

> [!IMPORTANT] Semua endpoint mengekstrak `researcher_id` dari JWT token. Tidak ada endpoint yang menerima `researcher_id` sebagai parameter input dari user. Isolasi data antar peneliti divalidasi di service layer.

---

## Endpoint Summary

| Method | Path | Description | Auth Required |
|--------|------|-------------|:---:|
| `POST` | `/api/indexing/documents/{document_id}` | Trigger indexing (atau re-queue jika failed) | ✅ |
| `GET` | `/api/indexing/jobs/{job_id}` | Status detail satu indexing job | ✅ |
| `GET` | `/api/documents/{document_id}/index-status` | Status & ringkasan indexing dokumen | ✅ |
| `POST` | `/api/documents/{document_id}/reindex` | Arsipkan index lama, buat index baru | ✅ |
| `GET` | `/api/documents/{document_id}/index-summary` | Ringkasan index aktif | ✅ |
| `GET` | `/api/search/similarity` | Similarity search verifikasi (internal UC-03) | ✅ |

---

## 1. `POST /api/indexing/documents/{document_id}`

**Deskripsi**: Memicu pipeline indexing untuk dokumen yang sudah berstatus `extracted`. Digunakan oleh UC-02 (event-driven) atau manual trigger via UI (retry). Jika fingerprint identik sudah ada, mengembalikan 409.

**Request**:
```http
POST /api/indexing/documents/3fa85f64-5717-4562-b3fc-2c963f66afa6
Authorization: Bearer <jwt>
Content-Type: application/json
```
Body: *(kosong — tidak diperlukan)*

**Response 202 Accepted** (job berhasil di-enqueue):
```json
{
  "job_id": "c1a2b3d4-e5f6-7890-abcd-ef1234567890",
  "index_version_id": "9f8e7d6c-b5a4-3210-fedc-ba9876543210",
  "document_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "queued",
  "message": "Indexing job enqueued successfully."
}
```

**Response 409 Conflict** (fingerprint identik sudah ada):
```json
{
  "error": "duplicate_fingerprint",
  "message": "Index version with identical configuration already exists.",
  "existing_index_version_id": "9f8e7d6c-b5a4-3210-fedc-ba9876543210"
}
```

**Response 422 Unprocessable Entity** (dokumen belum berstatus `extracted`):
```json
{
  "error": "invalid_document_status",
  "message": "Document must have status 'extracted' to be indexed. Current status: 'imported'."
}
```

**Response 404 Not Found** (dokumen tidak ditemukan atau bukan milik peneliti):
```json
{
  "error": "document_not_found",
  "message": "Document not found or access denied."
}
```

**Status Codes**: `202`, `404`, `409`, `422`, `401`, `500`

---

## 2. `GET /api/indexing/jobs/{job_id}`

**Deskripsi**: Mendapatkan status detail satu indexing job. Digunakan oleh UI untuk polling progres.

**Request**:
```http
GET /api/indexing/jobs/c1a2b3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <jwt>
```

**Response 200 OK**:
```json
{
  "job_id": "c1a2b3d4-e5f6-7890-abcd-ef1234567890",
  "document_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "index_version_id": "9f8e7d6c-b5a4-3210-fedc-ba9876543210",
  "status": "embedding",
  "current_stage": "embedding",
  "retry_count": 0,
  "failure_reason": null,
  "enqueued_at": "2026-09-22T14:00:00Z",
  "started_at": "2026-09-22T14:00:05Z",
  "completed_at": null,
  "heartbeat_at": "2026-09-22T14:01:30Z"
}
```

**Response 200 OK** (status `failed`):
```json
{
  "job_id": "c1a2b3d4-...",
  "status": "failed",
  "current_stage": "embedding",
  "failure_reason": "Model failed to load: insufficient memory. Please retry or contact administrator.",
  "retry_count": 3,
  "completed_at": "2026-09-22T14:05:00Z"
}
```

**Status Codes**: `200`, `404`, `401`

> [!NOTE] `failure_reason` hanya berisi pesan yang aman dibaca peneliti — tanpa stack trace internal, path filesystem, atau informasi sensitif sistem.

---

## 3. `GET /api/documents/{document_id}/index-status`

**Deskripsi**: Status indexing terkini untuk dokumen. Digunakan oleh SCR-05 Library View dan SCR-06 Indexing Detail untuk polling setiap 3–5 detik.

**Request**:
```http
GET /api/documents/3fa85f64-5717-4562-b3fc-2c963f66afa6/index-status
Authorization: Bearer <jwt>
```

**Response 200 OK** (proses berjalan):
```json
{
  "document_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "index_status": "embedding",
  "current_stage": "embedding",
  "is_indexed": false,
  "active_index_version_id": "9f8e7d6c-b5a4-3210-fedc-ba9876543210",
  "job_id": "c1a2b3d4-e5f6-7890-abcd-ef1234567890",
  "failure_reason": null,
  "total_chunks": null,
  "completed_at": null
}
```

**Response 200 OK** (selesai):
```json
{
  "document_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "index_status": "indexed",
  "current_stage": null,
  "is_indexed": true,
  "active_index_version_id": "9f8e7d6c-b5a4-3210-fedc-ba9876543210",
  "job_id": "c1a2b3d4-e5f6-7890-abcd-ef1234567890",
  "failure_reason": null,
  "total_chunks": 142,
  "completed_at": "2026-09-22T14:10:00Z"
}
```

**Response 200 OK** (belum pernah di-index):
```json
{
  "document_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "index_status": "not_indexed",
  "is_indexed": false,
  "active_index_version_id": null,
  "job_id": null,
  "failure_reason": null,
  "total_chunks": null,
  "completed_at": null
}
```

**Status Codes**: `200`, `404`, `401`

---

## 4. `POST /api/documents/{document_id}/reindex`

**Deskripsi**: Arsipkan `DocumentIndexVersion` aktif lama, buat `IndexingJob` baru, dan enqueue pipeline baru. Hanya tersedia jika dokumen sudah berstatus `indexed`. Menampilkan konfirmasi di SCR-07 sebelum endpoint ini dipanggil.

**Request**:
```http
POST /api/documents/3fa85f64-5717-4562-b3fc-2c963f66afa6/reindex
Authorization: Bearer <jwt>
Content-Type: application/json
```
Body: *(kosong — konfirmasi dilakukan di UI level)*

**Response 202 Accepted**:
```json
{
  "job_id": "d2b3c4e5-f6a7-8901-bcde-f01234567891",
  "new_index_version_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567892",
  "archived_index_version_id": "9f8e7d6c-b5a4-3210-fedc-ba9876543210",
  "document_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "queued",
  "message": "Previous index archived. New indexing job enqueued."
}
```

**Response 422 Unprocessable Entity** (dokumen belum indexed):
```json
{
  "error": "reindex_not_available",
  "message": "Re-indexing is only available for documents with status 'indexed'. Current status: 'failed'."
}
```

**Status Codes**: `202`, `404`, `422`, `401`, `500`

---

## 5. `GET /api/documents/{document_id}/index-summary`

**Deskripsi**: Ringkasan lengkap index aktif untuk dokumen. Ditampilkan di SCR-06 Indexing Detail.

**Request**:
```http
GET /api/documents/3fa85f64-5717-4562-b3fc-2c963f66afa6/index-summary
Authorization: Bearer <jwt>
```

**Response 200 OK**:
```json
{
  "document_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "index_version_id": "9f8e7d6c-b5a4-3210-fedc-ba9876543210",
  "status": "indexed",
  "model_name": "intfloat/multilingual-e5-base",
  "model_version": "1.0.0",
  "model_commit_hash": "d711e52f514b8a7c0ec13b56cf8601db54ebc5e9",
  "embedding_dimension": 768,
  "chunk_size": 1200,
  "chunk_overlap": 150,
  "splitter_type": "recursive_character",
  "preprocessing_version": "v1",
  "total_chunks": 142,
  "source_checksum": "sha256:abc123...",
  "index_fingerprint": "sha256:def456...",
  "started_at": "2026-09-22T14:00:05Z",
  "completed_at": "2026-09-22T14:10:00Z",
  "duration_seconds": 595,
  "index_version_history": [
    {
      "index_version_id": "old-version-uuid",
      "status": "archived",
      "model_name": "intfloat/multilingual-e5-base",
      "completed_at": "2026-09-21T10:00:00Z"
    }
  ]
}
```

**Response 404** (belum pernah indexed):
```json
{
  "error": "no_active_index",
  "message": "No active index found for this document."
}
```

**Status Codes**: `200`, `404`, `401`

---

## 6. `GET /api/search/similarity`

**Deskripsi**: Endpoint verifikasi similarity search dasar — **hanya untuk UC-03 testing/verification**. Bukan untuk retrieval per-section paper generation (itu ada di UC-06). Query prefix `"query: "` diinjeksi otomatis oleh backend.

**Request**:
```http
GET /api/search/similarity?document_id=3fa85f64-...&query=pengaruh%20temperatur%20terhadap%20viskositas&top_k=5
Authorization: Bearer <jwt>
```

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|:--------:|---------|-------------|
| `document_id` | `UUID` | ✅ | — | Dokumen yang diquery |
| `query` | `string` | ✅ | — | Teks query (tanpa prefix — backend inject `"query: "`) |
| `top_k` | `integer` | ❌ | `10` | Jumlah hasil dikembalikan (max 20) |

**Response 200 OK**:
```json
{
  "query": "pengaruh temperatur terhadap viskositas",
  "document_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "index_version_id": "9f8e7d6c-b5a4-3210-fedc-ba9876543210",
  "total_results": 5,
  "results": [
    {
      "chunk_id": "aabbccdd-1122-3344-5566-778899aabbcc",
      "chunk_index": 23,
      "chunk_text": "Pengaruh temperatur terhadap viskositas fluida non-Newtonian...",
      "similarity_score": 0.923,
      "page_number": 4,
      "section_name": "2.3 Metodologi Pengujian Reologi",
      "source_metadata": {
        "document_title": "Karakterisasi Reologi Polimer Biodegradable",
        "authors": "Santoso, A.; Wijaya, R.",
        "publication_year": 2024,
        "source_google_drive_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
      }
    }
  ]
}
```

**Response 422** (dokumen belum indexed):
```json
{
  "error": "document_not_indexed",
  "message": "Document has not been indexed yet. Current status: 'chunking'."
}
```

**Response 400** (query kosong atau terlalu panjang):
```json
{
  "error": "invalid_query",
  "message": "Query must be between 3 and 1000 characters."
}
```

**Status Codes**: `200`, `400`, `404`, `422`, `401`

> [!NOTE] Endpoint ini adalah **verifikasi internal UC-03** — tidak diekspos sebagai fitur utama UI. Retrieval berbasis section untuk paper generation dirancang pada UC-06 dan memanggil interface yang sama melalui service layer.

---

## Pydantic DTO Schemas

```python
# backend/src/indexing/schemas.py

class JobResponseDTO(BaseModel):
    job_id: uuid.UUID
    index_version_id: uuid.UUID
    document_id: uuid.UUID
    status: str
    message: str

class JobStatusDTO(BaseModel):
    job_id: uuid.UUID
    document_id: uuid.UUID
    index_version_id: uuid.UUID
    status: str
    current_stage: Optional[str]
    retry_count: int
    failure_reason: Optional[str]
    enqueued_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    heartbeat_at: Optional[datetime]

class IndexStatusDTO(BaseModel):
    document_id: uuid.UUID
    index_status: str
    current_stage: Optional[str]
    is_indexed: bool
    active_index_version_id: Optional[uuid.UUID]
    job_id: Optional[uuid.UUID]
    failure_reason: Optional[str]
    total_chunks: Optional[int]
    completed_at: Optional[datetime]

class ReindexResponseDTO(BaseModel):
    job_id: uuid.UUID
    new_index_version_id: uuid.UUID
    archived_index_version_id: uuid.UUID
    document_id: uuid.UUID
    status: str
    message: str

class SimilarityResultItemDTO(BaseModel):
    chunk_id: uuid.UUID
    chunk_index: int
    chunk_text: str
    similarity_score: float
    page_number: Optional[int]
    section_name: Optional[str]
    source_metadata: dict

class SimilaritySearchResponseDTO(BaseModel):
    query: str
    document_id: uuid.UUID
    index_version_id: uuid.UUID
    total_results: int
    results: list[SimilarityResultItemDTO]
```

---

## Error Response Format (Standard)

Semua error menggunakan format konsisten:

```json
{
  "error": "snake_case_error_code",
  "message": "Human-readable message safe for researcher display."
}
```

**Error Codes UC-03**:

| Code | HTTP | Description |
|------|------|-------------|
| `document_not_found` | 404 | Dokumen tidak ditemukan atau bukan milik peneliti |
| `invalid_document_status` | 422 | Status dokumen belum `extracted` |
| `duplicate_fingerprint` | 409 | Index dengan konfigurasi identik sudah ada |
| `reindex_not_available` | 422 | Dokumen belum indexed, re-index tidak tersedia |
| `document_not_indexed` | 422 | Similarity search diminta sebelum indexed |
| `invalid_query` | 400 | Query terlalu pendek atau terlalu panjang |
| `job_not_found` | 404 | Job ID tidak ditemukan atau bukan milik peneliti |
| `no_active_index` | 404 | Tidak ada active index untuk dokumen |
| `indexing_failed` | 500 | Pipeline error — safe message disertakan |
