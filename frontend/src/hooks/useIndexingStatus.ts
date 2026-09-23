import { useState, useEffect, useCallback, useRef } from "react";
import { DocumentIndexStatusResponse, IndexingStatus } from "@/types/indexing";
import { fetchDocumentIndexStatus, triggerIndexing } from "@/lib/api/indexing";

interface UseIndexingStatusProps {
  documentId: string | null;
  pollingIntervalMs?: number;
  autoPoll?: boolean;
  onCompleted?: () => void;
  onFailed?: (reason: string | null) => void;
}

export function useIndexingStatus({
  documentId,
  pollingIntervalMs = 3000,
  autoPoll = true,
  onCompleted,
  onFailed,
}: UseIndexingStatusProps) {
  const [data, setData] = useState<DocumentIndexStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const prevStatusRef = useRef<IndexingStatus | string | null>(null);

  const refetch = useCallback(async () => {
    if (!documentId) return;
    try {
      const res = await fetchDocumentIndexStatus(documentId);
      setData(res);
      setError(null);

      if (prevStatusRef.current !== res.status) {
        prevStatusRef.current = res.status;
        if (res.status === "indexed") {
          onCompleted?.();
        } else if (res.status === "failed") {
          onFailed?.(res.failure_reason || null);
        }
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat status indexing");
    } finally {
      setIsLoading(false);
    }
  }, [documentId, onCompleted, onFailed]);

  const startIndexing = useCallback(async () => {
    if (!documentId) return;
    setIsTriggering(true);
    setError(null);
    try {
      await triggerIndexing(documentId);
      await refetch();
    } catch (err: any) {
      setError(err.message || "Gagal memulai proses indexing");
      throw err;
    } finally {
      setIsTriggering(false);
    }
  }, [documentId, refetch]);

  useEffect(() => {
    if (!documentId) {
      setData(null);
      return;
    }

    setIsLoading(true);
    refetch();

    if (!autoPoll) return;

    const interval = setInterval(() => {
      // Poll while in intermediate state
      if (
        data?.status &&
        ["queued", "cleaning", "chunking", "embedding", "storing"].includes(data.status)
      ) {
        refetch();
      }
    }, pollingIntervalMs);

    return () => clearInterval(interval);
  }, [documentId, autoPoll, pollingIntervalMs, refetch, data?.status]);

  return {
    data,
    status: data?.status || "not_indexed",
    stage: data?.stage,
    totalChunks: data?.total_chunks,
    modelName: data?.model_name,
    embeddingDimension: data?.embedding_dimension,
    failureReason: data?.failure_reason,
    isLoading,
    isTriggering,
    error,
    refetch,
    startIndexing,
  };
}
