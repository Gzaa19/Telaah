import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient

from backend.src.main import app
from backend.src.core.config import settings
from backend.src.core.database import get_session
from backend.src.auth.models import ResearcherAccount, UserSession, OAuthCredential
from backend.src.auth.crypto_service import TokenEncryptionService
from backend.src.drive.token_service import DriveTokenRevokedError
from backend.src.drive.schemas import DriveFileListResponse, DriveFileItem


@pytest.fixture
def client(db_session):
    def get_test_db():
        yield db_session

    app.dependency_overrides[get_session] = get_test_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def authenticated_session(db_session):
    crypto = TokenEncryptionService()
    researcher = ResearcherAccount(
        email="test_drive@univ.ac.id",
        full_name="Dr. Drive Tester",
    )
    db_session.add(researcher)
    db_session.commit()
    db_session.refresh(researcher)

    session_token = "valid-session-drive-test-123"
    user_session = UserSession(
        researcher_id=researcher.id,
        session_token=session_token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db_session.add(user_session)

    cred = OAuthCredential(
        researcher_id=researcher.id,
        provider="google",
        encrypted_access_token=crypto.encrypt("access-token-xyz"),
        encrypted_refresh_token=crypto.encrypt("refresh-token-xyz"),
        token_expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        is_drive_granted=True,
    )
    db_session.add(cred)
    db_session.commit()

    return session_token, researcher


def test_get_drive_files_unauthorized(client):
    response = client.get("/api/drive/files")
    assert response.status_code == 401
    assert "Invalid or expired session" in response.json()["detail"]


def test_get_drive_files_success(client, authenticated_session):
    session_token, researcher = authenticated_session
    mock_response = DriveFileListResponse(
        files=[
            DriveFileItem(
                id="doc-123",
                name="Paper.pdf",
                mime_type="application/pdf",
                file_type="pdf",
                size_bytes=1024,
                modified_at="2026-09-18T10:00:00Z",
                is_folder=False,
                can_import=True,
            )
        ],
        next_page_token=None,
        folder_path=[{"id": "root", "name": "My Drive"}],
    )

    with patch("backend.src.drive.token_service.DriveTokenService.get_valid_access_token", return_value="mock-token"), \
         patch("backend.src.drive.drive_service.DriveService.list_files", return_value=mock_response):

        client.cookies.set(settings.SESSION_COOKIE_NAME, session_token)
        response = client.get("/api/drive/files?folder_id=root")
        assert response.status_code == 200
        data = response.json()
        assert len(data["files"]) == 1
        assert data["files"][0]["name"] == "Paper.pdf"
        assert data["files"][0]["can_import"] is True
        assert data["folder_path"][0]["name"] == "My Drive"


def test_get_drive_files_token_revoked(client, authenticated_session):
    session_token, researcher = authenticated_session

    with patch("backend.src.drive.token_service.DriveTokenService.get_valid_access_token", side_effect=DriveTokenRevokedError()):
        client.cookies.set(settings.SESSION_COOKIE_NAME, session_token)
        response = client.get("/api/drive/files")
        assert response.status_code == 403
        data = response.json()
        assert data["error_code"] == "DRIVE_TOKEN_REVOKED"
