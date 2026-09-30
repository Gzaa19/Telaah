import uuid
from datetime import datetime, timezone
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from backend.src.main import app
from backend.src.core.database import get_session
from backend.src.core.config import settings
from backend.src.auth.models import ResearcherAccount, UserSession
from backend.src.documents.models import Document, FileType, ImportStatus, ExtractedText


@pytest.fixture
def auth_client(db_session: Session):
    researcher = ResearcherAccount(
        id=uuid.uuid4(),
        email="researcher@test.com",
        full_name="Dr. Test Researcher",
        is_active=True,
    )
    db_session.add(researcher)

    session = UserSession(
        id=uuid.uuid4(),
        researcher_id=researcher.id,
        session_token="test_indexing_session_token",
        expires_at=datetime.now(timezone.utc).replace(year=2030),
        is_active=True,
    )
    db_session.add(session)
    db_session.commit()

    def override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = override_get_session
    client = TestClient(app)
    client.cookies.set(settings.SESSION_COOKIE_NAME, "test_indexing_session_token")
    yield client, researcher, db_session
    app.dependency_overrides.clear()


def test_trigger_indexing_unauthorized():
    client = TestClient(app)
    response = client.post(f"/api/indexing/documents/{uuid.uuid4()}")
    assert response.status_code == 401


def test_trigger_indexing_not_found(auth_client):
    client, researcher, db = auth_client
    response = client.post(f"/api/indexing/documents/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json()["error"] == "document_not_found"


def test_trigger_indexing_invalid_status(auth_client):
    client, researcher, db = auth_client
    doc = Document(
        id=uuid.uuid4(),
        google_drive_id="drive_123",
        file_name="paper.pdf",
        file_type=FileType.pdf,
        import_status=ImportStatus.importing,  # Not extracted yet!
        researcher_id=researcher.id,
    )
    db.add(doc)
    db.commit()

    response = client.post(f"/api/indexing/documents/{doc.id}")
    assert response.status_code == 422
    assert response.json()["error"] == "invalid_document_status"


def test_trigger_indexing_sunny_day(auth_client):
    client, researcher, db = auth_client
    doc = Document(
        id=uuid.uuid4(),
        google_drive_id="drive_456",
        file_name="renewable_energy.pdf",
        file_type=FileType.pdf,
        import_status=ImportStatus.extracted,
        researcher_id=researcher.id,
    )
    db.add(doc)
    extracted = ExtractedText(
        id=uuid.uuid4(),
        document_id=doc.id,
        full_text="Sample scientific text to index.",
        total_pages=1,
    )
    db.add(extracted)
    db.commit()

    with patch("backend.src.indexing.router.run_indexing_pipeline"):
        response = client.post(f"/api/indexing/documents/{doc.id}")
        assert response.status_code == 202
        data = response.json()
        assert data["status"] == "queued"
        assert "job_id" in data
        assert "index_version_id" in data
