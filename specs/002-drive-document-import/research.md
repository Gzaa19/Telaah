# Technical Research: Google Drive Document Import (UC-02)

**Branch**: `002-drive-document-import` | **Date**: 2026-09-19
**Status**: Complete — All unknowns resolved

---

## Context: What Already Exists in the Codebase

- **OAuth layer**: Custom `GoogleOAuthService` (httpx-based), already requests `drive.readonly` scope, `access_type=offline`, `prompt=consent` → gets refresh token.
- **Token storage**: `KredensialOAuth` table stores encrypted `token_akses_terenkripsi` + `token_penyegaran_terenkripsi` (Fernet AES-256), plus `token_kedaluwarsa_pada` datetime.
- **Stack**: FastAPI + SQLModel + psycopg2-binary (sync), PostgreSQL, Redis already referenced.
- **No async DB driver yet** — the worker will need `asyncpg` added.

---

## Topic 1: Google Drive API — Listing Files & Downloading Content

### ✅ Decision: `google-api-python-client` with `files.list()` + `files.get_media()`

| Operation | Endpoint / Method |
|---|---|
| List files in folder | `GET /drive/v3/files?q='FOLDER_ID' in parents and trashed=false` |
| List root | `q="'root' in parents and trashed=false"` |
| Search by name | `q="name contains 'keyword' and trashed=false"` |
| Download file (PDF/DOCX) | `service.files().get_media(fileId=file_id)` + `MediaIoBaseDownload` |
| Get metadata | `service.files().get(fileId=..., fields="id,name,mimeType,size,modifiedTime,md5Checksum")` |

**Pagination**: Pass `pageToken` from `nextPageToken` until absent. Resend same `q` param each page. Max `pageSize=100`.

**Change Detection**: Use `md5Checksum` (content hash) as primary signal, `modifiedTime` as quick pre-filter. Store both in `Dokumen` table. On re-import: if `md5Checksum` matches → trigger Alt-3 (duplicate warning).

> `md5Checksum` is only populated for binary files (PDF/DOCX). Absent for Google Workspace native files (out of scope).

### Rationale
Official SDK handles retries and chunked `MediaIoBaseDownload` natively. Raw `httpx` streaming would require reimplementing this logic.

### Alternatives Considered
- **Raw `httpx`**: Already used for OAuth, but building chunked-download streaming from scratch is error-prone. Rejected.
- **Drive v2**: Deprecated. Rejected.

---

## Topic 2: PDF Text Extraction in Python

### ✅ Decision: `pdfplumber` (MIT License)

| Criterion | PyMuPDF (fitz) | **pdfplumber** | pypdf |
|---|---|---|---|
| Multi-column academic PDFs | ✅ Excellent | ✅ Good (coordinate-based) | ❌ Scrambles order |
| Page number alongside text | ✅ | ✅ | ✅ |
| Scanned PDF detection | ✅ | ✅ | Limited |
| License | ❌ **AGPL-3.0** | ✅ **MIT** | ✅ BSD-3 |

**`pdfplumber` wins** because:
1. **License**: PyMuPDF's AGPL-3.0 would require open-sourcing Telaah or purchasing a commercial Artifex license. `pdfplumber` is MIT — no constraint.
2. **Academic paper quality**: Per-character bounding boxes (`x0`, `y0`) enable correct left-column-then-right-column reading order for multi-column papers.
3. **Page tracking**: Natural per-page iteration with `page.page_number`.

**Scanned PDF Detection Pattern**:
```python
def is_scanned_pdf(pdf_bytes_io) -> bool:
    with pdfplumber.open(pdf_bytes_io) as pdf:
        empty = sum(1 for p in pdf.pages if not p.extract_text() or len(p.extract_text().strip()) < 50)
        return (empty / len(pdf.pages)) > 0.5
# If True → status = "failed", reason = "PDF tidak mengandung teks yang dapat diekstrak (kemungkinan PDF hasil scan)."
```

**Other failure cases to catch**: `PDFPasswordIncorrect` → reason = "PDF dilindungi kata sandi."

### Caveats
- `pdfplumber` is ~5–10x slower than PyMuPDF. Acceptable because extraction runs inside a background job (ARQ).
- For multi-column layout, crop into halves: `page.within_bbox((x0, top, x1, bottom))`.

### Alternatives Considered
- **PyMuPDF**: Best performer, AGPL license. Rejected.
- **pypdf**: Poor multi-column. Rejected.
- **pdfminer.six**: `pdfplumber` is built on it — using directly loses the high-level API with no gain. Rejected.

---

## Topic 3: DOCX Text Extraction in Python

### ✅ Decision: `python-docx`

Gives direct access to DOCX object model: paragraphs, headings (`paragraph.style.name`), tables. For an indexing pipeline, clean structured text is the target — not HTML conversion.

```python
from docx import Document

def extract_docx(file_bytes_io) -> dict:
    doc = Document(file_bytes_io)
    sections = []
    for para in doc.paragraphs:
        if para.text.strip():
            sections.append({"style": para.style.name, "text": para.text.strip()})
    for table in doc.tables:
        for row in table.rows:
            row_text = " | ".join(c.text.strip() for c in row.cells)
            if row_text.strip():
                sections.append({"style": "Table", "text": row_text})
    return {"sections": sections, "full_text": "\n".join(s["text"] for s in sections)}
```

