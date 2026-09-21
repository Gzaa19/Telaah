import uuid
from unittest.mock import AsyncMock, MagicMock
import pytest

from backend.src.auth.models import ResearcherAccount
from backend.src.documents.models import Document, ImportStatus, FileType
from backend.src.documents.service import DocumentService, DuplicateDocumentError


@pytest.fixture
def researcher(db_session):
    account = ResearcherAccount(
        email="doc_researcher@univ.ac.id",
        full_name="Dr. Dokumen",
    )
    db_session.add(account)
    db_session.commit()
    db_session.refresh(account)
    return account


@pytest.fixture
def mock_arq_redis():
    mock = AsyncMock()
    mock.enqueue_job = AsyncMock(return_value=None)
    return mock


def test_enqueue_import_new_document(db_session, researcher, mock_arq_redis):
    service = DocumentService(db=db_session, redis_pool=mock_arq_redis)

    doc = service.enqueue_import(
        drive_file_id="drive-file-001",
        file_name="Deep Learning Survey.pdf",
        file_type=FileType.pdf,
        file_size_bytes=2048000,
        drive_md5_checksum="md5hash123",
        researcher_id=researcher.id,
        force_reimport=False,
    )

    assert doc.id is not None
    assert doc.google_drive_id == "drive-file-001"
    assert doc.file_name == "Deep Learning Survey.pdf"
    assert doc.import_status == ImportStatus.importing
    assert doc.researcher_id == researcher.id


def test_enqueue_import_duplicate_without_force(db_session, researcher, mock_arq_redis):
    service = DocumentService(db=db_session, redis_pool=mock_arq_redis)

    # First import
    service.enqueue_import(
        drive_file_id="drive-file-duplicate",
        file_name="Deep Learning Survey.pdf",
        file_type=FileType.pdf,
        researcher_id=researcher.id,
    )

    # Second import without force_reimport
    with pytest.raises(DuplicateDocumentError) as exc_info:
        service.enqueue_import(
            drive_file_id="drive-file-duplicate",
            file_name="Deep Learning Survey.pdf",
            file_type=FileType.pdf,
            researcher_id=researcher.id,
            force_reimport=False,
        )
    assert exc_info.value.existing_document_id is not None


def test_enqueue_import_duplicate_with_force_reimport(db_session, researcher, mock_arq_redis):
    service = DocumentService(db=db_session, redis_pool=mock_arq_redis)

    # First import
    first_doc = service.enqueue_import(
        drive_file_id="drive-file-force",
        file_name="Deep Learning Survey.pdf",
        file_type=FileType.pdf,
        researcher_id=researcher.id,
    )
    first_id = first_doc.id

    # Reimport with force_reimport=True
    reimported_doc = service.enqueue_import(
        drive_file_id="drive-file-force",
        file_name="Deep Learning Survey.pdf",
        file_type=FileType.pdf,
        researcher_id=researcher.id,
        force_reimport=True,
    )

    assert reimported_doc.id == first_id
    assert reimported_doc.import_status == ImportStatus.importing
