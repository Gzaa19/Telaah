import pytest
from backend.src.indexing.chunker import ChunkingService


def test_chunking_size_and_overlap():
    chunker = ChunkingService(chunk_size=1200, chunk_overlap=150)
    # Generate long text > 3000 chars
    long_text = "This is a sentence explaining scientific discovery in renewable energy. " * 60
    chunks = chunker.chunk_text_only(long_text)

    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk) <= 1250  # reasonable boundary with word breaks


def test_chunking_with_page_metadata():
    chunker = ChunkingService(chunk_size=500, chunk_overlap=50)
    pages = [
        {"page_number": 1, "text": "Page one content about methodology. " * 15, "section_name": "Methods"},
        {"page_number": 2, "text": "Page two content showing empirical results. " * 15, "section_name": "Results"},
    ]

    chunks_with_meta = chunker.chunk_pages(pages)
    assert len(chunks_with_meta) >= 2

    # Check 0-based index
    for idx, c in enumerate(chunks_with_meta):
        assert c["chunk_index"] == idx
        assert c["page_number"] in [1, 2]
        assert c["section_name"] in ["Methods", "Results"]
        assert len(c["chunk_text"]) > 0
