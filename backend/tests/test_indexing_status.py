import uuid
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from backend.src.main import app
from backend.src.core.database import get_session
from backend.src.core.config import settings
from backend.src.auth.models import ResearcherAccount, UserSession
from backend.src.documents.models import Document, FileType, ImportStatus
from backend.src.indexing.models import DocumentIndexVersion, IndexingJob


@pytest.fixture
def auth_client(db_session: Session):
    researcher = ResearcherAccount(
        id=uuid.uuid4(),
        email="status_tester@test.com",
        full_name="Status Tester",
        is_active=True,
    )
    db_session.add(researcher)

    session = UserSession(
        id=uuid.uuid4(),
        researcher_id=researcher.id,
        session_token="test_status_token",
        expires_at=datetime.now(timezone.utc).replace(year=2030),
        is_active=True,
    )
    db_session.add(session)
    db_session.commit()

    def override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = override_get_session
    client = TestClient(app)
    client.cookies.set(settings.SESSION_COOKIE_NAME, "test_status_token")
    yield client, researcher, db_session
    app.dependency_overrides.clear()


def test_get_job_status_unauthorized():
    client = TestClient(app)
    res = client.get(f"/api/indexing/jobs/{uuid.uuid4()}")
    assert res.status_code == 401


def test_get_job_status_not_found(auth_client):
    client, researcher, db = auth_client
    res = client.get(f"/api/indexing/jobs/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["error"] == "job_not_found"


def test_get_job_status_success(auth_client):
    client, researcher, db = auth_client
    doc = Document(
        id=uuid.uuid4(),
        google_drive_id="drive_stat_1",
        file_name="paper.pdf",
        file_type=FileType.pdf,
        import_status=ImportStatus.extracted,
        researcher_id=researcher.id,
    )
    db.add(doc)
    version = DocumentIndexVersion(
        id=uuid.uuid4(),
        document_id=doc.id,
        researcher_id=researcher.id,
        status="cleaning",
        model_name="intfloat/multilingual-e5-base",
        model_version="v1",
        model_commit_hash="hash123",
        embedding_dimension=768,
        chunk_size=1200,
        chunk_overlap=150,
        source_checksum="checksum123",
        index_fingerprint="fingerprint123",
        is_active=False,
    )
    db.add(version)
    job = IndexingJob(
        id=uuid.uuid4(),
        document_id=doc.id,
        researcher_id=researcher.id,
        index_version_id=version.id,
        status="cleaning",
        current_stage="cleaning",
    )
    db.add(job)
    db.commit()

    res = client.get(f"/api/indexing/jobs/{job.id}")
    assert res.status_code == 200
    data = res.json()
    assert data["job_id"] == str(job.id)
    assert data["status"] == "cleaning"
    assert data["current_stage"] == "cleaning"


def test_get_document_index_status(auth_client):
    client, researcher, db = auth_client
    doc = Document(
        id=uuid.uuid4(),
        google_drive_id="drive_stat_2",
        file_name="paper2.pdf",
        file_type=FileType.pdf,
        import_status=ImportStatus.extracted,
        researcher_id=researcher.id,
    )
    db.add(doc)
    db.commit()

    # First check when no index version exists
    res = client.get(f"/api/documents/{doc.id}/index-status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "not_indexed"

    # Add an active index version
    version = DocumentIndexVersion(
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
        source_checksum="checksum456",
        index_fingerprint="fingerprint456",
        is_active=True,
        total_chunks=14,
    )
    db.add(version)
    db.commit()

    res2 = client.get(f"/api/documents/{doc.id}/index-status")
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["status"] == "indexed"
    assert data2["total_chunks"] == 14
    assert data2["embedding_dimension"] == 768


def test_get_document_index_summary(auth_client):
    client, researcher, db = auth_client
    doc = Document(
        id=uuid.uuid4(),
        google_drive_id="drive_stat_3",
        file_name="solar_paper.pdf",
        file_type=FileType.pdf,
        import_status=ImportStatus.extracted,
        researcher_id=researcher.id,
    )
    db.add(doc)
    version = DocumentIndexVersion(
        id=uuid.uuid4(),
        document_id=doc.id,
        researcher_id=researcher.id,
        status="indexed",
        model_name="intfloat/multilingual-e5-base",
        model_version="v1",
        model_commit_hash="hash789",
        embedding_dimension=768,
        chunk_size=1200,
        chunk_overlap=150,
        source_checksum="checksum789",
        index_fingerprint="fingerprint789",
        is_active=True,
        total_chunks=22,
    )
    db.add(version)
    db.commit()

    res = client.get(f"/api/documents/{doc.id}/index-summary")
    assert res.status_code == 200
    summary = res.json()
    assert summary["document_id"] == str(doc.id)
    assert summary["file_name"] == "solar_paper.pdf"
    assert summary["total_chunks"] == 22
    assert summary["embedding_dimension"] == 768
    assert summary["model_name"] == "intfloat/multilingual-e5-base"
