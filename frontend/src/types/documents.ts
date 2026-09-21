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
