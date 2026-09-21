import { DriveFileListResponse, DriveFile } from "@/types/drive";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class DriveApiError extends Error {
  errorCode?: string;
  statusCode: number;

  constructor(message: string, statusCode: number, errorCode?: string) {
    super(message);
    this.name = "DriveApiError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export interface FetchDriveFilesParams {
  folder_id?: string;
  q?: string;
  page_token?: string;
  page_size?: number;
}

export async function fetchDriveFiles(params: FetchDriveFilesParams = {}): Promise<DriveFileListResponse> {
  const query = new URLSearchParams();
  if (params.folder_id) query.append("folder_id", params.folder_id);
  if (params.q) query.append("q", params.q);
  if (params.page_token) query.append("page_token", params.page_token);
  if (params.page_size) query.append("page_size", params.page_size.toString());

  const res = await fetch(`${BACKEND_URL}/api/drive/files?${query.toString()}`, {
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
      // Ignored if response is not JSON
    }
    const message = errorData.detail || errorData.message || res.statusText || "Failed to fetch Drive files";
    throw new DriveApiError(message, res.status, errorData.error_code);
  }

  return await res.json();
}
