import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
import pytest

from backend.src.auth.oauth_service import GoogleOAuthService
from backend.src.auth.session_service import SessionService
from backend.src.auth.researcher_service import ResearcherService
from backend.src.auth.schemas import GoogleProfileDTO, OAuthTokenDTO
from backend.src.auth.crypto_service import TokenEncryptionService
from backend.src.auth.repository import AuthRepository


def test_generate_auth_url():
    oauth_service = GoogleOAuthService(
        client_id="test-client-id",
        client_secret="test-client-secret",
        redirect_uri="http://localhost:8000/auth/google/callback"
    )
    auth_url, state = oauth_service.generate_authorization_url()
    assert "accounts.google.com" in auth_url or "google" in auth_url
    assert "test-client-id" in auth_url
    assert state is not None
    assert len(state) > 10


def test_session_service_create_and_validate(db_session):
    repo = AuthRepository(db=db_session)
    researcher = repo.upsert_researcher(
        email="test@scholar.edu",
        full_name="Dr. Scholar"
    )

    session_service = SessionService(db=db_session)
    user_session = session_service.create_24h_session(researcher_id=researcher.id)

    assert user_session.token_sesi is not None
    assert user_session.apakah_aktif is True
    expires_at = user_session.kedaluwarsa_pada
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    assert expires_at > datetime.now(timezone.utc)

    # Validate session
    validated = session_service.validate_session(user_session.token_sesi)
    assert validated is not None
    assert validated.id == user_session.id
    assert validated.peneliti_id == researcher.id


def test_session_service_expired_session(db_session):
    repo = AuthRepository(db=db_session)
    researcher = repo.upsert_researcher(
        email="expired@scholar.edu",
        full_name="Dr. Expired"
    )

    session_service = SessionService(db=db_session)
    past_time = datetime.now(timezone.utc) - timedelta(hours=1)
    expired_session = repo.create_session(
        researcher_id=researcher.id,
        session_token="expired-token-123",
        expires_at=past_time
    )

    validated = session_service.validate_session(expired_session.token_sesi)
    assert validated is None


def test_researcher_service_upsert_and_credentials(db_session):
    repo = AuthRepository(db=db_session)
    crypto_service = TokenEncryptionService(key="94cbf037b51293a61f43501a2f6468923058869c991ba90f2305718a381023a1")
    researcher_service = ResearcherService(db=db_session, crypto_service=crypto_service)

    profile = GoogleProfileDTO(
        email="peneliti@univ.ac.id",
        full_name="Prof. Peneliti",
        avatar_url="https://avatar.google.com/photo.jpg"
    )
    tokens = OAuthTokenDTO(
        access_token="raw-access-token-123",
        refresh_token="raw-refresh-token-456",
        expires_in=3600,
        scope="openid email profile https://www.googleapis.com/auth/drive.readonly"
    )

    researcher, credential = researcher_service.upsert_researcher_with_credentials(profile, tokens)

    assert researcher.email == "peneliti@univ.ac.id"
    assert credential.apakah_drive_diizinkan is True
    # Ciphertext verification: raw token must NOT be stored in DB
    assert credential.token_akses_terenkripsi != "raw-access-token-123"
    assert crypto_service.decrypt_token(credential.token_akses_terenkripsi) == "raw-access-token-123"
