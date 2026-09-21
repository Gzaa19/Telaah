import { useState } from "react";
import { ImportDocumentRequest, ImportDocumentResponse } from "@/types/documents";
import { importDocument, DocumentApiError } from "@/lib/api/documents";

export function useImportDocument() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [existingDocumentId, setExistingDocumentId] = useState<string | null>(null);

  const executeImport = async (request: ImportDocumentRequest): Promise<ImportDocumentResponse | null> => {
    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    setExistingDocumentId(null);

    try {
      const response = await importDocument(request);
      return response;
    } catch (err: any) {
      if (err instanceof DocumentApiError) {
        setError(err.message);
        setErrorCode(err.errorCode || null);
        setExistingDocumentId(err.documentId || null);
      } else {
        setError(err.message || "Gagal mengimpor dokumen");
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    executeImport,
    isLoading,
    error,
    errorCode,
    existingDocumentId,
  };
}
