export type IndexingStatus =
  | 'queued'
  | 'cleaning'
  | 'chunking'
  | 'embedding'
  | 'storing'
  | 'indexed'
  | 'failed'
  | 'archived';

export type IndexingStage = 'cleaning' | 'chunking' | 'embedding' | 'storing' | null;

export interface IndexingJobResponse {
  job_id: string;
  index_version_id: string;
  document_id: string;
  status: IndexingStatus;
  message: string;
}

export interface IndexingJobStatusResponse {
  job_id: string;
  document_id: string;
  index_version_id: string;
  status: IndexingStatus;
  current_stage: IndexingStage;
  retry_count: number;
  failure_reason: string | null;
  enqueued_at: string;
  started_at: string | null;
  completed_at: string | null;
  heartbeat_at: string | null;
}

export interface DocumentIndexStatusResponse {
  document_id: string;
  file_name?: string;
  status: IndexingStatus;
  stage: IndexingStage;
  total_chunks: number | null;
  model_name: string | null;
  embedding_dimension: number | null;
  completed_at: string | null;
  failure_reason: string | null;
}

export interface DocumentIndexSummaryResponse {
  document_id: string;
  file_name: string;
  index_version_id: string;
  status: IndexingStatus;
  model_name: string;
  model_version: string;
  embedding_dimension: number;
  chunk_size: number;
  chunk_overlap: number;
  total_chunks: number;
  source_checksum: string;
  completed_at: string | null;
  is_active: boolean;
}

export interface ReindexResponse {
  job_id: string;
  new_index_version_id: string;
  archived_index_version_id: string;
  document_id: string;
  status: IndexingStatus;
  message: string;
}

export interface SimilaritySearchResultItem {
  chunk_id: string;
  chunk_index: number;
  similarity_score: number;
  chunk_text: string;
  document_id: string;
  document_title: string | null;
  page_number: number | null;
  section_name: string | null;
}

export interface SimilaritySearchResponse {
  query: string;
  total_results: number;
  results: SimilaritySearchResultItem[];
}
