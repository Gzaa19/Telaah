import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlmodel import Session

from backend.src.core.config import settings
from backend.src.auth.models import UserSession
from backend.src.auth.repository import AuthRepository


class SessionService:
    def __init__(self, db: Session, repository: Optional[AuthRepository] = None):
        self.db = db
        self.repo = repository or AuthRepository(db=db)

    def create_24h_session(self, researcher_id: uuid.UUID) -> UserSession:
        session_token = secrets.token_urlsafe(48)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_EXPIRE_HOURS)
        return self.repo.create_session(
            researcher_id=researcher_id,
            session_token=session_token,
            expires_at=expires_at,
        )

    def validate_session(self, session_token: str) -> Optional[UserSession]:
        if not session_token:
            return None
        return self.repo.get_active_session_by_token(session_token=session_token)

    def invalidate_session(self, session_token: str) -> bool:
        if not session_token:
            return False
        return self.repo.deactivate_session(session_token=session_token)
