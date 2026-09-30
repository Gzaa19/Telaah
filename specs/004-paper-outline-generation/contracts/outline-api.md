# API Contracts: UC-04 Paper Outline Generation

**Feature**: UC-04 | **Branch**: `004-paper-outline-generation` | **Date**: 2026-09-29  
**Base URL**: `/api/outlines`  
**Auth**: All endpoints require `Authorization: Bearer <token>` (Google OAuth JWT).

---

## 1. Generate Outline

**`POST /api/outlines/generate`**

Initiates async outline generation. Returns immediately with `outline_id`.

**Request Body**:
```json
{
  "document_id": "uuid",
  "template_id": "icicos",
  "language": "en_ieee"
}
```

**Responses**:
- `202 Accepted`: `{"outline_id": "uuid", "status": "preparing"}`
- `400 Bad Request`: Document not in `Indexed` status
- `409 Conflict`: Active generation already in progress for this document
- `403 Forbidden`: Document does not belong to authenticated researcher
- `404 Not Found`: Document or template not found

---

## 2. Get Outline Status

**`GET /api/outlines/{outline_id}/status`**

Poll for generation progress.

**Response** `200 OK`:
```json
{
  "outline_id": "uuid",
  "generation_status": "generating",
  "approval_status": "draft",
  "version_number": 1,
  "progress_label": "Generating outline...",
  "failure_reason": null
}
```

`generation_status` values: `preparing`, `reading`, `generating`, `validating`, `ready`, `failed`

---

## 3. Get Outline Detail

**`GET /api/outlines/{outline_id}`**

Returns the full outline structure with sections, fields, and provenance references.

**Response** `200 OK`:
```json
{
  "outline_id": "uuid",
  "template_id": "icicos",
  "version_number": 1,
  "language_choice": "en_ieee",
  "generation_status": "ready",
  "approval_status": "draft",
  "approved_at": null,
  "sections": [
    {
      "section_id": "uuid",
      "section_key": "introduction",
      "title": "I. INTRODUCTION",
      "order_index": 1,
      "is_required": true,
      "section_status": "filled",
      "fields": [
        {
          "field_id": "uuid",
          "field_key": "background",
          "field_label": "Background",
          "content": "This paper presents a novel approach to...",
          "is_needs_input": false,
          "is_edited": false,
          "order_index": 1,
          "source_refs": [
            {
              "chunk_id": "uuid",
              "page_number": 3,
              "excerpt_text": "The existing literature on..."
            }
          ]
        },
        {
          "field_id": "uuid",
          "field_key": "research_gap",
          "field_label": "Research Gap",
          "content": "[NEEDS INPUT]",
          "is_needs_input": true,
          "is_edited": false,
          "order_index": 3,
          "source_refs": []
        }
      ]
    }
  ]
}
```

---

## 4. Update Section Field

**`PATCH /api/outlines/{outline_id}/fields/{field_id}`**

Edit a field's content (marks it as `Edited`).

**Request Body**:
```json
{
  "content": "Updated content by researcher..."
}
```

**Responses**:
- `200 OK`: Updated field with `is_edited: true`
- `403 Forbidden`: Outline does not belong to researcher
- `409 Conflict`: Outline is `approved` — returns `{"fork_outline_id": "uuid"}` for new draft

---

## 5. Regenerate Entire Outline

**`POST /api/outlines/{outline_id}/regenerate`**

Creates a new version (`vX+1`), preserving or resetting edited sections.

**Request Body**:
```json
{
  "reset_all_sections": false
}
```

**Responses**:
- `202 Accepted`: `{"outline_id": "uuid (new version)", "version_number": 2}`
- `409 Conflict`: Active generation already in progress

---

## 6. Regenerate Single Section

**`POST /api/outlines/{outline_id}/sections/{section_id}/regenerate`**

Regenerates a single section's fields in the current draft (not a version fork).

**Response** `202 Accepted`: `{"section_id": "uuid", "status": "generating"}`

---

## 7. Approve Outline

**`POST /api/outlines/{outline_id}/approve`**

Marks outline as `approved` and immutable.

**Request Body**: _(empty)_

**Response** `200 OK`:
```json
{
  "outline_id": "uuid",
  "approval_status": "approved",
  "approved_at": "2026-09-29T10:00:00Z",
  "unresolved_needs_input_count": 0
}
```

If `unresolved_needs_input_count > 0`, the client should show a warning dialog before calling this endpoint.

---

## 8. List Outline Versions

**`GET /api/outlines/document/{document_id}/versions`**

List all outline versions for a document.

**Response** `200 OK`:
```json
{
  "versions": [
    {
      "outline_id": "uuid",
      "version_number": 2,
      "approval_status": "draft",
      "generation_status": "ready",
      "created_at": "2026-09-29T11:00:00Z",
      "approved_at": null,
      "trigger": "regeneration"
    },
    {
      "outline_id": "uuid",
      "version_number": 1,
      "approval_status": "approved",
      "generation_status": "ready",
      "created_at": "2026-09-29T10:00:00Z",
      "approved_at": "2026-09-29T10:30:00Z",
      "trigger": "initial"
    }
  ]
}
```

---

## Error Format

All error responses follow:
```json
{
  "error": "DOCUMENT_NOT_INDEXED",
  "message": "The selected document has not been fully indexed yet. Please wait until indexing is complete before generating an outline.",
  "details": {}
}
```

No stack traces or internal system information is exposed in error responses (NFR-004).
