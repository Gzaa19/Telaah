import uuid
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from backend.src.main import app
from backend.src.core.database import get_session
from backend.src.core.config import settings
from backend.src.auth.models import ResearcherAccount, UserSession
from backend.src.documents.models import Document, FileType, ImportStatus, ExtractedText
from backend.src.indexing.models import DocumentIndexVersion, IndexingJob
from backend.src.indexing.repository import IndexingRepository
from backend.src.indexing.service import DocumentIndexingService


@pytest.fixture
def auth_client(db_session: Session):
    researcher = ResearcherAccount(
        id=uuid.uuid4(),
        email="retry_tester@test.com",
        full_name="Retry Tester",
        is_active=True,
    )
    db_session.add(researcher)

    session = UserSession(
        id=uuid.uuid4(),
        researcher_id=researcher.id,
        session_token="test_retry_token",
        expires_at=datetime.now(timezone.utc).replace(year=2030),
        is_active=True,
    )
    db_session.add(session)
    db_session.commit()

    def override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = override_get_session
    client = TestClient(app)
    client.cookies.set(settings.SESSION_COOKIE_NAME, "test_retry_token")
    yield client, researcher, db_session
    app.dependency_overrides.clear()


def test_retry_failed_job_success(auth_client):
    client, researcher, db = auth_client
    doc = Document(
        id=uuid.uuid4(),
        google_drive_id="drive_fail_1",
        file_name="failed_paper.pdf",
        file_type=FileType.pdf,
        import_status=ImportStatus.extracted,
        researcher_id=researcher.id,
    )
    db.add(doc)
    extracted = ExtractedText(
        id=uuid.uuid4(),
        document_id=doc.id,
        full_text="Some valid content to re-attempt indexing.",
        total_pages=1,
    )
    db.add(extracted)

    version = DocumentIndexVersion(
        id=uuid.uuid4(),
        document_id=doc.id,
        researcher_id=researcher.id,
        status="failed",
        failure_reason="CUDA out of memory mock failure",
        model_name="intfloat/multilingual-e5-base",
        model_version="v1",
        model_commit_hash="hash123",
        embedding_dimension=768,
        chunk_size=1200,
        chunk_overlap=150,
        source_checksum="checksum_retry",
        index_fingerprint="fingerprint_retry",
        is_active=False,
    )
    db.add(version)

    job = IndexingJob(
        id=uuid.uuid4(),
        document_id=doc.id,
        researcher_id=researcher.id,
        index_version_id=version.id,
        status="failed",
        failure_reason="CUDA out of memory mock failure",
        retry_count=1,
        max_retries=3,
    )
    db.add(job)
    db.commit()

    # Trigger retry via POST /api/indexing/documents/{doc.id}
    res = client.post(f"/api/indexing/documents/{doc.id}")
    assert res.status_code == 202
    data = res.json()
    assert data["status"] == "queued"

    # Verify db status was reset and retry_count incremented
    db.refresh(job)
    assert job.status == "queued"
    assert job.retry_count == 2
    assert job.failure_reason is None


def test_retry_exceeds_max_retries(auth_client):
    client, researcher, db = auth_client
    doc = Document(
        id=uuid.uuid4(),
        google_drive_id="drive_max_retries",
        file_name="paper_exceeded.pdf",
        file_type=FileType.pdf,
        import_status=ImportStatus.extracted,
        researcher_id=researcher.id,
    )
    db.add(doc)
    extracted = ExtractedText(
        id=uuid.uuid4(),
        document_id=doc.id,
        full_text="Content for exceeded retries doc.",
        total_pages=1,
    )
    db.add(extracted)

    version = DocumentIndexVersion(
        id=uuid.uuid4(),
        document_id=doc.id,
        researcher_id=researcher.id,
        status="failed",
        failure_reason="Fatal parsing error",
        model_name="intfloat/multilingual-e5-base",
        model_version="v1",
        model_commit_hash="hash123",
        embedding_dimension=768,
        chunk_size=1200,
        chunk_overlap=150,
        source_checksum="checksum_max",
        index_fingerprint="fingerprint_max",
        is_active=False,
    )
    db.add(version)

    job = IndexingJob(
        id=uuid.uuid4(),
        document_id=doc.id,
        researcher_id=researcher.id,
        index_version_id=version.id,
        status="failed",
        failure_reason="Fatal parsing error",
        retry_count=3,
        max_retries=3,
    )
    db.add(job)
    db.commit()

    res = client.post(f"/api/indexing/documents/{doc.id}")
    assert res.status_code == 422
    assert "Batas percobaan indexing telah tercapai" in res.json()["message"]


def test_detect_stale_jobs(db_session: Session):
    researcher = ResearcherAccount(
        id=uuid.uuid4(),
        email="stale_tester@test.com",
        full_name="Stale Tester",
        is_active=True,
    )
    db_session.add(researcher)

    doc = Document(
        id=uuid.uuid4(),
        google_drive_id="drive_stale",
        file_name="stale_doc.pdf",
        file_type=FileType.pdf,
        import_status=ImportStatus.extracted,
        researcher_id=researcher.id,
    )
    db_session.add(doc)

    version = DocumentIndexVersion(
        id=uuid.uuid4(),
        document_id=doc.id,
        researcher_id=researcher.id,
        status="embedding",
        model_name="intfloat/multilingual-e5-base",
        model_version="v1",
        model_commit_hash="hash123",
        embedding_dimension=768,
        chunk_size=1200,
        chunk_overlap=150,
        source_checksum="chk_stale",
        index_fingerprint="fp_stale",
        is_active=False,
    )
    db_session.add(version)

    # Job last heartbeat 10 minutes ago
    old_heartbeat = datetime.now(timezone.utc) - timedelta(minutes=10)
    stale_job = IndexingJob(
        id=uuid.uuid4(),
        document_id=doc.id,
        researcher_id=researcher.id,
        index_version_id=version.id,
        status="embedding",
        current_stage="embedding",
        retry_count=0,
        max_retries=3,
        heartbeat_at=old_heartbeat,
    )
    db_session.add(stale_job)
    db_session.commit()

    repo = IndexingRepository(db=db_session)
    stale_jobs = repo.get_stale_jobs(threshold_minutes=5)
    assert len(stale_jobs) >= 1
    assert any(j.id == stale_job.id for j in stale_jobs)
