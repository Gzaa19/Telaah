import uuid
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from backend.src.main import app
from backend.src.core.database import get_session
from backend.src.core.config import settings
from backend.src.auth.models import ResearcherAccount, UserSession
from backend.src.documents.models import Document, FileType, ImportStatus, ExtractedText
from backend.src.indexing.models import DocumentIndexVersion, IndexingJob


@pytest.fixture
def auth_client(db_session: Session):
    researcher = ResearcherAccount(
        id=uuid.uuid4(),
        email="reindex_tester@test.com",
        full_name="Reindex Tester",
        is_active=True,
    )
    db_session.add(researcher)

    session = UserSession(
        id=uuid.uuid4(),
        researcher_id=researcher.id,
        session_token="test_reindex_token",
        expires_at=datetime.now(timezone.utc).replace(year=2030),
        is_active=True,
    )
    db_session.add(session)
    db_session.commit()

    def override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = override_get_session
    client = TestClient(app)
    client.cookies.set(settings.SESSION_COOKIE_NAME, "test_reindex_token")
    yield client, researcher, db_session
    app.dependency_overrides.clear()


def test_reindex_unauthorized():
    client = TestClient(app)
    res = client.post(f"/api/documents/{uuid.uuid4()}/reindex")
    assert res.status_code == 401


def test_reindex_not_found(auth_client):
    client, researcher, db = auth_client
    res = client.post(f"/api/documents/{uuid.uuid4()}/reindex")
    assert res.status_code == 404


def test_reindex_active_document_success(auth_client):
    client, researcher, db = auth_client
    doc = Document(
        id=uuid.uuid4(),
        google_drive_id="drive_reindex_1",
        file_name="quantum_materials.pdf",
        file_type=FileType.pdf,
        import_status=ImportStatus.extracted,
        researcher_id=researcher.id,
    )
    db.add(doc)
    extracted = ExtractedText(
        id=uuid.uuid4(),
        document_id=doc.id,
        full_text="Quantum materials exhibit topological properties under low temperatures.",
        total_pages=1,
    )
    db.add(extracted)

    old_version = DocumentIndexVersion(
        id=uuid.uuid4(),
        document_id=doc.id,
        researcher_id=researcher.id,
        status="indexed",
        model_name="intfloat/multilingual-e5-base",
        model_version="v1",
        model_commit_hash="hash123",
        embedding_dimension=768,
        chunk_size=1200,
        chunk_overlap=150,
        source_checksum="chk_quantum",
        index_fingerprint="fp_quantum",
        is_active=True,
        total_chunks=10,
    )
    db.add(old_version)
    db.commit()

    res = client.post(f"/api/documents/{doc.id}/reindex")
    assert res.status_code == 202
    data = res.json()
    assert data["status"] == "queued"
    assert data["document_id"] == str(doc.id)
    assert data["archived_index_version_id"] == str(old_version.id)
    assert "new_index_version_id" in data
    assert "job_id" in data

    # Verify old version is archived
    db.refresh(old_version)
    assert old_version.status == "archived"
    assert old_version.is_active is False

    # Verify new version exists and is queued
    new_version_id = uuid.UUID(data["new_index_version_id"])
    new_version = db.get(DocumentIndexVersion, new_version_id)
    assert new_version is not None
    assert new_version.status == "queued"
    assert new_version.is_active is False
