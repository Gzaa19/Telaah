import { useState, useCallback } from "react";
import { ReindexResponse } from "@/types/indexing";
import { requestReindex } from "@/lib/api/indexing";

interface UseReindexProps {
  onSuccess?: (response: ReindexResponse) => void;
  onError?: (error: Error) => void;
}

export function useReindex({ onSuccess, onError }: UseReindexProps = {}) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const reindex = useCallback(
    async (documentId: string): Promise<ReindexResponse | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await requestReindex(documentId);
        onSuccess?.(res);
        return res;
      } catch (err: any) {
        const msg = err.message || "Gagal memicu proses re-indexing";
        setError(msg);
        onError?.(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess, onError]
  );

  return {
    reindex,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}
