import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Session, select
from backend.src.auth.models import ResearcherAccount, UserSession, OAuthCredential


class AuthRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_researcher_by_id(self, researcher_id: uuid.UUID) -> Optional[ResearcherAccount]:
        statement = select(ResearcherAccount).where(ResearcherAccount.id == researcher_id)
        return self.db.exec(statement).first()

    def get_researcher_by_email(self, email: str) -> Optional[ResearcherAccount]:
        statement = select(ResearcherAccount).where(ResearcherAccount.email == email)
        return self.db.exec(statement).first()

    def upsert_researcher(
        self,
        email: str,
        full_name: str,
        avatar_url: Optional[str] = None
    ) -> ResearcherAccount:
        researcher = self.get_researcher_by_email(email)
        now = datetime.now(timezone.utc)
        if researcher:
            researcher.full_name = full_name
            researcher.avatar_url = avatar_url
            researcher.last_login_at = now
            researcher.updated_at = now
        else:
            researcher = ResearcherAccount(
                email=email,
                full_name=full_name,
                avatar_url=avatar_url,
                last_login_at=now,
                created_at=now,
                updated_at=now,
            )
            self.db.add(researcher)
        self.db.commit()
        self.db.refresh(researcher)
        return researcher

    def save_oauth_credentials(
        self,
        researcher_id: uuid.UUID,
        enc_access_token: str,
        token_expires_at: datetime,
        is_drive_granted: bool,
        enc_refresh_token: Optional[str] = None,
        provider: str = "google"
    ) -> OAuthCredential:
        statement = select(OAuthCredential).where(OAuthCredential.researcher_id == researcher_id)
        credential = self.db.exec(statement).first()
        now = datetime.now(timezone.utc)
        if credential:
            credential.encrypted_access_token = enc_access_token
            if enc_refresh_token:
                credential.encrypted_refresh_token = enc_refresh_token
            credential.token_expires_at = token_expires_at
            credential.is_drive_granted = is_drive_granted
            credential.updated_at = now
        else:
            credential = OAuthCredential(
                researcher_id=researcher_id,
                provider=provider,
                encrypted_access_token=enc_access_token,
                encrypted_refresh_token=enc_refresh_token,
                token_expires_at=token_expires_at,
                is_drive_granted=is_drive_granted,
                created_at=now,
                updated_at=now,
            )
            self.db.add(credential)
        self.db.commit()
        self.db.refresh(credential)
        return credential

    def get_oauth_credential_by_researcher_id(
        self, researcher_id: uuid.UUID
    ) -> Optional[OAuthCredential]:
        statement = select(OAuthCredential).where(OAuthCredential.researcher_id == researcher_id)
        return self.db.exec(statement).first()

    def create_session(
        self,
        researcher_id: uuid.UUID,
        session_token: str,
        expires_at: datetime
    ) -> UserSession:
        user_session = UserSession(
            researcher_id=researcher_id,
            session_token=session_token,
            expires_at=expires_at,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(user_session)
        self.db.commit()
        self.db.refresh(user_session)
        return user_session

    def get_active_session_by_token(self, session_token: str) -> Optional[UserSession]:
        statement = select(UserSession).where(
            UserSession.session_token == session_token,
            UserSession.is_active == True,
            UserSession.expires_at > datetime.now(timezone.utc)
        )
        return self.db.exec(statement).first()

    def deactivate_session(self, session_token: str) -> bool:
        statement = select(UserSession).where(UserSession.session_token == session_token)
        session = self.db.exec(statement).first()
        if session:
            session.is_active = False
            self.db.commit()
            return True
        return False
