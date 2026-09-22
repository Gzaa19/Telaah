# Research & Technical Decisions: UC-03 Document Indexing and Local Embedding

**Feature Branch**: `003-document-indexing-embedding`
**Date**: 2026-09-22
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## R-01: Background Processing — FastAPI BackgroundTasks vs Distributed Queues

**Decision**: **FastAPI `BackgroundTasks` (in-process)** dengan state tracking persisten di PostgreSQL (`indexing_jobs`) dan CPU offloading via `asyncio.to_thread()`.

**Rationale (Konteks Tugas Akhir / Single-Instance Lokal)**:
Sistem ini dikembangkan dalam lingkup Tugas Akhir (TA) yang berjalan pada environment lokal (single-instance). Menambahkan Redis dan message broker eksternal seperti ARQ/Celery menimbulkan overhead infrastruktur (service container tambahan, koneksi pool Redis, proses worker terpisah) yang berlebihan untuk kebutuhan pengujian dan demo.

Dengan menggunakan `FastAPI BackgroundTasks`:
1. **Zero External Infrastructure**: Cukup PostgreSQL 16 + pgvector yang memang menjadi dependensi utama. Tidak ada broker Redis terpisah.
2. **Durable State di PostgreSQL**: Seluruh tahapan pipeline (`queued`, `cleaning`, `chunking`, `embedding`, `storing`, `indexed`, `failed`) diperbarui langsung ke tabel `indexing_jobs` dan `document_index_versions`. Klien melakukan polling status ke PostgreSQL, bukan ke Redis.
3. **Non-blocking Event Loop**: Proses komputasi berat (embedding batch inference) dibungkus menggunakan `asyncio.to_thread()`, sehingga berjalan di worker thread pool Python dan tidak memblokir event loop async FastAPI.
4. **Sesuai Prinsip Ponytail Engineering (Prinsip 6 Constitution)**: Meminimalkan layer abstraksi dan komponen bergerak yang tidak diperlukan (YAGNI).

---

### Analisis Trade-offs

| Aspek | FastAPI BackgroundTasks (Dipilih) | ARQ + Redis | Celery + RabbitMQ/Redis |
|---|---|---|---|
| **Kebutuhan Infra** | Hanya PostgreSQL | PostgreSQL + Redis container | PostgreSQL + Broker + Worker process |
| **Kesesuaian TA/Demo** | **Sangat Tinggi** (1 command `uvicorn`) | Sedang (perlu start Redis & worker terpisah) | Rendah (setup kompleks) |
| **Skalabilitas Multi-Worker** | Rendah (hanya single process) | Tinggi (banyak worker terdistribusi) | Sangat Tinggi (enterprise cluster) |
| **Ketahanan Crash** | Task memori terhenti jika server mati; dapat di-retry manual via DB status | Job di-requeue otomatis oleh broker | Job di-ack dan di-requeue otomatis |
| **Concurrency Control** | Terbatas oleh resource host lokal | Terkontrol via worker slot concurrency | Terkontrol via prefetch & worker concurrency |

**Kelemahan & Batasan Pendekatan Ini:**
- **Tidak Scalable Horisontal**: Jika server dijalankan dengan banyak instance (misal container replicas atau Gunicorn multi-worker), background task terikat pada memori worker process yang menerima request HTTP.
- **Server Shutdown**: Jika proses FastAPI dihentikan paksa (SIGKILL) saat embedding berlangsung, task terputus. Penanganan dilakukan melalui pengecekan status di database (`stale job detector` atau manual retry dari UI).
- Namun, untuk pengujian lokal, evaluasi akurasi, dan demo penguji TA, trade-off ini **sangat dapat diterima dan jauh lebih praktis**.

---

### Future Work: Jalur Upgrade Skalabilitas

Jika sistem di masa depan hendak dinaikkan ke level production dengan beban tinggi atau multi-node:
1. **Upgrade ke ARQ + Redis**: Karena FastAPI berbasis `asyncio`, ARQ adalah opsi upgrade paling mulus tanpa perlu merombak coroutine `async/await`.
2. **Upgrade ke Celery**: Opsi standar industri jika diperlukan integrasi multi-language atau queue routing enterprise.
3. **Kemudahan Migrasi**: Karena arsitektur UC-03 menerapkan pemisahan **Boundary-Controller-Entity (BCE)**, seluruh logika pipeline berada di `DocumentIndexingService` dan `run_indexing_pipeline()`. Migrasi ke broker eksternal di masa depan hanya mengubah baris `background_tasks.add_task(...)` di router menjadi dispatch ke queue broker, tanpa mengubah domain model maupun service layer.

