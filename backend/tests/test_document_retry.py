import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient

from backend.src.main import app
from backend.src.core.config import settings
from backend.src.core.database import get_session
from backend.src.auth.models import ResearcherAccount, UserSession
from backend.src.documents.models import Document, ImportStatus, FileType


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
    researcher = ResearcherAccount(
        email="doc_retry@univ.ac.id",
        full_name="Dr. Dokumen Retry",
    )
    db_session.add(researcher)
    db_session.commit()
    db_session.refresh(researcher)

    session_token = "valid-session-doc-retry-123"
    user_session = UserSession(
        researcher_id=researcher.id,
        session_token=session_token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db_session.add(user_session)
    db_session.commit()

    return session_token, researcher


def test_retry_import_failed_document(client, authenticated_session, db_session):
    session_token, researcher = authenticated_session

    doc = Document(
        google_drive_id="drive-retry-001",
        file_name="Failed Report.pdf",
        file_type=FileType.pdf,
        import_status=ImportStatus.failed,
        failure_reason="PDF does not contain extractable text (likely a scanned image).",
        researcher_id=researcher.id,
    )
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)

    client.cookies.set(settings.SESSION_COOKIE_NAME, session_token)
    response = client.post(f"/api/documents/{doc.id}/retry")
    assert response.status_code == 202
    data = response.json()
    assert data["document_id"] == str(doc.id)
    assert data["status"] == "importing"

    db_session.refresh(doc)
    assert doc.import_status == ImportStatus.importing
    assert doc.failure_reason is None


def test_retry_import_non_failed_document_conflict(client, authenticated_session, db_session):
    session_token, researcher = authenticated_session

    doc = Document(
        google_drive_id="drive-retry-002",
        file_name="Extracted Report.pdf",
        file_type=FileType.pdf,
        import_status=ImportStatus.extracted,
        researcher_id=researcher.id,
    )
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)

    client.cookies.set(settings.SESSION_COOKIE_NAME, session_token)
    response = client.post(f"/api/documents/{doc.id}/retry")
    assert response.status_code == 409
    data = response.json()
    assert "failed" in data["detail"]
