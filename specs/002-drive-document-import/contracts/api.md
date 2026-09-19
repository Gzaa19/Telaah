# API Contracts: Google Drive Document Import (UC-02)

**Branch**: `002-drive-document-import` | **Date**: 2026-09-19
**Base URL**: `/api` | **Auth**: Session cookie (`telaah_session`) required on all endpoints

---

## GET /api/drive/files

Browse files and folders from the researcher's connected Google Drive.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `folder_id` | `string` | No | `"root"` | Google Drive folder ID. `"root"` for Drive root. |
| `q` | `string` | No | `""` | Search keyword by file name (min 2 characters). |
| `page_token` | `string` | No | `null` | Pagination token from previous response. |
| `page_size` | `integer` | No | `50` | Number of items per page. Max: `100`. |

### Response: 200 OK

```json
{
  "files": [
    {
      "id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
      "name": "Systematic Review - RAG Methods.pdf",
      "mime_type": "application/pdf",
      "file_type": "pdf",
      "size_bytes": 2048000,
      "modified_at": "2026-09-10T14:30:00Z",
      "is_folder": false,
      "can_import": true
    },
    {
      "id": "0B1Yt7kl9YtHgZ2F2a2RtRUNFYm8",
      "name": "Literature",
      "mime_type": "application/vnd.google-apps.folder",
      "file_type": null,
      "size_bytes": null,
      "modified_at": "2026-09-01T08:00:00Z",
      "is_folder": true,
      "can_import": false
    }
  ],
  "next_page_token": "~!!~AI9FV7Qp5JZuMaG...",
  "folder_path": [
    { "id": "root", "name": "My Drive" },
    { "id": "0B1Yt7kl9YtHgZ2F2a2RtRUNFYm8", "name": "Literature" }
  ]
}
```

> `can_import: true` is strictly set for `pdf` and `docx` files. `folder_path` is used for breadcrumb navigation.

### Response: 401 Unauthorized
```json
{ "detail": "Invalid or expired session." }
```

### Response: 403 Forbidden (Drive token revoked)
```json
{ "detail": "Google Drive access has been revoked. Please reconnect your Drive account.", "error_code": "DRIVE_TOKEN_REVOKED" }
```

---

## POST /api/documents/import

Initiate document import and background text extraction from Google Drive.

### Request Body

```json
{
  "drive_file_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
  "file_name": "Systematic Review - RAG Methods.pdf",
  "file_type": "pdf",
  "file_size_bytes": 2048000,
  "drive_md5_checksum": "d41d8cd98f00b204e9800998ecf8427e",
  "force_reimport": false
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `drive_file_id` | `string` | Yes | Google Drive file ID |
| `file_name` | `string` | Yes | Original file name from Drive |
| `file_type` | `"pdf" \| "docx"` | Yes | Supported file type |
| `file_size_bytes` | `integer` | No | File size in bytes from Drive metadata |
| `drive_md5_checksum` | `string` | No | md5Checksum from Drive API for change detection |
| `force_reimport` | `boolean` | No (default `false`) | Set `true` to overwrite previously imported document (Alt-3) |

### Response: 202 Accepted (Job Enqueued)

```json
{
  "document_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "importing",
  "file_name": "Systematic Review - RAG Methods.pdf",
  "message": "Document import is being processed in background."
}
```

### Response: 409 Conflict (Duplicate without force_reimport)

```json
{
  "detail": "This document has already been imported.",
  "document_id": "550e8400-e29b-41d4-a716-446655440000",
  "current_import_status": "extracted",
  "error_code": "DUPLICATE_DOCUMENT"
}
```

> The frontend renders a confirmation dialog (Alt-3). When confirmed, the researcher re-submits with `force_reimport: true`.

### Response: 422 Unprocessable Entity (Unsupported file type)
```json
{ "detail": "Unsupported file type. Only PDF and DOCX files can be imported.", "error_code": "UNSUPPORTED_FILE_TYPE" }
```

---

## GET /api/documents/{document_id}/status

Poll import status of a specific document (used by SCR-04 every ~3 seconds).

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `document_id` | `UUID` | ID of the imported document |

### Response: 200 OK (In Progress or Extracted)

```json
{
  "document_id": "550e8400-e29b-41d4-a716-446655440000",
  "file_name": "Systematic Review - RAG Methods.pdf",
  "import_status": "extracting",
  "failure_reason": null,
  "imported_at": "2026-09-19T11:40:00Z",
  "extracted_at": null,
  "indexing_status": null
}
```

`import_status` values: `importing | extracting | extracted | failed`  
`indexing_status` (from UC-03 once extraction completes): `queued | extracting | chunking | embedding | indexed | failed | null`

### Response: 200 OK (Failed)

```json
{
  "document_id": "550e8400-e29b-41d4-a716-446655440000",
  "file_name": "Scanned Report.pdf",
  "import_status": "failed",
  "failure_reason": "PDF does not contain extractable text (likely a scanned image).",
  "imported_at": "2026-09-19T11:40:00Z",
  "extracted_at": null,
  "indexing_status": null
}
```

### Response: 404 Not Found
```json
{ "detail": "Document not found." }
```

---

## POST /api/documents/{document_id}/retry

Retry a failed document import (UC-02b).

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `document_id` | `UUID` | ID of the document with `failed` status |

### Response: 202 Accepted
```json
{
  "document_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "importing",
  "message": "Document re-import is being processed in background."
}
```

### Response: 409 Conflict (Document not in `failed` status)
```json
{ "detail": "Retry can only be triggered for documents with 'failed' status.", "current_status": "extracted" }
```

---

## Frontend API Client Types (TypeScript)

```typescript
// types/drive.ts
export interface DriveFile {
  id: string;
  name: string;
  mime_type: string;
  file_type: 'pdf' | 'docx' | null;
  size_bytes: number | null;
  modified_at: string;
  is_folder: boolean;
  can_import: boolean;
}

export interface DriveFileListResponse {
  files: DriveFile[];
  next_page_token: string | null;
  folder_path: { id: string; name: string }[];
}

// types/documents.ts
export type ImportStatus = 'importing' | 'extracting' | 'extracted' | 'failed';
export type IndexingStatus = 'queued' | 'extracting' | 'chunking' | 'embedding' | 'indexed' | 'failed' | null;

export interface ImportDocumentRequest {
  drive_file_id: string;
  file_name: string;
  file_type: 'pdf' | 'docx';
  file_size_bytes?: number;
  drive_md5_checksum?: string;
  force_reimport?: boolean;
}

export interface ImportDocumentResponse {
  document_id: string;
  status: ImportStatus;
  file_name: string;
  message: string;
}

export interface DocumentStatusResponse {
  document_id: string;
  file_name: string;
  import_status: ImportStatus;
  failure_reason: string | null;
  imported_at: string;
  extracted_at: string | null;
  indexing_status: IndexingStatus;
}
```
