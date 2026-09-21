from unittest.mock import patch, MagicMock
import pytest
from backend.src.drive.drive_service import DriveService


@pytest.fixture
def drive_service():
    return DriveService()


def test_list_files_root_folder(drive_service):
    mock_service = MagicMock()
    mock_files = mock_service.files.return_value
    mock_list = mock_files.list.return_value
    mock_list.execute.return_value = {
        "files": [
            {
                "id": "file-pdf-1",
                "name": "Literature Review.pdf",
                "mimeType": "application/pdf",
                "size": "1048576",
                "modifiedTime": "2026-09-15T10:00:00Z",
            },
            {
                "id": "folder-1",
                "name": "Research Papers",
                "mimeType": "application/vnd.google-apps.folder",
                "modifiedTime": "2026-09-10T08:00:00Z",
            },
            {
                "id": "file-img-1",
                "name": "chart.png",
                "mimeType": "image/png",
                "size": "50000",
                "modifiedTime": "2026-09-12T12:00:00Z",
            }
        ],
        "nextPageToken": "token-page-2"
    }

    with patch.object(drive_service, "_build_drive_client", return_value=mock_service):
        response = drive_service.list_files(
            access_token="mock-token",
            folder_id="root",
            page_size=50
        )

        assert len(response.files) == 3
        # PDF file check
        pdf_file = next(f for f in response.files if f.id == "file-pdf-1")
        assert pdf_file.file_type == "pdf"
        assert pdf_file.can_import is True
        assert pdf_file.is_folder is False

        # Folder check
        folder = next(f for f in response.files if f.id == "folder-1")
        assert folder.file_type is None
        assert folder.can_import is False
        assert folder.is_folder is True

        # Non-importable file check
        img_file = next(f for f in response.files if f.id == "file-img-1")
        assert img_file.file_type is None
        assert img_file.can_import is False

        assert response.next_page_token == "token-page-2"
        assert len(response.folder_path) >= 1
        assert response.folder_path[0]["id"] == "root"


def test_list_files_with_search_query(drive_service):
    mock_service = MagicMock()
    mock_files = mock_service.files.return_value
    mock_list = mock_files.list.return_value
    mock_list.execute.return_value = {
        "files": [
            {
                "id": "file-docx-1",
                "name": "Thesis Draft.docx",
                "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "size": "204800",
                "modifiedTime": "2026-09-18T14:00:00Z",
            }
        ],
    }

    with patch.object(drive_service, "_build_drive_client", return_value=mock_service):
        response = drive_service.list_files(
            access_token="mock-token",
            query="Thesis",
            folder_id="root",
        )

        assert len(response.files) == 1
        assert response.files[0].name == "Thesis Draft.docx"
        assert response.files[0].file_type == "docx"
        assert response.files[0].can_import is True
        # Verify search query passed to files().list()
        call_kwargs = mock_files.list.call_args[1]
        assert "name contains 'Thesis'" in call_kwargs["q"]