---

**Key Implementation Pattern**:

```python
# backend/src/indexing/router.py
from fastapi import APIRouter, BackgroundTasks, Depends
from backend.src.indexing.worker import run_indexing_pipeline

router = APIRouter()

@router.post("/indexing/documents/{document_id}", status_code=202)
async def trigger_indexing(
    document_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    service: DocumentIndexingService = Depends(),
    researcher: Researcher = Depends(get_current_researcher),
):
    # 1. Validasi akses & fingerprint (cepat)
    job = await service.create_job(document_id, researcher.id)
    
    # 2. Spawn task in-process tanpa block response
    background_tasks.add_task(
        run_indexing_pipeline,
        job_id=job.id,
        document_id=document_id,
        researcher_id=researcher.id,
        index_version_id=job.index_version_id,
    )
    
    # 3. Kembalikan 202 Accepted segera
    return JobResponseDTO(
        job_id=job.id,
        index_version_id=job.index_version_id,
        status="queued",
        message="Indexing job enqueued successfully."
    )
```

**Non-blocking Embedding Pattern**:
```python
# backend/src/indexing/worker.py
import asyncio

async def run_indexing_pipeline(job_id: uuid.UUID, ...):
    # Update stage ke PostgreSQL
    await repo.update_job_status(job_id, status="embedding", stage="embedding")
    
    # Offload CPU-bound inference ke thread terpisah
    embeddings = await asyncio.to_thread(
        embedding_provider.embed_documents,
        chunk_texts
    )
    
    # Simpan hasil embedding ke pgvector
    await repo.save_chunks_transactional(chunks, embeddings, index_version_id)
```

---

## R-02: Embedding Model & LangChain Wrapper

**Decision**: `intfloat/multilingual-e5-base` via `langchain-huggingface.HuggingFaceEmbeddings`, dibungkus custom `MultilingualE5Embeddings` subclass, di-load sebagai singleton via FastAPI lifespan.

**Rationale**:
Model ini mendukung Bahasa Indonesia + Inggris secara nativ, dimensi output 768 kompatibel dengan pgvector VECTOR(768), dan lisensi Apache 2.0. Commit hash di-pin untuk reproducibility embedding (embedding yang sama dari teks yang sama selalu identik).

**Hardware Requirements**:

| Platform | Device | RAM/VRAM | Batch Size | Throughput |
|---|---|---|---|---|
| Cloud CPU (4 vCPU) | CPU | ~1.8–2.5 GB RAM | 16–32 | ~40–60 chunk/s |
| Apple Silicon (M1–M4) | MPS (Unified) | ~1.6 GB | 32–64 | ~180–250 chunk/s |
| Nvidia GPU (T4/L4) | CUDA | ~1.8 GB VRAM | 64–128 | ~350–500 chunk/s |

**Singleton Pattern (WAJIB — dilarang load per request)**:
```python
# backend/src/indexing/embedding.py
MODEL_NAME = "intfloat/multilingual-e5-base"
MODEL_COMMIT_HASH = "d711e52f514b8a7c0ec13b56cf8601db54ebc5e9"
EMBEDDING_DIM = 768

class MultilingualE5Embeddings(HuggingFaceEmbeddings):
    """Auto-inject E5 asymmetric prefixes. NEVER instantiate per-request."""
    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        prefixed = [f"passage: {t.strip()}" for t in texts]
        return super().embed_documents(prefixed)

    def embed_query(self, text: str) -> list[float]:
        return super().embed_query(f"query: {text.strip()}")

def build_embeddings(cache_dir: str = "./models/hf_cache") -> MultilingualE5Embeddings:
    return MultilingualE5Embeddings(
        model_name=MODEL_NAME,
        cache_folder=cache_dir,
        model_kwargs={
            "device": get_device(),       # auto: cuda > mps > cpu
            "revision": MODEL_COMMIT_HASH
        },
        encode_kwargs={
            "normalize_embeddings": True,  # Wajib untuk cosine similarity
            "batch_size": int(os.environ.get("EMBEDDING_BATCH_SIZE", 32))
        }
    )
```

