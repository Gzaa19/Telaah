# Quickstart Validation Guide: Google Drive Document Import (UC-02)

**Branch**: `002-drive-document-import` | **Date**: 2026-09-19
**Purpose**: Runnable validation scenarios to prove UC-02 works end-to-end
**References**: [data-model.md](data-model.md) | [contracts/api.md](contracts/api.md) | [plan.md](plan.md)

---

## Prerequisites

1. **PostgreSQL** running dengan migration `002_document_import_schema.py` applied:
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
6. **Test user** sudah login via Google OAuth (UC-01 selesai, session cookie aktif).
7. **Google Drive test files** disiapkan di Drive akun test:
   - `test_paper.pdf` — PDF digital dengan teks nyata (>5 halaman)
   - `test_paper_scan.pdf` — PDF hasil scan (gambar, tidak ada teks)
   - `test_paper_encrypted.pdf` — PDF dilindungi password
   - `test_doc.docx` — File DOCX dengan paragraf dan tabel
   - `test_image.jpg` — File JPEG (untuk validasi filter tipe)

---

## Scenario 1: Browse Drive & Filter Tipe File ✅

**Goal**: Validasi SC-001, SC-003 — File browser muncul dan hanya PDF/DOCX yang dapat dipilih.

```bash
# API validation
curl -s -b session.cookie "http://localhost:8000/api/drive/files?folder_id=root" | jq '.files[] | {name, tipe_file, can_import}'
```

**Expected**:
- `test_paper.pdf` → `can_import: true`
- `test_doc.docx` → `can_import: true`
- `test_image.jpg` → `can_import: false`
- Folders → `is_folder: true, can_import: false`

**Frontend**: Buka `http://localhost:3000/library` → klik "Tambah Dokumen". Verify file JPG tidak memiliki tombol "Pilih" yang aktif.

---

## Scenario 2: Import PDF Berhasil (Happy Path) ✅

**Goal**: Validasi SC-004, SC-005, SC-006, SC-007 — Import + ekstraksi berhasil, UC-03 dipicu.

```bash
# Step 1: Dapatkan drive_file_id untuk test_paper.pdf
FILE_ID=$(curl -s -b session.cookie "http://localhost:8000/api/drive/files?q=test_paper" | jq -r '.files[0].id')

# Step 2: Mulai import
RESULT=$(curl -s -b session.cookie -X POST "http://localhost:8000/api/documents/import" \
  -H "Content-Type: application/json" \
  -d "{\"drive_file_id\": \"$FILE_ID\", \"nama_file\": \"test_paper.pdf\", \"tipe_file\": \"pdf\"}")
DOC_ID=$(echo $RESULT | jq -r '.dokumen_id')
echo "Document ID: $DOC_ID"

# Step 3: Poll status hingga extracted (max 60 detik)
for i in {1..20}; do
  STATUS=$(curl -s -b session.cookie "http://localhost:8000/api/documents/$DOC_ID/status" | jq -r '.status_import')
  echo "[$i] status: $STATUS"
  if [ "$STATUS" = "extracted" ] || [ "$STATUS" = "failed" ]; then break; fi
  sleep 3
done
```

**Expected**:
- Status berurutan: `importing → extracting → extracted`
- `status_indexing` berubah ke `queued` segera setelah `extracted` (UC-03 dipicu)

**DB Validation**:
```sql
SELECT d.status_import, t.total_halaman, COUNT(h.id) as jumlah_halaman
FROM dokumen d
JOIN teks_ekstraksi t ON t.dokumen_id = d.id
JOIN halaman_ekstraksi h ON h.teks_ekstraksi_id = t.id
WHERE d.id = '<DOC_ID>'
GROUP BY d.status_import, t.total_halaman;
-- Expected: status_import='extracted', total_halaman > 0, jumlah_halaman = total_halaman
```

---

## Scenario 3: Import DOCX Berhasil ✅

**Goal**: Validasi FR-007, FR-008 — DOCX terekstrak dengan paragraph dan tabel.

```bash
FILE_ID=$(curl -s -b session.cookie "http://localhost:8000/api/drive/files?q=test_doc" | jq -r '.files[0].id')
curl -s -b session.cookie -X POST "http://localhost:8000/api/documents/import" \
  -H "Content-Type: application/json" \
  -d "{\"drive_file_id\": \"$FILE_ID\", \"nama_file\": \"test_doc.docx\", \"tipe_file\": \"docx\"}" | jq
```

**Expected**: `202 Accepted`. Status mencapai `extracted`. `teks_ekstraksi.konten_teks_penuh` berisi teks paragraf dan baris tabel.

---

