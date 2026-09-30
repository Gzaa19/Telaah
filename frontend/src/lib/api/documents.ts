import {
  ImportDocumentRequest,
  ImportDocumentResponse,
  DocumentStatusResponse,
} from "@/types/documents";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class DocumentApiError extends Error {
  statusCode: number;
  errorCode?: string;
  documentId?: string;
  currentImportStatus?: string;

  constructor(
    message: string,
    statusCode: number,
    errorCode?: string,
    documentId?: string,
    currentImportStatus?: string
  ) {
    super(message);
    this.name = "DocumentApiError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.documentId = documentId;
    this.currentImportStatus = currentImportStatus;
  }
}

export async function importDocument(
  request: ImportDocumentRequest
): Promise<ImportDocumentResponse> {
  const res = await fetch(`${BACKEND_URL}/api/documents/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    let errorData: any = {};
    try {
      errorData = await res.json();
    } catch {
      // Ignored
    }
    const message = errorData.detail || errorData.message || res.statusText || "Gagal mengimpor dokumen";
    throw new DocumentApiError(
      message,
      res.status,
      errorData.error_code,
      errorData.document_id,
      errorData.current_import_status
    );
  }

  return await res.json();
}

export async function getDocumentStatus(
  documentId: string
): Promise<DocumentStatusResponse> {
  const res = await fetch(`${BACKEND_URL}/api/documents/${documentId}/status`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!res.ok) {
    let errorData: any = {};
    try {
      errorData = await res.json();
    } catch {
      // Ignored
    }
    const message = errorData.detail || errorData.message || res.statusText || "Gagal memuat status dokumen";
    throw new DocumentApiError(message, res.status, errorData.error_code);
  }

  return await res.json();
}

export async function retryImportDocument(
  documentId: string
): Promise<ImportDocumentResponse> {
  const res = await fetch(`${BACKEND_URL}/api/documents/${documentId}/retry`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!res.ok) {
    let errorData: any = {};
    try {
      errorData = await res.json();
    } catch {
      // Ignored
    }
    const message = errorData.detail || errorData.message || res.statusText || "Gagal mengulang impor dokumen";
    throw new DocumentApiError(message, res.status, errorData.error_code);
  }

  return await res.json();
}

export interface DocumentItem {
  id: string;
  google_drive_id: string;
  file_name: string;
  file_type: string;
  file_size_bytes?: number;
  import_status: string;
  failure_reason?: string;
  imported_at?: string;
  extracted_at?: string;
  index_status?: string;
}

export async function fetchDocuments(): Promise<DocumentItem[]> {
  const res = await fetch(`${BACKEND_URL}/api/documents`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Gagal mengambil daftar dokumen");
  }
  return res.json();
}

