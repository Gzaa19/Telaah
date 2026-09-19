# API Contracts: Google Drive Document Import (UC-02)

**Branch**: `002-drive-document-import` | **Date**: 2026-09-19
**Base URL**: `/api` | **Auth**: Session cookie (`telaah_session`) required on all endpoints

---

## GET /api/drive/files

Browse file dan folder dari Google Drive peneliti.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `folder_id` | `string` | No | `"root"` | Google Drive folder ID. `"root"` untuk root Drive. |
| `q` | `string` | No | `""` | Pencarian berdasarkan nama file (min 2 karakter). |
| `page_token` | `string` | No | `null` | Token paginasi dari response sebelumnya. |
| `page_size` | `integer` | No | `50` | Jumlah item per halaman. Max: `100`. |

### Response: 200 OK

```json
{
  "files": [
    {
      "id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
      "name": "Systematic Review - Metode RAG.pdf",
      "mime_type": "application/pdf",
      "tipe_file": "pdf",
      "ukuran_bytes": 2048000,
      "tanggal_modifikasi": "2026-09-10T14:30:00Z",
      "is_folder": false,
      "can_import": true
    },
    {
      "id": "0B1Yt7kl9YtHgZ2F2a2RtRUNFYm8",
      "name": "Literatur",
      "mime_type": "application/vnd.google-apps.folder",
      "tipe_file": null,
      "ukuran_bytes": null,
      "tanggal_modifikasi": "2026-09-01T08:00:00Z",
      "is_folder": true,
      "can_import": false
    }
  ],
  "next_page_token": "~!!~AI9FV7Qp5JZuMaG...",
  "folder_path": [
    { "id": "root", "name": "My Drive" },
    { "id": "0B1Yt7kl9YtHgZ2F2a2RtRUNFYm8", "name": "Literatur" }
  ]
}
```

> `can_import: true` hanya untuk file `pdf` dan `docx`. `folder_path` digunakan untuk breadcrumb navigasi.

### Response: 401 Unauthorized
```json
{ "detail": "Sesi tidak valid atau telah kedaluwarsa." }
```

### Response: 403 Forbidden (token Drive revoked)
```json
{ "detail": "Akses Google Drive dicabut. Silakan hubungkan ulang akun Drive Anda.", "error_code": "DRIVE_TOKEN_REVOKED" }
```

---

## POST /api/documents/import

Memulai proses import dokumen dari Google Drive.

### Request Body

```json
{
  "drive_file_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
  "nama_file": "Systematic Review - Metode RAG.pdf",
  "tipe_file": "pdf",
  "ukuran_bytes": 2048000,
  "md5_checksum": "d41d8cd98f00b204e9800998ecf8427e",
  "force_reimport": false
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `drive_file_id` | `string` | Yes | Google Drive file ID |
| `nama_file` | `string` | Yes | Nama file dari Drive |
| `tipe_file` | `"pdf" \| "docx"` | Yes | Tipe file |
| `ukuran_bytes` | `integer` | No | Ukuran file dari Drive metadata |
| `md5_checksum` | `string` | No | md5Checksum dari Drive API |
| `force_reimport` | `boolean` | No (default `false`) | `true` untuk override dokumen yang sudah pernah diimpor (Alt-3) |

### Response: 202 Accepted (job enqueued)

```json
{
  "dokumen_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "importing",
  "nama_file": "Systematic Review - Metode RAG.pdf",
  "pesan": "Import dokumen sedang diproses."
}
```

### Response: 409 Conflict (duplikat, `force_reimport` tidak di-set)

```json
{
  "detail": "Dokumen ini sudah pernah diimpor.",
  "dokumen_id": "550e8400-e29b-41d4-a716-446655440000",
  "status_import_saat_ini": "extracted",
  "error_code": "DUPLICATE_DOCUMENT"
}
```

> Frontend menampilkan konfirmasi dialog (Alt-3). Jika peneliti konfirmasi, kirim ulang dengan `force_reimport: true`.

### Response: 422 Unprocessable Entity (tipe file tidak didukung)
```json
{ "detail": "Tipe file tidak didukung. Hanya PDF dan DOCX yang dapat diimpor.", "error_code": "UNSUPPORTED_FILE_TYPE" }
```

---

## GET /api/documents/{document_id}/status

Polling status import dokumen (digunakan oleh SCR-04 setiap ~3 detik).

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `document_id` | `UUID` | ID dokumen yang diimpor |

### Response: 200 OK

```json
{
  "dokumen_id": "550e8400-e29b-41d4-a716-446655440000",
  "nama_file": "Systematic Review - Metode RAG.pdf",
  "status_import": "extracting",
  "alasan_gagal": null,
  "waktu_import": "2026-09-19T11:40:00Z",
  "waktu_ekstraksi_selesai": null,
  "status_indexing": null
}
```

`status_import` values: `importing | extracting | extracted | failed`
`status_indexing` (dari UC-03 setelah ekstraksi selesai): `queued | extracting | chunking | embedding | indexed | failed | null`

### Response: 200 OK (failed)

```json
{
  "dokumen_id": "550e8400-e29b-41d4-a716-446655440000",
  "nama_file": "Laporan Scan.pdf",
  "status_import": "failed",
  "alasan_gagal": "PDF tidak mengandung teks yang dapat diekstrak (kemungkinan PDF hasil scan).",
  "waktu_import": "2026-09-19T11:40:00Z",
  "waktu_ekstraksi_selesai": null,
  "status_indexing": null
}
```

### Response: 404 Not Found
```json
{ "detail": "Dokumen tidak ditemukan." }
```

---

## POST /api/documents/{document_id}/retry

Memulai ulang import dokumen yang gagal (UC-02b).

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `document_id` | `UUID` | ID dokumen dengan status `failed` |

### Response: 202 Accepted
```json
{
  "dokumen_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "importing",
  "pesan": "Import ulang dokumen sedang diproses."
}
```

### Response: 409 Conflict (status bukan `failed`)
```json
{ "detail": "Retry hanya dapat dilakukan pada dokumen dengan status 'failed'.", "status_saat_ini": "extracted" }
```

---

## Frontend API Client Types (TypeScript)

```typescript
// types/drive.ts
export interface DriveFile {
  id: string;
  name: string;
  mime_type: string;
  tipe_file: 'pdf' | 'docx' | null;
  ukuran_bytes: number | null;
  tanggal_modifikasi: string;
  is_folder: boolean;
  can_import: boolean;
}

export interface DriveFileListResponse {
  files: DriveFile[];
  next_page_token: string | null;
  folder_path: { id: string; name: string }[];
}

// types/documents.ts
export interface ImportDocumentRequest {
  drive_file_id: string;
  nama_file: string;
  tipe_file: 'pdf' | 'docx';
  ukuran_bytes?: number;
  md5_checksum?: string;
  force_reimport?: boolean;
}

export interface ImportDocumentResponse {
  dokumen_id: string;
  status: ImportStatus;
  nama_file: string;
  pesan: string;
}

export type ImportStatus = 'importing' | 'extracting' | 'extracted' | 'failed';
export type IndexingStatus = 'queued' | 'extracting' | 'chunking' | 'embedding' | 'indexed' | 'failed' | null;

export interface DocumentStatusResponse {
  dokumen_id: string;
  nama_file: string;
  status_import: ImportStatus;
  alasan_gagal: string | null;
  waktu_import: string;
  waktu_ekstraksi_selesai: string | null;
  status_indexing: IndexingStatus;
}
```
