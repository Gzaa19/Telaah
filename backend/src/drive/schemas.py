from typing import Optional, List, Dict, Literal
from pydantic import BaseModel, Field


class DriveFileItem(BaseModel):
    id: str
    name: str
    mime_type: str
    file_type: Optional[Literal["pdf", "docx"]] = None
    size_bytes: Optional[int] = None
    modified_at: Optional[str] = None
    is_folder: bool = False
    can_import: bool = False


class DriveFileListResponse(BaseModel):
    files: List[DriveFileItem] = []
    next_page_token: Optional[str] = None
    folder_path: List[Dict[str, str]] = []


class DriveFileMetadataResponse(BaseModel):
    id: str
    name: str
    mime_type: str
    file_type: Optional[str] = None
    size_bytes: Optional[int] = None
    modified_at: Optional[str] = None
    md5_checksum: Optional[str] = None
