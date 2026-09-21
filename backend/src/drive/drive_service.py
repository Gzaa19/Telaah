import tempfile
from typing import Optional, List, Dict
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

from backend.src.drive.schemas import (
    DriveFileListResponse,
    DriveFileItem,
    DriveFileMetadataResponse,
)


class DriveService:
    def _build_drive_client(self, access_token: str):
        creds = Credentials(token=access_token)
        return build("drive", "v3", credentials=creds, cache_discovery=False)

    def list_files(
        self,
        access_token: str,
        folder_id: str = "root",
        query: str = "",
        page_token: Optional[str] = None,
        page_size: int = 50,
    ) -> DriveFileListResponse:
        service = self._build_drive_client(access_token)

        # Build query
        q_parts = ["trashed = false"]
        if query and query.strip():
            clean_query = query.strip().replace("'", "\\'")
            q_parts.append(f"name contains '{clean_query}'")
            if folder_id and folder_id != "root":
                q_parts.append(f"'{folder_id}' in parents")
        else:
            effective_folder = folder_id or "root"
            q_parts.append(f"'{effective_folder}' in parents")

        q_str = " and ".join(q_parts)

        effective_page_size = max(1, min(page_size, 100))
        fields = "nextPageToken, files(id, name, mimeType, size, modifiedTime, md5Checksum)"

        result = (
            service.files()
            .list(
                q=q_str,
                pageSize=effective_page_size,
                pageToken=page_token,
                fields=fields,
                orderBy="folder, name",
            )
            .execute()
        )

        raw_files = result.get("files", [])
        next_page_token = result.get("nextPageToken")

        file_items: List[DriveFileItem] = []
        for f in raw_files:
            mime = f.get("mimeType", "")
            name = f.get("name", "")
            is_folder = mime == "application/vnd.google-apps.folder"

            file_type = None
            if not is_folder:
                if mime == "application/pdf" or name.lower().endswith(".pdf"):
                    file_type = "pdf"
                elif (
                    mime in [
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        "application/msword",
                    ]
                    or name.lower().endswith(".docx")
                ):
                    file_type = "docx"

            can_import = file_type in ["pdf", "docx"] and not is_folder
            size = int(f["size"]) if "size" in f and f["size"] is not None else None

            file_items.append(
                DriveFileItem(
                    id=f["id"],
                    name=name,
                    mime_type=mime,
                    file_type=file_type,
                    size_bytes=size,
                    modified_at=f.get("modifiedTime"),
                    is_folder=is_folder,
                    can_import=can_import,
                )
            )

        # Construct breadcrumbs
        folder_path = self._get_folder_path(service, folder_id)

        return DriveFileListResponse(
            files=file_items,
            next_page_token=next_page_token,
            folder_path=folder_path,
        )

    def _get_folder_path(self, service, folder_id: str) -> List[Dict[str, str]]:
        if not folder_id or folder_id == "root":
            return [{"id": "root", "name": "My Drive"}]

        path = []
        current_id = folder_id
        # Traverse up to 5 levels to avoid infinite loop
        visited = set()
        while current_id and current_id not in visited and len(path) < 5:
            visited.add(current_id)
            if current_id == "root":
                path.append({"id": "root", "name": "My Drive"})
                break
            try:
                folder_meta = (
                    service.files()
                    .get(fileId=current_id, fields="id, name, parents")
                    .execute()
                )
                path.append({"id": folder_meta["id"], "name": folder_meta["name"]})
                parents = folder_meta.get("parents")
                if parents:
                    current_id = parents[0]
                else:
                    break
            except Exception:
                break

        if not any(p["id"] == "root" for p in path):
            path.append({"id": "root", "name": "My Drive"})

        path.reverse()
        return path

    def get_file_metadata(self, access_token: str, file_id: str) -> DriveFileMetadataResponse:
        service = self._build_drive_client(access_token)
        f = (
            service.files()
            .get(
                fileId=file_id,
                fields="id, name, mimeType, size, modifiedTime, md5Checksum",
            )
            .execute()
        )
        mime = f.get("mimeType", "")
        name = f.get("name", "")
        file_type = None
        if mime == "application/pdf" or name.lower().endswith(".pdf"):
            file_type = "pdf"
        elif (
            mime in [
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/msword",
            ]
            or name.lower().endswith(".docx")
        ):
            file_type = "docx"

        size = int(f["size"]) if "size" in f and f["size"] is not None else None
        return DriveFileMetadataResponse(
            id=f["id"],
            name=name,
            mime_type=mime,
            file_type=file_type,
            size_bytes=size,
            modified_at=f.get("modifiedTime"),
            md5_checksum=f.get("md5Checksum"),
        )

    def download_file(self, access_token: str, file_id: str) -> tempfile.SpooledTemporaryFile:
        service = self._build_drive_client(access_token)
        request = service.files().get_media(fileId=file_id)
        temp_file = tempfile.SpooledTemporaryFile(max_size=50 * 1024 * 1024)
        downloader = MediaIoBaseDownload(temp_file, request, chunksize=1024 * 1024 * 2)

        done = False
        while not done:
            status, done = downloader.next_chunk()

        temp_file.seek(0)
        return temp_file
