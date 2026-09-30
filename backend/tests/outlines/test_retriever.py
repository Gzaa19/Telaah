import uuid
import pytest
from unittest.mock import MagicMock, patch
from backend.src.outlines.retriever import ChunkRetriever, ChunkContext


def test_retrieve_for_field_with_chunks():
    db_mock = MagicMock()
    retriever = ChunkRetriever(db=db_mock)

    chunk_id = uuid.uuid4()
    doc_id = uuid.uuid4()
    index_ver_id = uuid.uuid4()

    mock_row = MagicMock()
    mock_row.id = chunk_id
    mock_row.document_id = doc_id
    mock_row.chunk_text = "Background context from source literature."
    mock_row.page_number = 2

    # Mock cosine search to return mock chunk
    with patch.object(retriever, "_cosine_search", return_value=[mock_row]):
        with patch.object(retriever, "_embed_query", return_value=[0.1] * 768):
            results = retriever.retrieve_for_field(
                field_key="background",
                field_label="Background",
                field_guidance="Academic context",
                index_version_id=index_ver_id,
                top_k=3,
            )

    assert len(results) == 1
    assert results[0].chunk_id == chunk_id
    assert results[0].page_number == 2
    assert "Background context" in results[0].excerpt_text


def test_retrieve_for_field_empty():
    db_mock = MagicMock()
    retriever = ChunkRetriever(db=db_mock)
    index_ver_id = uuid.uuid4()

    with patch.object(retriever, "_cosine_search", return_value=[]):
        with patch.object(retriever, "_embed_query", return_value=[0.1] * 768):
            results = retriever.retrieve_for_field(
                field_key="unmatched_field",
                field_label="Unmatched",
                field_guidance="None",
                index_version_id=index_ver_id,
            )

    assert results == []
