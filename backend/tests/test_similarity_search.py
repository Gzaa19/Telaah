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
from backend.src.indexing.models import DocumentIndexVersion, DocumentChunk


@pytest.fixture
def auth_client(db_session: Session):
    researcher1 = ResearcherAccount(
        id=uuid.uuid4(),
        email="searcher1@test.com",
        full_name="Dr. Searcher One",
        is_active=True,
    )
    researcher2 = ResearcherAccount(
        id=uuid.uuid4(),
        email="searcher2@test.com",
        full_name="Dr. Searcher Two",
        is_active=True,
    )
    db_session.add(researcher1)
    db_session.add(researcher2)

    session = UserSession(
        id=uuid.uuid4(),
        researcher_id=researcher1.id,
        session_token="test_search_token",
        expires_at=datetime.now(timezone.utc).replace(year=2030),
        is_active=True,
    )
    db_session.add(session)
    db_session.commit()

    def override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = override_get_session
    client = TestClient(app)
    client.cookies.set(settings.SESSION_COOKIE_NAME, "test_search_token")
    yield client, researcher1, researcher2, db_session
    app.dependency_overrides.clear()


def test_similarity_search_unauthorized():
    client = TestClient(app)
    res = client.get("/api/search/similarity?q=perovskite")
    assert res.status_code == 401


def test_similarity_search_end_to_end_with_citations(auth_client):
    client, r1, r2, db = auth_client

    # Create doc and indexed version for researcher 1
    doc1 = Document(
        id=uuid.uuid4(),
        google_drive_id="drive_search_1",
        file_name="perovskite_photovoltaics.pdf",
        file_type=FileType.pdf,
        import_status=ImportStatus.extracted,
        researcher_id=r1.id,
    )
    db.add(doc1)
    ver1 = DocumentIndexVersion(
        id=uuid.uuid4(),
        document_id=doc1.id,
        researcher_id=r1.id,
        status="indexed",
        model_name="intfloat/multilingual-e5-base",
        model_version="v1",
        model_commit_hash="hash123",
        embedding_dimension=768,
        chunk_size=1200,
        chunk_overlap=150,
        source_checksum="chk_pv",
        index_fingerprint="fp_pv",
        is_active=True,
        total_chunks=2,
    )
    db.add(ver1)

    # Chunks for doc1: one matching and one less matching
    # Let vector 1 have [1.0, 0.0, ...] and vector 2 have [0.0, 1.0, ...]
    v1 = [1.0] + [0.0] * 767
    v2 = [0.0, 1.0] + [0.0] * 766
    c1 = DocumentChunk(
        id=uuid.uuid4(),
        document_id=doc1.id,
        researcher_id=r1.id,
        index_version_id=ver1.id,
        chunk_index=0,
        chunk_text="Perovskite tandem cells demonstrated highest laboratory efficiency.",
        embedding=v1,
        page_number=3,
        section_name="Results",
    )
    c2 = DocumentChunk(
        id=uuid.uuid4(),
        document_id=doc1.id,
        researcher_id=r1.id,
        index_version_id=ver1.id,
        chunk_index=1,
        chunk_text="Experimental chemical precursors were obtained from Sigma Aldrich.",
        embedding=v2,
        page_number=5,
        section_name="Materials",
    )
    db.add(c1)
    db.add(c2)

    # Another doc for researcher 2 (tenant isolation test)
    doc2 = Document(
        id=uuid.uuid4(),
        google_drive_id="drive_search_2",
        file_name="other_researcher_paper.pdf",
        file_type=FileType.pdf,
        import_status=ImportStatus.extracted,
        researcher_id=r2.id,
    )
    db.add(doc2)
    ver2 = DocumentIndexVersion(
        id=uuid.uuid4(),
        document_id=doc2.id,
        researcher_id=r2.id,
        status="indexed",
        model_name="intfloat/multilingual-e5-base",
        model_version="v1",
        model_commit_hash="hash123",
        embedding_dimension=768,
        chunk_size=1200,
        chunk_overlap=150,
        source_checksum="chk_other",
        index_fingerprint="fp_other",
        is_active=True,
    )
    db.add(ver2)
    c3 = DocumentChunk(
        id=uuid.uuid4(),
        document_id=doc2.id,
        researcher_id=r2.id,
        index_version_id=ver2.id,
        chunk_index=0,
        chunk_text="Perovskite confidential data from researcher 2.",
        embedding=v1,  # Identical vector!
        page_number=1,
    )
    db.add(c3)
    db.commit()

    # Mock embed_query on LocalEmbeddingProvider to return [1.0, 0.0, ...]
    with patch(
        "backend.src.indexing.embedding.LocalEmbeddingProvider.embed_query"
    ) as mock_embed_query:
        mock_embed_query.return_value = [1.0] + [0.0] * 767

        res = client.get("/api/search/similarity?q=perovskite+efficiency&top_k=5")
        assert res.status_code == 200
        data = res.json()

        assert data["query"] == "perovskite efficiency"
        assert data["total_results"] == 2
        results = data["results"]

        # Top result must be c1 (highest similarity score)
        assert results[0]["chunk_id"] == str(c1.id)
        assert results[0]["similarity_score"] == 1.0
        assert results[0]["document_title"] == "perovskite_photovoltaics.pdf"
        assert results[0]["page_number"] == 3
        assert results[0]["section_name"] == "Results"
        assert results[0]["chunk_index"] == 0

        # Tenant isolation verified: researcher 2's chunk (c3) must NOT be present
        assert all(r["document_id"] != str(doc2.id) for r in results)
        assert all(r["chunk_id"] != str(c3.id) for r in results)
