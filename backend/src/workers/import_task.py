import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from backend.src.core.database import get_session
from backend.src.documents.models import ImportStatus
from backend.src.documents.repository import DocumentRepository
from backend.src.documents.extractor import (
    TextExtractor,
    ScannedPDFError,
    EncryptedPDFError,
    UnsupportedFileTypeError,
)
from backend.src.drive.token_service import DriveTokenService, DriveTokenRevokedError
from backend.src.drive.drive_service import DriveService

logger = logging.getLogger(__name__)


async def import_document_task(ctx: dict, document_id: str, researcher_id: str):
    doc_uuid = uuid.UUID(document_id)
    researcher_uuid = uuid.UUID(researcher_id)

    with next(get_session()) as db:
        repo = DocumentRepository(db)
        doc = repo.get_by_id(doc_uuid)
        if not doc:
            logger.error(f"Document {document_id} not found for import task.")
            return

        token_service = DriveTokenService(db)
        drive_service = DriveService()
        extractor = TextExtractor()

        try:
            # 1. Validate / obtain Drive token
            access_token = token_service.get_valid_access_token(researcher_uuid)

            # 2. Update status: importing
            repo.update_status(doc.id, ImportStatus.importing)

            # 3. Stream download from Drive
            temp_file = drive_service.download_file(access_token, doc.google_drive_id)

            # 4. Update status: extracting
            repo.update_status(doc.id, ImportStatus.extracting)

            # 5. Extract text
            extraction_result = extractor.extract_text(temp_file, doc.file_type)

            # 6. Save extracted text and pages
            repo.save_extracted_text(
                document_id=doc.id,
                full_text=extraction_result.full_text,
                total_pages=extraction_result.total_pages,
                pages_data=extraction_result.pages,
            )

            # 7. Update status: extracted
            repo.update_status(
                document_id=doc.id,
                status=ImportStatus.extracted,
                extracted_at=datetime.now(timezone.utc),
            )
            logger.info(f"Successfully imported and extracted document {doc.id} ({doc.file_name})")

            # 8. Trigger UC-03 indexing job
            redis_pool = ctx.get("redis")
            if redis_pool:
                await redis_pool.enqueue_job("index_document_task", str(doc.id))
            else:
                # ponytail: in local mode without Redis, auto-trigger local pgvector indexing pipeline in-process
                try:
                    from backend.src.indexing.service import DocumentIndexingService
                    from backend.src.indexing.worker import run_indexing_pipeline
                    indexing_service = DocumentIndexingService(db=db)
                    job, _ = indexing_service.create_and_enqueue_job(doc_id=doc.id, researcher_id=researcher_uuid)
                    run_indexing_pipeline(job.id)
                except Exception as ex:
                    logger.info(f"Local indexing trigger handled: {ex}")

        except ScannedPDFError as e:
            logger.warning(f"Document {doc.id} failed: Scanned PDF")
            repo.update_status(
                doc.id,
                ImportStatus.failed,
                failure_reason="PDF does not contain extractable text (likely a scanned image).",
            )
        except EncryptedPDFError as e:
            logger.warning(f"Document {doc.id} failed: Password-protected PDF")
            repo.update_status(
                doc.id,
                ImportStatus.failed,
                failure_reason="PDF is password-protected.",
            )
        except DriveTokenRevokedError as e:
            logger.warning(f"Document {doc.id} failed: Drive token revoked")
            repo.update_status(
                doc.id,
                ImportStatus.failed,
                failure_reason="Google Drive access has been revoked. Please reconnect your Drive account.",
            )
        except Exception as e:
            logger.exception(f"Document {doc.id} failed with unexpected error: {e}")
            repo.update_status(
                doc.id,
                ImportStatus.failed,
                failure_reason=f"Import failed: {str(e)}",
            )
        finally:
            if 'temp_file' in locals() and temp_file:
                try:
                    temp_file.close()
                except Exception:
                    pass