**Prefix Convention** (HARUS konsisten di seluruh codebase):
- **Indexing (UC-03)**: prefix `"passage: "` — diinjeksi otomatis oleh `embed_documents()`
- **Retrieval (UC-04/UC-06)**: prefix `"query: "` — diinjeksi otomatis oleh `embed_query()`
- Chunk text yang disimpan di `document_chunks.chunk_text` adalah teks **tanpa prefix**

**Version Pinning**:
```python
def get_model_metadata() -> dict:
    return {
        "model_name": MODEL_NAME,
        "model_commit_hash": MODEL_COMMIT_HASH,
        "embedding_dimension": EMBEDDING_DIM,
        "model_version": "1.0.0",  # semantic version untuk config management
    }
```

**Alternatives Considered**:
- `intfloat/multilingual-e5-large` (1024-dim): Ditolak — 2.2GB model, 4GB+ peak RAM, lebih lambat
- `sentence-transformers/paraphrase-multilingual-mpnet-base-v2`: Ditolak — tidak ada konvensi prefix, performa retrieval lebih rendah untuk teks ilmiah
- Gemini Text Embedding API: **Dilarang eksplisit** (FR-010, constitution)

---

## R-03: Text Chunking — RecursiveCharacterTextSplitter

**Decision**: `langchain_text_splitters.RecursiveCharacterTextSplitter` dengan `chunk_size=1200, chunk_overlap=150`

**Rationale**:
Multilingual-e5-base menerima maksimum 512 subword tokens. Teks akademis berbahasa Indonesia memiliki rasio token/karakter lebih tinggi dari English (~3.5 karakter/token vs ~4.5). Nilai 1200 karakter menghasilkan ~300–350 token — jauh di bawah batas 512 dengan margin aman. Overlap 150 karakter (12.5%) memastikan konteks antar-chunk tidak terputus pada paragraph boundary.

**Configuration**:
```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=int(os.environ.get("CHUNK_SIZE", 1200)),
    chunk_overlap=int(os.environ.get("CHUNK_OVERLAP", 150)),
    separators=["\n\n\n", "\n\n", "\n## ", "\n### ", "\n", ". ", " ", ""],
    length_function=len,
    is_separator_regex=False,
)
```

**Metadata Preservation Pattern**:
```python
from langchain_core.documents import Document as LCDocument

def chunk_with_metadata(
    text: str,
    pages: list[ExtractedPage],
    document_metadata: dict
) -> list[ChunkWithMeta]:
    lc_doc = LCDocument(
        page_content=text,
        metadata={
            "document_id": str(document_metadata["id"]),
            "source_checksum": document_metadata["source_checksum"],
            **document_metadata.get("bibliography", {}),
        }
    )
    chunks = splitter.split_documents([lc_doc])
    result = []
    for idx, chunk in enumerate(chunks):
        # Map chunk position to page number via character offset
        page_number = _map_to_page(chunk, pages)
        result.append(ChunkWithMeta(
            chunk_index=idx,
            chunk_text=chunk.page_content,
            page_number=page_number,
            section_name=_detect_section(chunk.page_content),
            source_metadata=chunk.metadata,
        ))
    return result
```

**Baseline values** (env-configurable, default disesuaikan untuk multilingual-e5-base):

| Parameter | Default | Rationale |
|-----------|---------|-----------|
| `chunk_size` | `1200` chars | ~300-350 tokens; safe margin dari 512 limit |
| `chunk_overlap` | `150` chars | 12.5% overlap — konteks antar-chunk terjaga |
| `splitter_type` | `recursive_character` | Terbaik untuk structured academic text |
| `preprocessing_version` | `v1` | Versi pipeline cleaning; bump jika cleaning logic berubah |

**Alternatives Considered**:
- `TokenTextSplitter`: Lebih akurat token-wise tapi lebih lambat (perlu tokenisasi per-chunk) dan tidak menjaga natural boundaries
- `SentenceTransformersTokenTextSplitter`: Memerlukan tokenizer yang sama dengan model — tightly coupled, sulit diganti
- Fixed-size character split: Ditolak — memotong di tengah kalimat, degradasi retrieval quality

---

## R-04: PostgreSQL pgvector — HNSW Configuration

