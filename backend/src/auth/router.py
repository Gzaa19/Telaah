from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Cookie, Response, status
from fastapi.responses import RedirectResponse, JSONResponse
from sqlmodel import Session

from backend.src.core.config import settings
from backend.src.core.database import get_session
from backend.src.auth.oauth_service import GoogleOAuthService
from backend.src.auth.session_service import SessionService
from backend.src.auth.researcher_service import ResearcherService
from backend.src.auth.schemas import (
    ResearcherProfileResponse,
    ErrorResponse,
    MessageResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/google/login", summary="Initiate Google OAuth Authorization Flow")
def google_login(prompt: str = "consent"):
    oauth_service = GoogleOAuthService()
    auth_url, state = oauth_service.generate_authorization_url(prompt=prompt)

    response = RedirectResponse(url=auth_url, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=600,
        path="/",
    )
    return response


@router.get(
    "/google/callback",
    summary="Handle Google OAuth Callback",
    responses={
        302: {"description": "Redirect to frontend dashboard with session cookie"},
        400: {"model": ErrorResponse, "description": "Invalid state or missing code"},
        401: {"model": ErrorResponse, "description": "Token exchange failed"},
    },
)
@router.get(
    "/callback/google",
    summary="Handle Google OAuth Callback (Console Alias)",
    include_in_schema=True,
    responses={
        302: {"description": "Redirect to frontend dashboard with session cookie"},
        400: {"model": ErrorResponse, "description": "Invalid state or missing code"},
        401: {"model": ErrorResponse, "description": "Token exchange failed"},
    },
)
def google_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    oauth_state: Optional[str] = Cookie(None),
    db: Session = Depends(get_session),
):
    if not state or not oauth_state or state != oauth_state:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "INVALID_STATE", "message": "Invalid or missing state parameter"},
        )

    if not code:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "MISSING_CODE", "message": "Missing authorization code"},
        )

    oauth_service = GoogleOAuthService()
    try:
        token_dto = oauth_service.exchange_code(code)
        profile_dto = oauth_service.fetch_user_profile(token_dto.access_token)
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "OAUTH_EXCHANGE_FAILED", "message": str(e)},
        )

    researcher_service = ResearcherService(db=db)
    researcher, credential = researcher_service.upsert_researcher_with_credentials(
        profile=profile_dto,
        tokens=token_dto,
    )

    session_service = SessionService(db=db)
    user_session = session_service.create_24h_session(researcher_id=researcher.id)

    target_url = f"{settings.FRONTEND_URL}/dashboard"
    response = RedirectResponse(url=target_url, status_code=status.HTTP_302_FOUND)

    # Set 24h session cookie
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=user_session.token_sesi,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=settings.SESSION_EXPIRE_HOURS * 3600,
        path="/",
    )
    # Clear state cookie
    response.delete_cookie(key="oauth_state", path="/")
    return response


@router.get(
    "/me",
    summary="Get Current Researcher Session & Profile",
    response_model=ResearcherProfileResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized or expired session"}
    },
)
def get_me(
    paper_gen_session: Optional[str] = Cookie(None),
    db: Session = Depends(get_session),
):
    if not paper_gen_session:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "UNAUTHORIZED", "message": "Session expired or invalid"},
        )

    session_service = SessionService(db=db)
    active_session = session_service.validate_session(paper_gen_session)
    if not active_session:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "UNAUTHORIZED", "message": "Session expired or invalid"},
        )

    researcher_service = ResearcherService(db=db)
    profile_response = researcher_service.get_researcher_profile_response(
        researcher_id=active_session.peneliti_id,
        session_expires_at=active_session.kedaluwarsa_pada,
    )

    if not profile_response:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "UNAUTHORIZED", "message": "Account inactive or not found"},
        )

    return profile_response


@router.post(
    "/logout",
    summary="Logout & Invalidate Session",
    response_model=MessageResponse,
)
def logout(
    paper_gen_session: Optional[str] = Cookie(None),
    db: Session = Depends(get_session),
):
    if paper_gen_session:
        session_service = SessionService(db=db)
        session_service.invalidate_session(paper_gen_session)

    response = JSONResponse(content={"message": "Logout successful"})
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
    )
    return response
