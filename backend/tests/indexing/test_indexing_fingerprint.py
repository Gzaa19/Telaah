import pytest
from backend.src.indexing.fingerprint import ChecksumService


def test_document_checksum_sha256():
    service = ChecksumService()
    text1 = "Scientific text content."
    text2 = "Scientific text content."
    text3 = "Different content."

    cs1 = service.compute_document_checksum(text1)
    cs2 = service.compute_document_checksum(text2)
    cs3 = service.compute_document_checksum(text3)

    assert cs1 == cs2
    assert cs1 != cs3
    assert len(cs1) == 64  # SHA-256 hex length


def test_deterministic_index_fingerprint():
    service = ChecksumService()
    fp1 = service.compute_index_fingerprint(
        checksum="abcd1234abcd1234",
        model_name="intfloat/multilingual-e5-base",
        model_version="v1",
        dim=768,
        chunk_size=1200,
        chunk_overlap=150,
        preproc_version="v1",
    )
    fp2 = service.compute_index_fingerprint(
        checksum="abcd1234abcd1234",
        model_name="intfloat/multilingual-e5-base",
        model_version="v1",
        dim=768,
        chunk_size=1200,
        chunk_overlap=150,
        preproc_version="v1",
    )
    assert fp1 == fp2

    # Changing chunk_size changes fingerprint
    fp3 = service.compute_index_fingerprint(
        checksum="abcd1234abcd1234",
        model_name="intfloat/multilingual-e5-base",
        model_version="v1",
        dim=768,
        chunk_size=1000,
        chunk_overlap=150,
        preproc_version="v1",
    )
    assert fp1 != fp3
