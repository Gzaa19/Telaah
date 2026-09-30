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
        email="doc_router@univ.ac.id",
        full_name="Dr. Dokumen Router",
    )
    db_session.add(researcher)
    db_session.commit()
    db_session.refresh(researcher)

    session_token = "valid-session-doc-router-123"
    user_session = UserSession(
        researcher_id=researcher.id,
        session_token=session_token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db_session.add(user_session)
    db_session.commit()

    return session_token, researcher


def test_import_document_endpoint_success(client, authenticated_session):
    session_token, researcher = authenticated_session

    with patch("backend.src.documents.service.DocumentService.enqueue_import") as mock_enqueue:
        mock_doc = Document(
            id=uuid.uuid4(),
            google_drive_id="drive-file-xyz",
            file_name="Test Paper.pdf",
            file_type=FileType.pdf,
            import_status=ImportStatus.importing,
            researcher_id=researcher.id,
        )
        mock_enqueue.return_value = mock_doc

        client.cookies.set(settings.SESSION_COOKIE_NAME, session_token)
        response = client.post(
            "/api/documents/import",
            json={
                "drive_file_id": "drive-file-xyz",
                "file_name": "Test Paper.pdf",
                "file_type": "pdf",
                "file_size_bytes": 102400,
            },
        )
        assert response.status_code == 202
        data = response.json()
        assert data["document_id"] == str(mock_doc.id)
        assert data["status"] == "importing"


def test_get_document_status_endpoint(client, authenticated_session, db_session):
    session_token, researcher = authenticated_session

    doc = Document(
        google_drive_id="drive-status-test",
        file_name="Status Test.pdf",
        file_type=FileType.pdf,
        import_status=ImportStatus.extracted,
        researcher_id=researcher.id,
        extracted_at=datetime.now(timezone.utc),
    )
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)

    client.cookies.set(settings.SESSION_COOKIE_NAME, session_token)
    response = client.get(f"/api/documents/{doc.id}/status")
    assert response.status_code == 200
    data = response.json()
    assert data["document_id"] == str(doc.id)
    assert data["import_status"] == "extracted"


def test_get_document_status_not_found(client, authenticated_session):
    session_token, _ = authenticated_session
    client.cookies.set(settings.SESSION_COOKIE_NAME, session_token)
    response = client.get(f"/api/documents/{uuid.uuid4()}/status")
    assert response.status_code == 404
