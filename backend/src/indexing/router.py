import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, Response, BackgroundTasks, status, Query
from fastapi.responses import JSONResponse
from sqlmodel import Session

from backend.src.core.config import settings
from backend.src.core.database import get_session
from backend.src.auth.session_service import SessionService
from backend.src.indexing.schemas import (
    JobResponseDTO,
    JobStatusDTO,
    IndexStatusDTO,
    IndexSummaryDTO,
    ReindexResponseDTO,
    SearchResultDTO,
    SearchResultItemDTO,
    IndexingErrorResponse,
)
from backend.src.indexing.service import (
    DocumentIndexingService,
    DocumentNotFoundError,
    InvalidDocumentStatusError,
    DuplicateFingerprintError,
)
from backend.src.indexing.worker import run_indexing_pipeline

router = APIRouter(tags=["Document Indexing & Search"])


def get_current_user_session(request: Request, db: Session = Depends(get_session)):
    session_token = (
        request.cookies.get(settings.SESSION_COOKIE_NAME)
        or request.cookies.get("telaah_session")
    )
    if not session_token and request.headers.get("Authorization"):
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ", 1)[1]

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
    "/api/indexing/documents/{document_id}",
    response_model=JobResponseDTO,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger document indexing and local embedding",
    responses={
        202: {"model": JobResponseDTO, "description": "Indexing job enqueued"},
        404: {"model": IndexingErrorResponse, "description": "Document not found"},
        409: {"model": IndexingErrorResponse, "description": "Duplicate fingerprint"},
        422: {"model": IndexingErrorResponse, "description": "Invalid document status"},
    },
)
async def trigger_indexing(
    document_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_session),
    user_session=Depends(get_current_user_session),
):
    service = DocumentIndexingService(db=db)
    try:
        job, version = service.create_and_enqueue_job(
            doc_id=document_id,
            researcher_id=user_session.researcher_id,
        )
    except DocumentNotFoundError as e:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "document_not_found", "message": str(e)},
        )
    except InvalidDocumentStatusError as e:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"error": "invalid_document_status", "message": str(e)},
        )
    except DuplicateFingerprintError as e:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": "duplicate_fingerprint",
                "message": "Index version with identical configuration already exists.",
                "existing_index_version_id": str(e.existing_version.id),
            },
        )

    # Dispatch background worker
    background_tasks.add_task(run_indexing_pipeline, job.id)

    return JobResponseDTO(
        job_id=job.id,
        index_version_id=version.id,
        document_id=document_id,
        status="queued",
        message="Indexing job enqueued successfully.",
    )


@router.get(
    "/api/indexing/jobs/{job_id}",
    response_model=JobStatusDTO,
    summary="Get status of indexing job",
)
def get_job_status(
    job_id: uuid.UUID,
    db: Session = Depends(get_session),
    user_session=Depends(get_current_user_session),
):
    service = DocumentIndexingService(db=db)
    job = service.get_job_status(job_id=job_id, researcher_id=user_session.researcher_id)
    if not job:
        return JSONResponse(
            status_code=404,
            content={"error": "job_not_found", "message": "Indexing job not found"},
        )

    return JobStatusDTO(
        job_id=job.id,
        document_id=job.document_id,
        index_version_id=job.index_version_id,
        status=job.status,
        current_stage=job.current_stage,
        retry_count=job.retry_count,
        failure_reason=job.failure_reason,
        enqueued_at=job.enqueued_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
        heartbeat_at=job.heartbeat_at,
    )


@router.get(
    "/api/documents/{document_id}/index-status",
    response_model=IndexStatusDTO,
    summary="Get document indexing status and stage",
)
def get_index_status(
    document_id: uuid.UUID,
    db: Session = Depends(get_session),
    user_session=Depends(get_current_user_session),
):
    service = DocumentIndexingService(db=db)
    summary = service.get_index_status(doc_id=document_id, researcher_id=user_session.researcher_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Document not found or access denied")

    return IndexStatusDTO(**summary)


@router.get(
    "/api/documents/{document_id}/index-summary",
    response_model=IndexSummaryDTO,
    summary="Get document active index summary",
)
def get_index_summary(
    document_id: uuid.UUID,
    db: Session = Depends(get_session),
    user_session=Depends(get_current_user_session),
):
    service = DocumentIndexingService(db=db)
    summary = service.get_index_summary(doc_id=document_id, researcher_id=user_session.researcher_id)
    if not summary:
        return JSONResponse(
            status_code=404,
            content={"error": "not_found", "message": "No index summary found for document"},
        )

    return IndexSummaryDTO(**summary)


@router.post(
    "/api/documents/{document_id}/reindex",
    response_model=ReindexResponseDTO,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Archive previous index and re-index document",
)
async def request_reindex(
    document_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_session),
    user_session=Depends(get_current_user_session),
):
    service = DocumentIndexingService(db=db)
    try:
        job, version, archived_id = service.request_reindex(
            doc_id=document_id,
            researcher_id=user_session.researcher_id,
        )
    except DocumentNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InvalidDocumentStatusError as e:
        raise HTTPException(status_code=422, detail=str(e))

    background_tasks.add_task(run_indexing_pipeline, job.id)

    return ReindexResponseDTO(
        job_id=job.id,
        new_index_version_id=version.id,
        archived_index_version_id=archived_id,
        document_id=document_id,
        status="queued",
        message="Re-indexing pipeline initiated.",
    )


@router.get(
    "/api/search/similarity",
    response_model=SearchResultDTO,
    summary="Internal similarity search verification using local embeddings",
)
def similarity_search_verify(
    q: str = Query(..., description="Query text to search for"),
    document_id: Optional[uuid.UUID] = Query(None, description="Optional document filter"),
    top_k: int = Query(5, ge=1, le=50, description="Max results"),
    db: Session = Depends(get_session),
    user_session=Depends(get_current_user_session),
):
    service = DocumentIndexingService(db=db)
    items = service.similarity_search(
        query=q,
        researcher_id=user_session.researcher_id,
        doc_id=document_id,
        top_k=top_k,
    )
    results = [SearchResultItemDTO(**item) for item in items]
    return SearchResultDTO(
        query=q,
        total_results=len(results),
        results=results,
    )
