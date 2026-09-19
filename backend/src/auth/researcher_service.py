import uuid
from datetime import datetime, timezone, timedelta
from typing import Tuple, Optional
from sqlmodel import Session

from backend.src.auth.models import ResearcherAccount, OAuthCredential
from backend.src.auth.repository import AuthRepository
from backend.src.auth.schemas import GoogleProfileDTO, OAuthTokenDTO, ResearcherProfileResponse
from backend.src.auth.crypto_service import TokenEncryptionService
from backend.src.auth.oauth_service import GoogleOAuthService


class ResearcherService:
    def __init__(
        self,
        db: Session,
        crypto_service: Optional[TokenEncryptionService] = None,
        repository: Optional[AuthRepository] = None,
    ):
        self.db = db
        self.crypto_service = crypto_service or TokenEncryptionService()
        self.repo = repository or AuthRepository(db=db)

    def upsert_researcher_with_credentials(
        self,
        profile: GoogleProfileDTO,
        tokens: OAuthTokenDTO
    ) -> Tuple[ResearcherAccount, OAuthCredential]:
        # 1. Upsert researcher account
        researcher = self.repo.upsert_researcher(
            email=profile.email,
            full_name=profile.full_name,
            avatar_url=profile.avatar_url,
        )

        # 2. Encrypt tokens
        enc_access = self.crypto_service.encrypt_token(tokens.access_token)
        enc_refresh = (
            self.crypto_service.encrypt_token(tokens.refresh_token)
            if tokens.refresh_token
            else None
        )

        # 3. Check scope & calculate expiry
        is_drive_granted = GoogleOAuthService.check_drive_scope_granted(tokens.scope)
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=tokens.expires_in)

        # 4. Save credentials
        credential = self.repo.save_oauth_credentials(
            researcher_id=researcher.id,
            enc_access_token=enc_access,
            token_expires_at=expires_at,
            is_drive_granted=is_drive_granted,
            enc_refresh_token=enc_refresh,
            provider="google",
        )

        return researcher, credential

    def get_researcher_profile_response(
        self,
        researcher_id: uuid.UUID,
        session_expires_at: datetime
    ) -> Optional[ResearcherProfileResponse]:
        researcher = self.repo.get_researcher_by_id(researcher_id)
        if not researcher or not researcher.is_active:
            return None

        credential = self.repo.get_oauth_credential_by_researcher_id(researcher_id)
        is_drive_granted = credential.is_drive_granted if credential else False

        return ResearcherProfileResponse(
            researcher_id=researcher.id,
            email=researcher.email,
            full_name=researcher.full_name,
            avatar_url=researcher.avatar_url,
            is_drive_granted=is_drive_granted,
            session_expires_at=session_expires_at,
        )
