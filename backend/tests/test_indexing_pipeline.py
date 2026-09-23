import uuid
from datetime import datetime, timezone
import pytest
from unittest.mock import patch, MagicMock
from sqlmodel import Session, select

from backend.src.auth.models import ResearcherAccount
from backend.src.documents.models import Document, FileType, ImportStatus, ExtractedText, ExtractedPage
from backend.src.indexing.models import DocumentIndexVersion, DocumentChunk, IndexingJob
from backend.src.indexing.service import DocumentIndexingService
from backend.src.indexing.worker import run_indexing_pipeline


@pytest.fixture
def sample_extracted_doc(db_session: Session):
    researcher = ResearcherAccount(
        id=uuid.uuid4(),
        email="pipeline_test@example.com",
        full_name="Pipeline Tester",
        is_active=True,
    )
    db_session.add(researcher)

    doc = Document(
        id=uuid.uuid4(),
        google_drive_id="drive_pipe_1",
        file_name="solar_cells.pdf",
        file_type=FileType.pdf,
        import_status=ImportStatus.extracted,
        researcher_id=researcher.id,
    )
    db_session.add(doc)

    extracted = ExtractedText(
        id=uuid.uuid4(),
        document_id=doc.id,
        full_text="Perovskite solar cells have achieved efficiencies exceeding 25% in laboratory conditions.\n\nSection 2: Experimental Methodology\nSamples were fabricated under controlled ambient humidity.",
        total_pages=2,
    )
    db_session.add(extracted)

    p1 = ExtractedPage(
        id=uuid.uuid4(),
        extracted_text_id=extracted.id,
        page_number=1,
        content="Perovskite solar cells have achieved efficiencies exceeding 25% in laboratory conditions.",
    )
    p2 = ExtractedPage(
        id=uuid.uuid4(),
        extracted_text_id=extracted.id,
        page_number=2,
        content="Section 2: Experimental Methodology\nSamples were fabricated under controlled ambient humidity.",
    )
    db_session.add(p1)
    db_session.add(p2)
    db_session.commit()

    return researcher, doc


@pytest.mark.anyio
async def test_run_indexing_pipeline_end_to_end(sample_extracted_doc, db_session: Session):
    researcher, doc = sample_extracted_doc

    # Enqueue job
    indexing_service = DocumentIndexingService(db_session)
    job, version = indexing_service.create_and_enqueue_job(
        document_id=doc.id,
        researcher_id=researcher.id,
    )

    dummy_vector = [0.05] * 768

    with patch(
        "backend.src.indexing.worker.LocalEmbeddingProvider.get_instance"
    ) as mock_get_instance:
        mock_provider = MagicMock()
        mock_provider.embed_passages.side_effect = lambda texts: [dummy_vector for _ in texts]
        mock_provider.validate_dimensions.return_value = None
        mock_get_instance.return_value = mock_provider

        await run_indexing_pipeline(
            job_id=job.id,
            session=db_session,
        )

    # Verify Job state
    job_record = db_session.get(IndexingJob, job.id)
    assert job_record is not None
    assert job_record.status == "indexed"
    assert job_record.completed_at is not None

    # Verify Index Version state
    version_record = db_session.get(DocumentIndexVersion, version.id)
    assert version_record is not None
    assert version_record.status == "indexed"
    assert version_record.is_active is True
    assert version_record.total_chunks is not None
    assert version_record.total_chunks > 0

    # Verify Chunks stored
    chunks = db_session.exec(
        select(DocumentChunk).where(DocumentChunk.index_version_id == version.id)
    ).all()
    assert len(chunks) == version.total_chunks
    assert all(len(c.embedding) == 768 for c in chunks)
    assert chunks[0].page_number is not None
