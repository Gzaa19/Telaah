import {
  IndexingJobResponse,
  IndexingJobStatusResponse,
  DocumentIndexStatusResponse,
  DocumentIndexSummaryResponse,
  ReindexResponse,
  SimilaritySearchResponse,
} from "@/types/indexing";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function triggerIndexing(documentId: string): Promise<IndexingJobResponse> {
  const res = await fetch(`${BACKEND_URL}/api/indexing/documents/${documentId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to trigger indexing: ${res.statusText}`);
  }

  return res.json();
}

export async function fetchIndexingJob(jobId: string): Promise<IndexingJobStatusResponse> {
  const res = await fetch(`${BACKEND_URL}/api/indexing/jobs/${jobId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch indexing job: ${res.statusText}`);
  }

  return res.json();
}

export async function fetchDocumentIndexStatus(
  documentId: string
): Promise<DocumentIndexStatusResponse> {
  const res = await fetch(`${BACKEND_URL}/api/documents/${documentId}/index-status`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch document index status: ${res.statusText}`);
  }

  return res.json();
}

export async function fetchDocumentIndexSummary(
  documentId: string
): Promise<DocumentIndexSummaryResponse> {
  const res = await fetch(`${BACKEND_URL}/api/documents/${documentId}/index-summary`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch document index summary: ${res.statusText}`);
  }

  return res.json();
}

export async function requestReindex(documentId: string): Promise<ReindexResponse> {
  const res = await fetch(`${BACKEND_URL}/api/documents/${documentId}/reindex`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to request re-index: ${res.statusText}`);
  }

  return res.json();
}

export async function verifySimilaritySearch(
  query: string,
  documentId?: string,
  topK: number = 5
): Promise<SimilaritySearchResponse> {
  const params = new URLSearchParams({ q: query, top_k: String(topK) });
  if (documentId) {
    params.set("document_id", documentId);
  }

  const res = await fetch(`${BACKEND_URL}/api/search/similarity?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`Failed to run similarity search: ${res.statusText}`);
  }

  return res.json();
}
