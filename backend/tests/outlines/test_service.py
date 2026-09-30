import time
import uuid
import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException

from src.outlines.service import OutlineService, OutlineValidationError
from src.outlines.models import (
    PaperOutline,
    GenerationStatusEnum,
    OutlineLanguageEnum,
    ApprovalStatusEnum,
)
from src.documents.models import Document, ImportStatus


def test_validate_generate_request_non_indexed(db_session):
    researcher_id = uuid.uuid4()
    doc = Document(
        id=uuid.uuid4(),
        google_drive_id="drive-123",
        file_name="paper.pdf",
        file_type="pdf",
        import_status=ImportStatus.importing,
        researcher_id=researcher_id,
    )
    db_session.add(doc)
    db_session.commit()

    service = OutlineService(db=db_session)
    with pytest.raises(HTTPException) as exc_info:
        service.validate_generate_request(researcher_id=researcher_id, document_id=doc.id)
    assert exc_info.value.status_code == 400
    assert "not been fully indexed" in exc_info.value.detail


def test_assert_no_active_generation_conflict(db_session):
    researcher_id = uuid.uuid4()
    doc_id = uuid.uuid4()
    active_outline = PaperOutline(
        id=uuid.uuid4(),
        researcher_id=researcher_id,
        document_id=doc_id,
        template_id="icicos",
        generation_status=GenerationStatusEnum.generating,
        approval_status=ApprovalStatusEnum.draft,
    )
    db_session.add(active_outline)
    db_session.commit()

    service = OutlineService(db=db_session)
    with pytest.raises(HTTPException) as exc_info:
        service.assert_no_active_generation(document_id=doc_id)
    assert exc_info.value.status_code == 409
    assert "already in progress" in exc_info.value.detail


def test_run_generation_pipeline_duration_budget(db_session):
    """
    NFR-001 Verification: Ensure mock generation pipeline completes within < 45.0s budget.
    """
    researcher_id = uuid.uuid4()
    doc_id = uuid.uuid4()

    outline = PaperOutline(
        id=uuid.uuid4(),
        researcher_id=researcher_id,
        document_id=doc_id,
        template_id="icicos",
        generation_status=GenerationStatusEnum.preparing,
        approval_status=ApprovalStatusEnum.draft,
    )
    db_session.add(outline)
    db_session.commit()

    service = OutlineService(db=db_session)

    start_time = time.time()
    # Execute generation pipeline with mocked synthesizer
    with patch.object(service.synthesizer, "synthesize_field") as mock_synth:
        from src.outlines.llm_synthesizer import FieldResult
        mock_synth.return_value = FieldResult(
            content="Mocked field summary.",
            is_needs_input=False,
            referenced_chunk_ids=[],
        )
        service.run_generation_pipeline(outline.id)

    elapsed_time = time.time() - start_time
    assert elapsed_time < 45.0, f"Generation pipeline took {elapsed_time:.2f}s, exceeding 45.0s NFR-001 budget"

    # Verify status changed to ready
    updated = service.repository.get_outline_by_id(outline.id)
    assert updated.generation_status == GenerationStatusEnum.ready
    assert len(updated.sections) > 0
