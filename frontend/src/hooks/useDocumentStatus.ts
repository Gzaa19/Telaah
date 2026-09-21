import { useState, useEffect, useCallback, useRef } from "react";
import { DocumentStatusResponse, ImportStatus } from "@/types/documents";
import { getDocumentStatus, DocumentApiError } from "@/lib/api/documents";

interface UseDocumentStatusProps {
  documentId: string | null;
  pollingIntervalMs?: number;
  onStatusChange?: (status: ImportStatus) => void;
  onCompleted?: () => void;
  onFailed?: (reason: string | null) => void;
}

export function useDocumentStatus({
  documentId,
  pollingIntervalMs = 3000,
  onStatusChange,
  onCompleted,
  onFailed,
}: UseDocumentStatusProps) {
  const [statusData, setStatusData] = useState<DocumentStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const prevStatusRef = useRef<ImportStatus | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!documentId) return;

    try {
      const data = await getDocumentStatus(documentId);
      setStatusData(data);
      setError(null);

      if (prevStatusRef.current !== data.import_status) {
        prevStatusRef.current = data.import_status;
        onStatusChange?.(data.import_status);

        if (data.import_status === "extracted") {
          onCompleted?.();
        } else if (data.import_status === "failed") {
          onFailed?.(data.failure_reason);
        }
      }
    } catch (err: any) {
      if (err instanceof DocumentApiError) {
        setError(err.message);
      } else {
        setError(err.message || "Gagal memeriksa status dokumen");
      }
    } finally {
      setIsLoading(false);
    }
  }, [documentId, onStatusChange, onCompleted, onFailed]);

  useEffect(() => {
    if (!documentId) {
      setStatusData(null);
      return;
    }

    setIsLoading(true);
    fetchStatus();

    const interval = setInterval(() => {
      // Continue polling if not terminated
      if (
        statusData?.import_status !== "extracted" &&
        statusData?.import_status !== "failed"
      ) {
        fetchStatus();
      }
    }, pollingIntervalMs);

    return () => clearInterval(interval);
  }, [documentId, fetchStatus, pollingIntervalMs, statusData?.import_status]);

  return {
    statusData,
    isLoading,
    error,
    isCompleted: statusData?.import_status === "extracted",
    isFailed: statusData?.import_status === "failed",
    refetch: fetchStatus,
  };
}