**Decision**: HNSW index dengan `m=16, ef_construction=128, ef_search=64` menggunakan `vector_cosine_ops`

**Rationale**:
Untuk dataset < 1M vector 768-dim (dokumen riset per peneliti), HNSW memberikan recall > 98% dengan latency < 5ms. IVFFlat ditolak karena recall rendah di 768-D tanpa tuning `probes` hingga mendekati sequential scan.

**HNSW Parameter Guide**:

| Parameter | Default | Tradeoff |
|-----------|---------|----------|
| `m` | `16` | Max bidirectional links per node; naikan ke 32 untuk dataset > 500K jika RAM cukup |
| `ef_construction` | `128` | Graph construction quality; naikan ke 200 untuk recall lebih tinggi, turunkan ke 64 untuk build lebih cepat |
| `ef_search` | `64` | Query-time candidate list; naikan untuk recall lebih tinggi, turunkan untuk latency lebih rendah |

**SQL untuk HNSW Index**:
```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- HNSW index dengan cosine similarity
CREATE INDEX CONCURRENTLY idx_chunks_embedding_hnsw
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 128);

-- B-Tree composite untuk multi-tenant filtering
CREATE INDEX idx_chunks_researcher_version
  ON document_chunks (researcher_id, index_version_id);
```

**Multi-Tenant Query Pattern**:
```sql
-- Set ef_search sebelum query cosine (per-session)
SET hnsw.ef_search = 64;

-- Cosine similarity search dengan filter researcher_id
SELECT
    id, chunk_text, page_number, section_name,
    source_metadata,
    1 - (embedding <=> $1::vector) AS similarity
FROM document_chunks
WHERE researcher_id = $2
  AND index_version_id = $3
ORDER BY embedding <=> $1::vector
LIMIT $4;
```

**Alembic Migration Order**:
1. `CREATE EXTENSION IF NOT EXISTS vector` (migration pertama)
2. `CREATE TABLE document_index_versions`
3. `CREATE TABLE document_chunks` dengan kolom `VECTOR(768)`
4. `CREATE TABLE indexing_jobs`
5. `CREATE INDEX CONCURRENTLY ... USING hnsw` (terpisah, `CONCURRENTLY`)

**Embedding Dimension Validation** (sebelum INSERT):
```python
def validate_dimensions(vectors: list[list[float]], expected: int = 768) -> None:
    for i, vec in enumerate(vectors):
        if len(vec) != expected:
            raise DimensionMismatchError(
                f"Chunk {i}: expected {expected} dimensions, got {len(vec)}"
            )
        if any(math.isnan(x) or math.isinf(x) for x in vec):
            raise DimensionMismatchError(f"Chunk {i}: contains NaN or Inf values")
```

**Batch Insert**: Gunakan 500–1000 chunk per batch. Di atas 1000 berisiko OOM pada server dengan RAM terbatas.

**Alternatives Considered**:
- IVFFlat: Ditolak — recall degradasi di 768-D tanpa tuning probes tinggi
- Qdrant / Milvus dedicated vector DB: Ditolak — ingin ACID transaction bersama metadata, hindari dual-write
- Inner product (`<#>`): Ditolak — cosine lebih stabil jika normalisasi tidak sempurna

---

## Summary Decision Table

| Area | Decision | Key Constraint |
|------|----------|----------------|
| Background processing | FastAPI BackgroundTasks (in-process) | State persisten di PostgreSQL, non-blocking via asyncio.to_thread |
| Embedding model | `intfloat/multilingual-e5-base` (768-dim) | Lokal, tidak ada cloud API |
| Model loading | Singleton via FastAPI lifespan | Dilarang reload per-request |
| Prefix strategy | `passage:` indexing, `query:` retrieval | Injeksi otomatis oleh wrapper |
| Chunk size baseline | 1200 chars / 150 overlap | Safe margin dari 512 token limit |
| Splitter | `RecursiveCharacterTextSplitter` | Hybrid LangChain |
| Vector index | HNSW `m=16 ef_c=128` cosine | pgvector, < 1M vectors |
| Multi-tenant isolation | `researcher_id` pada setiap query + composite B-Tree | FR-022, NFR-005 |
| Batch insert size | 500–1000 chunks | Balance throughput vs memory |
| Stale detection | Heartbeat + cron reaper | Alt-8 compliance |
