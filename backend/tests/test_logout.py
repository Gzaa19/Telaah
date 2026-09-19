from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from backend.src.main import app
from backend.src.core.database import get_session
from backend.src.auth.repository import AuthRepository
from backend.src.auth.session_service import SessionService


@pytest.fixture(name="client")
def client_fixture(db_session: Session):
    def get_session_override():
        return db_session

    app.dependency_overrides[get_session] = get_session_override
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_session_service_invalidate_session(db_session: Session):
    repo = AuthRepository(db=db_session)
    researcher = repo.upsert_researcher(
        email="logout.test@scholar.edu",
        full_name="Dr. Logout"
    )

    session_service = SessionService(db=db_session)
    user_session = session_service.create_24h_session(researcher_id=researcher.id)
    assert user_session.apakah_aktif is True

    # Validate session initially works
    validated = session_service.validate_session(user_session.token_sesi)
    assert validated is not None

    # Invalidate session
    success = session_service.invalidate_session(user_session.token_sesi)
    assert success is True

    # Validate session now returns None
    assert session_service.validate_session(user_session.token_sesi) is None


def test_logout_endpoint_clears_cookie_and_invalidates(client: TestClient, db_session: Session):
    repo = AuthRepository(db=db_session)
    researcher = repo.upsert_researcher(
        email="endpoint.logout@scholar.edu",
        full_name="Dr. Endpoint Logout"
    )
    session_service = SessionService(db=db_session)
    user_session = session_service.create_24h_session(researcher_id=researcher.id)

    client.cookies.set("paper_gen_session", user_session.token_sesi)
    response = client.post("/auth/logout")

    assert response.status_code == 200
    assert response.json()["message"] == "Logout successful"

    # Verify session is deactivated in DB
    db_session.refresh(user_session)
    assert user_session.apakah_aktif is False

    # Verify cookie was instructed to delete (set-cookie header with max-age=0 or expires in past)
    set_cookie_header = response.headers.get("set-cookie", "")
    assert "paper_gen_session" in set_cookie_header
    assert 'max-age=0' in set_cookie_header.lower() or 'expires=' in set_cookie_header.lower()


def test_logout_endpoint_without_cookie(client: TestClient):
    # Idempotent logout even when no cookie was sent
    response = client.post("/auth/logout")
    assert response.status_code == 200
    assert response.json()["message"] == "Logout successful"
