import { useState, useEffect, useCallback } from "react";
import { DriveFile, DriveFileListResponse } from "@/types/drive";
import { fetchDriveFiles, DriveApiError } from "@/lib/api/drive";

interface UseDriveFilesProps {
  initialFolderId?: string;
  searchQuery?: string;
}

export function useDriveFiles({
  initialFolderId = "root",
  searchQuery = "",
}: UseDriveFilesProps = {}) {
  const [folderId, setFolderId] = useState<string>(initialFolderId);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([
    { id: "root", name: "My Drive" },
  ]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const loadFiles = useCallback(
    async (targetFolderId: string, query: string, pageToken?: string, append: boolean = false) => {
      setIsLoading(true);
      setError(null);
      setErrorCode(null);

      try {
        const response: DriveFileListResponse = await fetchDriveFiles({
          folder_id: targetFolderId,
          q: query,
          page_token: pageToken,
        });

        if (append) {
          setFiles((prev) => [...prev, ...response.files]);
        } else {
          setFiles(response.files);
        }

        if (response.folder_path && response.folder_path.length > 0) {
          setFolderPath(response.folder_path);
        }
        setNextPageToken(response.next_page_token);
      } catch (err: any) {
        if (err instanceof DriveApiError) {
          setError(err.message);
          setErrorCode(err.errorCode || null);
        } else {
          setError(err.message || "Gagal memuat berkas dari Google Drive");
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadFiles(folderId, searchQuery);
  }, [folderId, searchQuery, loadFiles]);

  const navigateToFolder = (targetId: string) => {
    setFolderId(targetId);
  };

  const loadMore = () => {
    if (nextPageToken && !isLoading) {
      loadFiles(folderId, searchQuery, nextPageToken, true);
    }
  };

  const refetch = () => {
    loadFiles(folderId, searchQuery);
  };

  return {
    files,
    folderPath,
    folderId,
    nextPageToken,
    isLoading,
    error,
    errorCode,
    navigateToFolder,
    loadMore,
    refetch,
  };
}
