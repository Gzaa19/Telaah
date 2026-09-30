import uuid
from datetime import datetime, timezone
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlmodel import Session

from backend.src.main import app
from backend.src.core.database import get_session
from backend.src.core.config import settings
from backend.src.auth.models import ResearcherAccount, UserSession
from backend.src.documents.models import Document, FileType, ImportStatus
from backend.src.indexing.models import DocumentIndexVersion


@pytest.fixture
def auth_outline_client(db_session: Session):
    researcher1 = ResearcherAccount(
        id=uuid.uuid4(),
        email="author1@test.com",
        full_name="Dr. Author One",
        is_active=True,
    )
    researcher2 = ResearcherAccount(
        id=uuid.uuid4(),
        email="author2@test.com",
        full_name="Dr. Author Two",
        is_active=True,
    )
    db_session.add(researcher1)
    db_session.add(researcher2)

    session = UserSession(
        id=uuid.uuid4(),
        researcher_id=researcher1.id,
        session_token="test_outline_token",
        expires_at=datetime.now(timezone.utc).replace(year=2030),
        is_active=True,
    )
    db_session.add(session)
    db_session.commit()

    def override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = override_get_session
    client = TestClient(app)
    client.cookies.set(settings.SESSION_COOKIE_NAME, "test_outline_token")
    yield client, researcher1, researcher2, db_session
    app.dependency_overrides.clear()


def test_generate_outline_success_202(auth_outline_client):
    client, researcher, _, db = auth_outline_client

    # Create indexed document
    doc = Document(
        id=uuid.uuid4(),
        google_drive_id="drive-valid",
        file_name="research_paper.pdf",
        file_type="pdf",
        import_status=ImportStatus.extracted,
        researcher_id=researcher.id,
    )
    db.add(doc)
    db.commit()

    # Create active index version
    div = DocumentIndexVersion(
        id=uuid.uuid4(),
        document_id=doc.id,
        researcher_id=researcher.id,
        status="indexed",
        model_name="test-model",
        model_version="1.0",
        model_commit_hash="abc",
        source_checksum="chk",
        index_fingerprint="fp",
        is_active=True,
    )
    db.add(div)
    db.commit()

    with patch("backend.src.outlines.router.run_outline_generation_background") as mock_bg:
        response = client.post(
            "/api/outlines/generate",
            json={
                "document_id": str(doc.id),
                "template_id": "icicos",
                "language": "en_ieee",
            },
        )

    assert response.status_code == 202
    data = response.json()
    assert "outline_id" in data
    assert data["status"] == "preparing"
    mock_bg.assert_called_once()


def test_generate_outline_unauthorized():
    client = TestClient(app)
    response = client.post(
        "/api/outlines/generate",
        json={"document_id": str(uuid.uuid4()), "template_id": "icicos"},
    )
    assert response.status_code == 401
