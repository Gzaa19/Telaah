export interface DriveFile {
  id: string;
  name: string;
  mime_type: string;
  file_type: 'pdf' | 'docx' | null;
  size_bytes: number | null;
  modified_at: string;
  is_folder: boolean;
  can_import: boolean;
}

export interface DriveFileListResponse {
  files: DriveFile[];
  next_page_token: string | null;
  folder_path: { id: string; name: string }[];
}
