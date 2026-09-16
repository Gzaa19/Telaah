from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from backend.src.main import app
from backend.src.core.database import get_session
from backend.src.auth.models import ResearcherAccount, UserSession
from backend.src.auth.repository import AuthRepository
from backend.src.auth.schemas import GoogleProfileDTO, OAuthTokenDTO


@pytest.fixture(name="client")
def client_fixture(db_session: Session):
    def get_session_override():
        return db_session

    app.dependency_overrides[get_session] = get_session_override
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_google_login(client: TestClient):
    response = client.get("/auth/google/login", follow_redirects=False)
    assert response.status_code == 302
    assert "accounts.google.com" in response.headers["location"]
    # Check that oauth_state cookie is set
    assert "oauth_state" in response.cookies


def test_google_callback_invalid_state(client: TestClient):
    response = client.get(
        "/auth/google/callback?code=fake_code&state=bad_state",
        cookies={"oauth_state": "expected_state"},
        follow_redirects=False
    )
    assert response.status_code == 400


@patch("backend.src.auth.oauth_service.GoogleOAuthService.exchange_code")
@patch("backend.src.auth.oauth_service.GoogleOAuthService.fetch_user_profile")
def test_google_callback_success(mock_profile, mock_exchange, client: TestClient):
    mock_exchange.return_value = OAuthTokenDTO(
        access_token="mock_access_token",
        refresh_token="mock_refresh_token",
        expires_in=3600,
        scope="openid email profile https://www.googleapis.com/auth/drive.readonly"
    )
    mock_profile.return_value = GoogleProfileDTO(
        email="peneliti.sukses@kampus.ac.id",
        full_name="Dr. Sukses",
        avatar_url="https://avatar.google.com/photo.jpg"
    )

    client.cookies.set("oauth_state", "valid_state_123")
    response = client.get(
        "/auth/google/callback?code=mock_code&state=valid_state_123",
        follow_redirects=False
    )

    assert response.status_code == 302
    assert response.headers["location"].endswith("/dashboard")
    assert "paper_gen_session" in response.cookies


@patch("backend.src.auth.oauth_service.GoogleOAuthService.exchange_code")
@patch("backend.src.auth.oauth_service.GoogleOAuthService.fetch_user_profile")
def test_google_callback_alias_success(mock_profile, mock_exchange, client: TestClient):
    mock_exchange.return_value = OAuthTokenDTO(
        access_token="mock_access_token_alias",
        refresh_token="mock_refresh_token_alias",
        expires_in=3600,
        scope="openid email profile https://www.googleapis.com/auth/drive.readonly"
    )
    mock_profile.return_value = GoogleProfileDTO(
        email="peneliti.alias@kampus.ac.id",
        full_name="Dr. Sukses Alias",
        avatar_url="https://avatar.google.com/photo.jpg"
    )

    client.cookies.set("oauth_state", "valid_state_456")
    response = client.get(
        "/auth/callback/google?code=mock_code_alias&state=valid_state_456",
        follow_redirects=False
    )

    assert response.status_code == 302
    assert response.headers["location"].endswith("/dashboard")
    assert "paper_gen_session" in response.cookies


def test_get_me_unauthorized(client: TestClient):
    response = client.get("/auth/me")
    assert response.status_code == 401
    data = response.json()
    assert data["error"] == "UNAUTHORIZED"


def test_get_me_authorized(client: TestClient, db_session: Session):
    repo = AuthRepository(db=db_session)
    researcher = repo.upsert_researcher(
        email="dr.budi@kampus.id",
        full_name="Dr. Budi"
    )
    from datetime import datetime, timezone, timedelta
    session = repo.create_session(
        researcher_id=researcher.id,
        session_token="session-token-xyz",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )

    client.cookies.set("paper_gen_session", "session-token-xyz")
    response = client.get("/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "dr.budi@kampus.id"
    assert data["full_name"] == "Dr. Budi"
