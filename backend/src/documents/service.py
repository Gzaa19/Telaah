import uuid
import asyncio
from datetime import datetime, timezone
from typing import Optional, Union
from sqlmodel import Session
from arq.connections import ArqRedis

from backend.src.documents.models import Document, ImportStatus, FileType
from backend.src.documents.repository import DocumentRepository
from backend.src.documents.schemas import DocumentStatusResponse


class DuplicateDocumentError(Exception):
    def __init__(self, existing_document_id: str, current_status: str, message: str = "This document has already been imported."):
        super().__init__(message)
        self.existing_document_id = existing_document_id
        self.current_status = current_status
        self.message = message


class DocumentService:
    def __init__(self, db: Session, redis_pool: Optional[ArqRedis] = None):
        self.db = db
        self.repo = DocumentRepository(db)
        self.redis_pool = redis_pool

    def check_duplicate(self, drive_file_id: str, researcher_id: uuid.UUID) -> Optional[Document]:
        return self.repo.get_by_drive_id(drive_file_id, researcher_id)

    def enqueue_import(
        self,
        drive_file_id: str,
        file_name: str,
        file_type: Union[str, FileType],
        researcher_id: uuid.UUID,
        file_size_bytes: Optional[int] = None,
        drive_md5_checksum: Optional[str] = None,
        force_reimport: bool = False,
    ) -> Document:
        if isinstance(file_type, str):
            typed_file_type = FileType(file_type)
        else:
            typed_file_type = file_type

        existing = self.check_duplicate(drive_file_id, researcher_id)
        if existing and not force_reimport:
            raise DuplicateDocumentError(
                existing_document_id=str(existing.id),
                current_status=existing.import_status.value,
            )

        if existing and force_reimport:
            existing.file_name = file_name
            existing.file_type = typed_file_type
            existing.file_size_bytes = file_size_bytes
            existing.drive_md5_checksum = drive_md5_checksum
            existing.import_status = ImportStatus.importing
            existing.failure_reason = None
            existing.extracted_at = None
            existing.updated_at = datetime.now(timezone.utc)
            self.db.add(existing)
            self.db.commit()
            self.db.refresh(existing)
            target_doc = existing
        else:
            new_doc = Document(
                google_drive_id=drive_file_id,
                file_name=file_name,
                file_type=typed_file_type,
                file_size_bytes=file_size_bytes,
                drive_md5_checksum=drive_md5_checksum,
                import_status=ImportStatus.importing,
                researcher_id=researcher_id,
            )
            target_doc = self.repo.create(new_doc)

        # Enqueue background extraction job
        if self.redis_pool:
            self._dispatch_job("import_document_task", str(target_doc.id), str(researcher_id))

        return target_doc

    def retry_import(self, document_id: uuid.UUID, researcher_id: uuid.UUID) -> Document:
        doc = self.repo.get_by_id(document_id, researcher_id)
        if not doc:
            raise ValueError("Document not found.")

        if doc.import_status != ImportStatus.failed:
            raise ValueError("Retry can only be triggered for documents with 'failed' status.")

        updated_doc = self.repo.update_status(
            document_id=doc.id,
            status=ImportStatus.importing,
            failure_reason=None,
        )

        if self.redis_pool:
            self._dispatch_job("import_document_task", str(doc.id), str(researcher_id))

        return updated_doc or doc

    def get_status(
        self,
        document_id: uuid.UUID,
        researcher_id: Optional[uuid.UUID] = None,
    ) -> Optional[DocumentStatusResponse]:
        doc = self.repo.get_by_id(document_id, researcher_id)
        if not doc:
            return None

        imported_at_iso = (
            doc.imported_at.isoformat()
            if doc.imported_at
            else datetime.now(timezone.utc).isoformat()
        )
        extracted_at_iso = doc.extracted_at.isoformat() if doc.extracted_at else None

        # UC-03 status placeholder (queued once extracted)
        indexing_status = "queued" if doc.import_status == ImportStatus.extracted else None

        return DocumentStatusResponse(
            document_id=str(doc.id),
            file_name=doc.file_name,
            import_status=doc.import_status,
            failure_reason=doc.failure_reason,
            imported_at=imported_at_iso,
            extracted_at=extracted_at_iso,
            indexing_status=indexing_status,
        )

    def _dispatch_job(self, task_name: str, *args):
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(self.redis_pool.enqueue_job(task_name, *args))
            else:
                loop.run_until_complete(self.redis_pool.enqueue_job(task_name, *args))
        except RuntimeError:
            asyncio.run(self.redis_pool.enqueue_job(task_name, *args))
