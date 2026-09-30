import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, status
from sqlmodel import Session

from backend.src.core.config import settings
from backend.src.core.database import get_session
from backend.src.auth.models import UserSession
from backend.src.auth.session_service import SessionService
from backend.src.outlines.models import GenerationStatusEnum
from backend.src.outlines.schemas import (
    GenerateOutlineRequest,
    GenerateOutlineResponse,
    OutlineStatusResponse,
    OutlineDetailResponse,
)
from backend.src.outlines.service import OutlineService
from backend.src.outlines.worker import run_outline_generation_pipeline

router = APIRouter(prefix="/api/outlines", tags=["Paper Outlines"])


def get_current_user_session(request: Request, db: Session = Depends(get_session)) -> UserSession:
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


def run_outline_generation_background(outline_id: uuid.UUID) -> None:
    """Invoked via FastAPI BackgroundTasks to run the async pipeline."""
    run_outline_generation_pipeline(outline_id=outline_id)


@router.post(
    "/generate",
    response_model=GenerateOutlineResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def generate_outline(
    request: GenerateOutlineRequest,
    background_tasks: BackgroundTasks,
    current_session: UserSession = Depends(get_current_user_session),
    db: Session = Depends(get_session),
):
    service = OutlineService(db=db)
    outline_id = service.generate_outline(
        researcher_id=current_session.researcher_id,
        document_id=request.document_id,
        template_id=request.template_id,
        language=request.language,
    )
    background_tasks.add_task(run_outline_generation_background, outline_id)
    return GenerateOutlineResponse(
        outline_id=outline_id,
        status=GenerationStatusEnum.preparing,
    )


@router.get(
    "/{outline_id}/status",
    response_model=OutlineStatusResponse,
    status_code=status.HTTP_200_OK,
)
def get_outline_status(
    outline_id: uuid.UUID,
    current_session: UserSession = Depends(get_current_user_session),
    db: Session = Depends(get_session),
):
    service = OutlineService(db=db)
    return service.get_outline_status(
        outline_id=outline_id,
        researcher_id=current_session.researcher_id,
    )


@router.get(
    "/{outline_id}",
    response_model=OutlineDetailResponse,
    status_code=status.HTTP_200_OK,
)
def get_outline_detail(
    outline_id: uuid.UUID,
    current_session: UserSession = Depends(get_current_user_session),
    db: Session = Depends(get_session),
):
    service = OutlineService(db=db)
    return service.get_outline_detail(
        outline_id=outline_id,
        researcher_id=current_session.researcher_id,
    )
