from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from sqlmodel import Session

from backend.src.core.config import settings
from backend.src.core.database import get_session
from backend.src.auth.session_service import SessionService
from backend.src.drive.schemas import DriveFileListResponse, DriveFileMetadataResponse
from backend.src.drive.token_service import DriveTokenService, DriveTokenRevokedError
from backend.src.drive.drive_service import DriveService

router = APIRouter(prefix="/api/drive", tags=["Google Drive"])


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


@router.get(
    "/files",
    response_model=DriveFileListResponse,
    summary="Browse and search Google Drive files",
)
def list_drive_files(
    folder_id: str = "root",
    q: str = "",
    page_token: Optional[str] = None,
    page_size: int = 50,
    db: Session = Depends(get_session),
    user_session = Depends(get_current_user_session),
):
    token_service = DriveTokenService(db=db)
    try:
        access_token = token_service.get_valid_access_token(user_session.researcher_id)
    except DriveTokenRevokedError as e:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "detail": "Google Drive access has been revoked. Please reconnect your Drive account.",
                "error_code": "DRIVE_TOKEN_REVOKED",
            },
        )

    drive_service = DriveService()
    try:
        result = drive_service.list_files(
            access_token=access_token,
            folder_id=folder_id,
            query=q,
            page_token=page_token,
            page_size=page_size,
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list Drive files: {str(e)}",
        )


@router.get(
    "/files/{file_id}",
    response_model=DriveFileMetadataResponse,
    summary="Get Google Drive file metadata",
)
def get_drive_file_metadata(
    file_id: str,
    db: Session = Depends(get_session),
    user_session = Depends(get_current_user_session),
):
    token_service = DriveTokenService(db=db)
    try:
        access_token = token_service.get_valid_access_token(user_session.researcher_id)
    except DriveTokenRevokedError:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "detail": "Google Drive access has been revoked. Please reconnect your Drive account.",
                "error_code": "DRIVE_TOKEN_REVOKED",
            },
        )

    drive_service = DriveService()
    try:
        return drive_service.get_file_metadata(access_token=access_token, file_id=file_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found on Google Drive: {str(e)}",
        )