## Scenario 4: Import PDF Scan — Permanent Failure (Alt-5) ✅

**Goal**: Validasi SC-009 — PDF scan menghasilkan error yang jelas, tanpa retry otomatis.

```bash
FILE_ID=$(curl -s -b session.cookie "http://localhost:8000/api/drive/files?q=test_paper_scan" | jq -r '.files[0].id')
DOC_ID=$(curl -s -b session.cookie -X POST "http://localhost:8000/api/documents/import" \
  -H "Content-Type: application/json" \
  -d "{\"drive_file_id\": \"$FILE_ID\", \"nama_file\": \"test_paper_scan.pdf\", \"tipe_file\": \"pdf\"}" | jq -r '.dokumen_id')

sleep 10
curl -s -b session.cookie "http://localhost:8000/api/documents/$DOC_ID/status" | jq '{status_import, alasan_gagal}'
```

**Expected**:
```json
{
  "status_import": "failed",
  "alasan_gagal": "PDF tidak mengandung teks yang dapat diekstrak (kemungkinan PDF hasil scan)."
}
```
**ARQ logs**: Task runs only once (no retry). No entry in `teks_ekstraksi`.

---

## Scenario 5: Duplikat Import — 409 Conflict (Alt-3) ✅

**Goal**: Validasi SC-008 — Import file yang sama dua kali tanpa `force_reimport` menghasilkan 409.

```bash
# Gunakan FILE_ID dari Scenario 2 (test_paper.pdf sudah terimport)
curl -s -b session.cookie -X POST "http://localhost:8000/api/documents/import" \
  -H "Content-Type: application/json" \
  -d "{\"drive_file_id\": \"$FILE_ID\", \"nama_file\": \"test_paper.pdf\", \"tipe_file\": \"pdf\"}" | jq
```

**Expected**: `HTTP 409 Conflict` dengan `error_code: "DUPLICATE_DOCUMENT"` dan `dokumen_id` dokumen yang sudah ada.

**Override test** (force_reimport):
```bash
curl -s -b session.cookie -X POST "http://localhost:8000/api/documents/import" \
  -H "Content-Type: application/json" \
  -d "{\"drive_file_id\": \"$FILE_ID\", \"nama_file\": \"test_paper.pdf\", \"tipe_file\": \"pdf\", \"force_reimport\": true}" | jq
```
**Expected**: `HTTP 202 Accepted` — proses import ulang dimulai.

---

## Scenario 6: Retry Import Gagal (UC-02b) ✅

**Goal**: Validasi FR-012 — Dokumen dengan status `failed` dapat di-retry.

```bash
# Gunakan DOC_ID dari Scenario 4 (PDF scan — status failed)
curl -s -b session.cookie -X POST "http://localhost:8000/api/documents/$DOC_ID/retry" | jq
```

**Expected**: `HTTP 202 Accepted` dengan `status: "importing"`. (Akan kembali `failed` dengan alasan yang sama — ini expected, karena PDF scan tidak bisa tiba-tiba berubah. Validasi bahwa retry endpoint berfungsi dan status cycling benar.)

---

## Scenario 7: Tidak Ada Perubahan File di Drive ✅

**Goal**: Validasi SC-006 (tambahan) — `md5Checksum` disimpan dan dapat digunakan untuk deteksi perubahan konten.

```sql
-- Verify md5_checksum_drive tersimpan
SELECT nama_file, md5_checksum_drive, status_import
FROM dokumen
WHERE nama_file = 'test_paper.pdf';
-- Expected: md5_checksum_drive IS NOT NULL
```

---

## Expected Final State (Setelah Semua Scenario)

```sql
SELECT nama_file, status_import, alasan_gagal
FROM dokumen
ORDER BY waktu_import;
```

| `nama_file` | `status_import` | `alasan_gagal` |
|---|---|---|
| `test_paper.pdf` | `extracted` | `null` |
| `test_doc.docx` | `extracted` | `null` |
| `test_paper_scan.pdf` | `failed` | `"PDF tidak mengandung teks..."` |

---

## Checklist Sebelum Lanjut ke `/speckit-tasks`

- [ ] Scenario 1–7 semua pass
- [ ] ARQ worker berjalan tanpa memory leak (monitor dengan `arq info`)
- [ ] `teks_ekstraksi` + `halaman_ekstraksi` terisi dengan benar untuk PDF dan DOCX
- [ ] `dokumen.md5_checksum_drive` terisi untuk semua import yang berhasil
- [ ] UC-03 dipicu otomatis (`status_indexing: "queued"`) setelah `extracted`
- [ ] Tidak ada file yang dimodifikasi di Google Drive selama semua scenario (SC-010)