### Caveats
- Headers/footers require explicit iteration over `doc.sections[n].header.paragraphs` — not in `doc.paragraphs`.
- Embedded images are ignored (no OCR). Sparse text for image-heavy DOCX won't error.

### Alternatives Considered
- **`mammoth`**: Converts to HTML — adds unnecessary overhead for a text indexing pipeline. Rejected.
- **`unstructured`**: Excellent for RAG pipelines but heavy dependencies. Overkill for v1. Revisit for UC-03 if needed.

---

## Topic 4: Background Job Architecture in FastAPI

### ✅ Decision: `arq` + Redis (async-native)

| Criterion | BackgroundTasks | **ARQ + Redis** | Celery + Redis |
|---|---|---|---|
| Persistence (survives restart) | ❌ | ✅ | ✅ |
| Retry on failure | ❌ Manual | ✅ Built-in | ✅ Built-in |
| Async-native | ✅ | ✅ | ❌ |
| Overhead | None | Low (Redis only) | High |
| Status tracking | ❌ | ✅ DB + Redis | ✅ |

**ARQ wins**: Redis already in stack. `BackgroundTasks` loses jobs on restart (FR-012 requires retry). Celery is sync-heavy — impedance mismatch with FastAPI async.

**Status Update Pattern**:
```
importing → extracting → extracted   (success path)
importing → failed                   (download error, transient → retry)
extracting → failed                  (scanned PDF, encrypted → NO retry, permanent)
```

**Retry policy**: `max_tries=3` for transient errors (Drive API 5xx, network). `max_tries=1` (no retry) for permanent failures (scanned PDF, password-protected, user revoked access).

**Real-time status (FR-013)**: Client polls `GET /documents/{id}/status` — worker writes status directly to PostgreSQL. No WebSocket needed for v1.

> **Note on ARQ maintenance**: Original `arq` is stable. `SAQ` (Simple Async Queue) is the recommended modern fork — evaluate migration post-v1.

### Caveat: Async DB in Worker
ARQ worker is async; main FastAPI uses sync `psycopg2-binary`. **Decision**: Add `asyncpg` for the worker engine only. FastAPI app keeps its sync engine. Worker uses `DATABASE_URL` with `postgresql+asyncpg://` driver.

---

## Topic 5: Google OAuth Token Refresh

### ✅ Decision: `google-auth` layered over existing custom flow (NOT replacing it)

The existing `KredensialOAuth` table already has encrypted refresh tokens and expiry timestamps. We layer `google.oauth2.credentials.Credentials.refresh()` as a thin utility only — no replacement of the existing OAuth flow.

```python
async def get_valid_access_token(oauth_cred: KredensialOAuth) -> str:
    now = datetime.now(timezone.utc)
    if oauth_cred.token_kedaluwarsa_pada > now + timedelta(seconds=60):
        return decrypt(oauth_cred.token_akses_terenkripsi)  # Fast path

    # Slow path: refresh
    creds = Credentials(token=None, refresh_token=decrypt(oauth_cred.token_penyegaran_terenkripsi),
                        token_uri="https://oauth2.googleapis.com/token", ...)
    await asyncio.get_event_loop().run_in_executor(None, creds.refresh, Request())  # sync → executor
    await persist_new_token(oauth_cred, creds.token, creds.expiry)
    return creds.token
```

**Failure cases**: `google.auth.exceptions.RefreshError` (revoked access, token expired >6 months, password changed) → set document `failed`, reason = "Akses Google Drive dicabut — silakan hubungkan ulang akun Drive Anda."

### Packages Needed (NOT `google-auth-oauthlib` — existing flow handles auth dance)
```
google-api-python-client>=2.120.0
google-auth>=2.29.0
google-auth-httplib2>=0.2.0
```

### Why NOT Authlib?
Replacing the existing custom OAuth flow mid-project is a breaking refactor with no benefit for UC-02. `google-auth` adds only what's missing: silent token refresh.

---

## Summary: Final Decisions

| Topic | Decision | New Packages |
|---|---|---|
| Drive API | `google-api-python-client` — `files.list()` + `files.get_media()` | `google-api-python-client>=2.120.0`, `google-auth>=2.29.0`, `google-auth-httplib2>=0.2.0` |
| PDF Extraction | `pdfplumber` (MIT, coordinate-aware, page tracking) | `pdfplumber>=0.11.0` |
| DOCX Extraction | `python-docx` (direct object model, paragraph/table support) | `python-docx>=1.1.0` |
| Background Jobs | `arq` + Redis (async-native, retry, persistence) | `arq>=0.25.0`, `asyncpg>=0.29.0` |
| Token Refresh | `google-auth Credentials.refresh()` over existing flow | Already covered above |

### New `requirements.txt` Additions
```
google-api-python-client>=2.120.0
google-auth>=2.29.0
google-auth-httplib2>=0.2.0
pdfplumber>=0.11.0
python-docx>=1.1.0
arq>=0.25.0
asyncpg>=0.29.0
```

### Cross-Cutting Caveats
1. **asyncpg vs psycopg2-binary**: ARQ worker uses `postgresql+asyncpg://` engine; FastAPI main app keeps sync `psycopg2-binary` engine. Two separate SQLAlchemy engine configs.
2. **Drive file size**: Stream large files (>50 MB) to `tempfile.SpooledTemporaryFile` — don't load entirely into memory.
3. **`md5Checksum` for change detection**: Store in `Dokumen.md5_checksum_drive`. Available for PDF/DOCX binary files; absent for Google Workspace native files (out of scope).
