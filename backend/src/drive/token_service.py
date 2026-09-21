import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlmodel import Session, select
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError

from backend.src.core.config import settings
from backend.src.auth.models import OAuthCredential
from backend.src.auth.crypto_service import TokenEncryptionService


class DriveTokenRevokedError(Exception):
    """Raised when Google Drive token is revoked or expired and cannot be refreshed."""
    pass


class DriveTokenService:
    def __init__(self, db: Session):
        self.db = db
        self.crypto = TokenEncryptionService()

    def get_valid_access_token(self, researcher_id: uuid.UUID) -> str:
        statement = select(OAuthCredential).where(OAuthCredential.researcher_id == researcher_id)
        cred = self.db.exec(statement).first()

        if not cred or not cred.is_drive_granted:
            raise DriveTokenRevokedError("No valid Google Drive credentials found for researcher.")

        now = datetime.now(timezone.utc)
        # Fast path: token is still valid for more than 60 seconds
        token_expires_at = cred.token_expires_at
        if token_expires_at.tzinfo is None:
            token_expires_at = token_expires_at.replace(tzinfo=timezone.utc)

        if token_expires_at > now + timedelta(seconds=60):
            return self.crypto.decrypt_token(cred.encrypted_access_token)

        # Slow path: refresh token using google-auth
        if not cred.encrypted_refresh_token:
            raise DriveTokenRevokedError("No refresh token available to renew Drive access.")

        refresh_token = self.crypto.decrypt_token(cred.encrypted_refresh_token)
        google_creds = Credentials(
            token=None,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
        )

        try:
            google_creds.refresh(Request())
        except RefreshError as e:
            raise DriveTokenRevokedError(f"Drive access has been revoked or expired: {e}") from e

        # Persist newly refreshed access token and expiry
        cred.encrypted_access_token = self.crypto.encrypt_token(google_creds.token)
        if google_creds.expiry:
            expiry = google_creds.expiry
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            cred.token_expires_at = expiry
        else:
            cred.token_expires_at = now + timedelta(hours=1)

        cred.updated_at = now
        self.db.add(cred)
        self.db.commit()
        self.db.refresh(cred)

        return google_creds.token
