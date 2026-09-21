import uuid
from typing import Optional, Literal
from pydantic import BaseModel
from backend.src.documents.models import ImportStatus, FileType


class ImportDocumentRequest(BaseModel):
    drive_file_id: str
    file_name: str
    file_type: FileType
    file_size_bytes: Optional[int] = None
    drive_md5_checksum: Optional[str] = None
    force_reimport: bool = False


class ImportDocumentResponse(BaseModel):
    document_id: str
    status: ImportStatus
    file_name: str
    message: str


class DocumentStatusResponse(BaseModel):
    document_id: str
    file_name: str
    import_status: ImportStatus
    failure_reason: Optional[str] = None
    imported_at: str
    extracted_at: Optional[str] = None
    indexing_status: Optional[str] = None
