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
    UpdateFieldRequest,
    SectionFieldResponse,
    RegenerateOutlineRequest,
    RegenerateOutlineResponse,
    RegenerateSectionResponse,
    ApproveResponse,
    VersionListResponse,
    OutlineVersionItem,
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
    "/templates/{template_id}/diagnostics",
    status_code=status.HTTP_200_OK,
)
def get_template_diagnostics(
    template_id: str = "icicos",
    current_session: UserSession = Depends(get_current_user_session),
    db: Session = Depends(get_session),
):
    service = OutlineService(db=db)
    try:
        return service.template_parser.get_template_diagnostics(template_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
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


@router.patch(
    "/{outline_id}/fields/{field_id}",
    response_model=SectionFieldResponse,
    status_code=status.HTTP_200_OK,
)
def update_section_field(
    outline_id: uuid.UUID,
    field_id: uuid.UUID,
    request: UpdateFieldRequest,
    current_session: UserSession = Depends(get_current_user_session),
    db: Session = Depends(get_session),
):
    service = OutlineService(db=db)
    updated = service.update_field_content(
        outline_id=outline_id,
        field_id=field_id,
        content=request.content,
        researcher_id=current_session.researcher_id,
    )
    return SectionFieldResponse(
        field_id=updated.id,
        content=updated.content,
        is_edited=updated.is_edited,
        is_needs_input=updated.is_needs_input,
    )


@router.post(
    "/{outline_id}/regenerate",
    response_model=RegenerateOutlineResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def regenerate_outline(
    outline_id: uuid.UUID,
    request: RegenerateOutlineRequest,
    background_tasks: BackgroundTasks,
    current_session: UserSession = Depends(get_current_user_session),
    db: Session = Depends(get_session),
):
    service = OutlineService(db=db)
    new_outline_id = service.fork_outline_version(
        outline_id=outline_id,
        reset_all_sections=request.reset_all_sections,
    )
    background_tasks.add_task(run_outline_generation_background, new_outline_id)
    new_outline = service.repository.get_outline_by_id(new_outline_id, load_relations=False)
    return RegenerateOutlineResponse(
        outline_id=new_outline_id,
        version_number=new_outline.version_number if new_outline else 2,
    )


@router.post(
    "/{outline_id}/sections/{section_id}/regenerate",
    response_model=RegenerateSectionResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def regenerate_section(
    outline_id: uuid.UUID,
    section_id: uuid.UUID,
    current_session: UserSession = Depends(get_current_user_session),
    db: Session = Depends(get_session),
):
    service = OutlineService(db=db)
    service.regenerate_section(
        outline_id=outline_id,
        section_id=section_id,
        researcher_id=current_session.researcher_id,
    )
    return RegenerateSectionResponse(
        section_id=section_id,
        status="generating",
    )


@router.post(
    "/{outline_id}/approve",
    response_model=ApproveResponse,
    status_code=status.HTTP_200_OK,
)
def approve_outline(
    outline_id: uuid.UUID,
    current_session: UserSession = Depends(get_current_user_session),
    db: Session = Depends(get_session),
):
    service = OutlineService(db=db)
    approved = service.approve_outline(
        outline_id=outline_id,
        researcher_id=current_session.researcher_id,
    )
    needs_input_count = service.check_needs_input(outline_id=outline_id)
    return ApproveResponse(
        outline_id=approved.id,
        approval_status=approved.approval_status,
        approved_at=approved.approved_at,
        unresolved_needs_input_count=needs_input_count,
    )


@router.get(
    "/{outline_id}/versions",
    response_model=VersionListResponse,
    status_code=status.HTTP_200_OK,
)
def get_outline_versions_by_outline(
    outline_id: uuid.UUID,
    current_session: UserSession = Depends(get_current_user_session),
    db: Session = Depends(get_session),
):
    service = OutlineService(db=db)
    outline = service.repository.get_outline_by_id(outline_id, researcher_id=current_session.researcher_id, load_relations=False)
    if not outline:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outline not found.")
    
    versions = service.repository.list_outline_versions(
        document_id=outline.document_id,
        researcher_id=current_session.researcher_id,
    )
    items = [
        OutlineVersionItem(
            outline_id=v.id,
            version_number=v.version_number,
            approval_status=v.approval_status,
            generation_status=v.generation_status,
            created_at=v.created_at,
            approved_at=v.approved_at,
            trigger="regeneration" if v.version_number > 1 else "initial",
        )
        for v in versions
    ]
    return VersionListResponse(versions=items)


@router.get(
    "/document/{document_id}/versions",
    response_model=VersionListResponse,
    status_code=status.HTTP_200_OK,
)
def get_outline_versions_by_document(
    document_id: uuid.UUID,
    current_session: UserSession = Depends(get_current_user_session),
    db: Session = Depends(get_session),
):
    service = OutlineService(db=db)
    versions = service.repository.list_outline_versions(
        document_id=document_id,
        researcher_id=current_session.researcher_id,
    )
    items = [
        OutlineVersionItem(
            outline_id=v.id,
            version_number=v.version_number,
            approval_status=v.approval_status,
            generation_status=v.generation_status,
            created_at=v.created_at,
            approved_at=v.approved_at,
            trigger="regeneration" if v.version_number > 1 else "initial",
        )
        for v in versions
    ]
    return VersionListResponse(versions=items)
