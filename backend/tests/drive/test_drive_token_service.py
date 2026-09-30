import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
import pytest
from google.auth.exceptions import RefreshError

from backend.src.auth.models import ResearcherAccount, OAuthCredential
from backend.src.auth.crypto_service import TokenEncryptionService
from backend.src.drive.token_service import DriveTokenService, DriveTokenRevokedError


@pytest.fixture
def researcher_and_cred(db_session):
    crypto = TokenEncryptionService()
    researcher = ResearcherAccount(
        email="researcher@univ.ac.id",
        full_name="Dr. Peneliti",
    )
    db_session.add(researcher)
    db_session.commit()
    db_session.refresh(researcher)

    # Valid token (expires in 1 hour)
    valid_cred = OAuthCredential(
        researcher_id=researcher.id,
        provider="google",
        encrypted_access_token=crypto.encrypt_token("valid-access-token-123"),
        encrypted_refresh_token=crypto.encrypt_token("valid-refresh-token-456"),
        token_expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        is_drive_granted=True,
    )
    db_session.add(valid_cred)
    db_session.commit()
    db_session.refresh(valid_cred)

    return researcher, valid_cred


def test_get_valid_access_token_not_expired(db_session, researcher_and_cred):
    researcher, cred = researcher_and_cred
    service = DriveTokenService(db=db_session)

    token = service.get_valid_access_token(researcher.id)
    assert token == "valid-access-token-123"


def test_get_valid_access_token_silent_refresh(db_session, researcher_and_cred):
    researcher, cred = researcher_and_cred
    crypto = TokenEncryptionService()

    # Set token to expired
    cred.token_expires_at = datetime.now(timezone.utc) - timedelta(minutes=10)
    db_session.add(cred)
    db_session.commit()

    service = DriveTokenService(db=db_session)

    def fake_refresh(self, request):
        self.token = "new-refreshed-token-789"
        self.expiry = datetime.now(timezone.utc) + timedelta(hours=1)

    with patch("google.oauth2.credentials.Credentials.refresh", new=fake_refresh):
        new_token = service.get_valid_access_token(researcher.id)
        assert new_token == "new-refreshed-token-789"

        # Verify persisted in database
        db_session.refresh(cred)
        assert crypto.decrypt_token(cred.encrypted_access_token) == "new-refreshed-token-789"


def test_get_valid_access_token_refresh_error(db_session, researcher_and_cred):
    researcher, cred = researcher_and_cred

    # Set token to expired
    cred.token_expires_at = datetime.now(timezone.utc) - timedelta(minutes=10)
    db_session.add(cred)
    db_session.commit()

    service = DriveTokenService(db=db_session)

    with patch("google.oauth2.credentials.Credentials.refresh") as mock_refresh:
        mock_refresh.side_effect = RefreshError("Token has been revoked or expired.")

        with pytest.raises(DriveTokenRevokedError):
            service.get_valid_access_token(researcher.id)
