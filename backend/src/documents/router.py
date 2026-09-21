import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from sqlmodel import Session

from backend.src.core.config import settings
from backend.src.core.database import get_session
from backend.src.auth.session_service import SessionService
from backend.src.documents.schemas import (
    ImportDocumentRequest,
    ImportDocumentResponse,
    DocumentStatusResponse,
)
from backend.src.documents.service import DocumentService, DuplicateDocumentError
from backend.src.workers.worker import get_redis_pool

router = APIRouter(prefix="/api/documents", tags=["Documents"])


def get_current_user_session(request: Request, db: Session = Depends(get_session)):
    session_token = request.cookies.get(settings.SESSION_COOKIE_NAME) or request.cookies.get("telaah_session")
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session.",
        )

    session_service = SessionService(db=db)
    user_session = session_service.validate_session(session_token)
    if not user_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session.",
        )

    return user_session


@router.post(
    "/import",
    response_model=ImportDocumentResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Initiate document import and text extraction from Google Drive",
)
async def import_document(
    request_body: ImportDocumentRequest,
    db: Session = Depends(get_session),
    user_session = Depends(get_current_user_session),
):
    try:
        redis_pool = await get_redis_pool()
    except Exception:
        redis_pool = None

    service = DocumentService(db=db, redis_pool=redis_pool)

    try:
        doc = service.enqueue_import(
            drive_file_id=request_body.drive_file_id,
            file_name=request_body.file_name,
            file_type=request_body.file_type,
            researcher_id=user_session.researcher_id,
            file_size_bytes=request_body.file_size_bytes,
            drive_md5_checksum=request_body.drive_md5_checksum,
            force_reimport=request_body.force_reimport,
        )

        return ImportDocumentResponse(
            document_id=str(doc.id),
            status=doc.import_status,
            file_name=doc.file_name,
            message="Document import is being processed in background.",
        )
    except DuplicateDocumentError as e:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "detail": e.message,
                "document_id": e.existing_document_id,
                "current_import_status": e.current_status,
                "error_code": "DUPLICATE_DOCUMENT",
            },
        )


@router.get(
    "/{document_id}/status",
    response_model=DocumentStatusResponse,
    summary="Get status of document import and extraction",
)
def get_document_status(
    document_id: uuid.UUID,
    db: Session = Depends(get_session),
    user_session = Depends(get_current_user_session),
):
    service = DocumentService(db=db)
    status_response = service.get_status(
        document_id=document_id,
        researcher_id=user_session.researcher_id,
    )

    if not status_response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    return status_response


@router.post(
    "/{document_id}/retry",
    response_model=ImportDocumentResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Retry a failed document import",
)
async def retry_import(
    document_id: uuid.UUID,
    db: Session = Depends(get_session),
    user_session = Depends(get_current_user_session),
):
    try:
        redis_pool = await get_redis_pool()
    except Exception:
        redis_pool = None

    service = DocumentService(db=db, redis_pool=redis_pool)

    try:
        doc = service.retry_import(
            document_id=document_id,
            researcher_id=user_session.researcher_id,
        )
        return ImportDocumentResponse(
            document_id=str(doc.id),
            status=doc.import_status,
            file_name=doc.file_name,
            message="Document re-import is being processed in background.",
        )
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found.",
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_409_CONFLICT,
                content={
                    "detail": str(e),
                    "current_status": "not_failed",
                },
            )


@router.get(
    "",
    summary="List researcher's imported documents",
)
def list_documents(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_session),
    user_session = Depends(get_current_user_session),
):
    service = DocumentService(db=db)
    docs = service.repo.list_by_researcher(
        researcher_id=user_session.researcher_id,
        limit=limit,
        offset=offset,
    )
    return [
        {
            "id": str(d.id),
            "google_drive_id": d.google_drive_id,
            "file_name": d.file_name,
            "file_type": d.file_type.value if hasattr(d.file_type, "value") else str(d.file_type),
            "file_size_bytes": d.file_size_bytes,
            "import_status": d.import_status.value if hasattr(d.import_status, "value") else str(d.import_status),
            "failure_reason": d.failure_reason,
            "imported_at": d.imported_at.isoformat() if d.imported_at else None,
            "extracted_at": d.extracted_at.isoformat() if d.extracted_at else None,
        }
        for d in docs
    ]
