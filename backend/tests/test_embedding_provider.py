import pytest
from unittest.mock import MagicMock, patch
from backend.src.indexing.embedding import LocalEmbeddingProvider


def test_passage_prefix_convention():
    provider = LocalEmbeddingProvider(model_name="mock-model", embedding_dim=768)
    # Mock underlying model encode
    provider._model = MagicMock()
    provider._model.encode.return_value = [[0.1] * 768]

    vectors = provider.embed_passages(["Sample scientific paragraph."])
    assert len(vectors) == 1
    assert len(vectors[0]) == 768

    # Verify prefix "passage: " was passed to encoder
    args, kwargs = provider._model.encode.call_args
    passed_texts = args[0]
    assert passed_texts[0].startswith("passage: ")
    assert "Sample scientific paragraph." in passed_texts[0]


def test_query_prefix_convention():
    provider = LocalEmbeddingProvider(model_name="mock-model", embedding_dim=768)
    provider._model = MagicMock()
    provider._model.encode.return_value = [[0.05] * 768]

    vector = provider.embed_query("machine learning classification")
    assert len(vector) == 768

    args, kwargs = provider._model.encode.call_args
    passed_texts = args[0]
    assert passed_texts[0].startswith("query: ")
    assert "machine learning classification" in passed_texts[0]


def test_dimension_validation():
    provider = LocalEmbeddingProvider(model_name="mock-model", embedding_dim=768)
    valid_vectors = [[0.1] * 768, [0.2] * 768]
    provider.validate_dimensions(valid_vectors, expected_dim=768)

    invalid_vectors = [[0.1] * 512]
    with pytest.raises(ValueError, match="Embedding dimension mismatch"):
        provider.validate_dimensions(invalid_vectors, expected_dim=768)


def test_gemini_api_strictly_forbidden():
    # Constitution Principle 2 & FR-010: strictly local embedding, no Gemini API
    provider = LocalEmbeddingProvider(model_name="intfloat/multilingual-e5-base", embedding_dim=768)
    metadata = provider.get_model_metadata()
    assert "gemini" not in metadata["model_name"].lower()
    assert "google" not in metadata["model_name"].lower()
    assert metadata["is_local"] is True
