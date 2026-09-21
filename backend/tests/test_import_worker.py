import uuid
from unittest.mock import patch, MagicMock, AsyncMock
import pytest

from backend.src.documents.models import Document, ImportStatus, FileType
from backend.src.workers.import_task import import_document_task


@pytest.mark.anyio
async def test_import_document_task_success():
    ctx = {
        "redis": AsyncMock(),
    }
    doc_id = uuid.uuid4()
    researcher_id = uuid.uuid4()

    mock_doc = Document(
        id=doc_id,
        google_drive_id="drive-file-123",
        file_name="Research.pdf",
        file_type=FileType.pdf,
        import_status=ImportStatus.importing,
        researcher_id=researcher_id,
    )

    mock_extraction = MagicMock()
    mock_extraction.full_text = "Full extracted research text"
    mock_extraction.total_pages = 2
    mock_extraction.pages = [
        {"page_number": 1, "content": "Page 1 content"},
        {"page_number": 2, "content": "Page 2 content"},
    ]

    with patch("backend.src.workers.import_task.get_session") as mock_get_session, \
         patch("backend.src.drive.token_service.DriveTokenService.get_valid_access_token", return_value="mock-token"), \
         patch("backend.src.drive.drive_service.DriveService.download_file", return_value=MagicMock()), \
         patch("backend.src.documents.extractor.TextExtractor.extract_text", return_value=mock_extraction), \
         patch("backend.src.documents.repository.DocumentRepository.get_by_id", return_value=mock_doc), \
         patch("backend.src.documents.repository.DocumentRepository.update_status") as mock_update_status, \
         patch("backend.src.documents.repository.DocumentRepository.save_extracted_text") as mock_save_text:

        mock_session = MagicMock()
        mock_get_session.return_value.__enter__.return_value = mock_session

        await import_document_task(ctx, str(doc_id), str(researcher_id))

        # Verify status progressed to extracted
        assert any(
            call.kwargs.get("status") == ImportStatus.extracted
            or (len(call.args) > 1 and call.args[1] == ImportStatus.extracted)
            for call in mock_update_status.call_args_list
        )
        # Verify text was saved
        mock_save_text.assert_called_once()
        # Verify UC-03 indexing job was enqueued
        ctx["redis"].enqueue_job.assert_called_with("index_document_task", str(doc_id))
