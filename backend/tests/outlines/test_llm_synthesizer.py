import uuid
import pytest
from unittest.mock import MagicMock, patch
from backend.src.outlines.llm_synthesizer import LLMSynthesizer, FieldResult
from backend.src.outlines.retriever import ChunkContext
from backend.src.outlines.models import OutlineLanguageEnum


def test_synthesize_field_with_evidence():
    synthesizer = LLMSynthesizer()
    chunk_id = uuid.uuid4()
    chunks = [
        ChunkContext(
            chunk_id=chunk_id,
            page_number=3,
            excerpt_text="The study evaluates deep learning on scientific corpora.",
        )
    ]

    mock_llm_response = MagicMock()
    mock_llm_response.text = '{"content": "This paper examines deep learning models for scientific literature.", "is_needs_input": false, "referenced_chunk_ids": ["' + str(chunk_id) + '"]}'

    with patch.object(synthesizer, "_call_llm", return_value=mock_llm_response.text):
        result = synthesizer.synthesize_field(
            section_title="I. INTRODUCTION",
            field_key="background",
            field_label="Background",
            field_guidance="Context of the research",
            chunks=chunks,
            language=OutlineLanguageEnum.en_ieee,
        )

    assert isinstance(result, FieldResult)
    assert not result.is_needs_input
    assert "deep learning models" in result.content
    assert chunk_id in result.referenced_chunk_ids


def test_synthesize_field_no_evidence_fallback():
    synthesizer = LLMSynthesizer()
    # When zero chunks are passed, synthesizer must transparently return [NEEDS INPUT]
    result = synthesizer.synthesize_field(
        section_title="I. INTRODUCTION",
        field_key="research_gap",
        field_label="Research Gap",
        field_guidance="Unaddressed research areas",
        chunks=[],
        language=OutlineLanguageEnum.en_ieee,
    )

    assert result.is_needs_input
    assert result.content == "[NEEDS INPUT]"
    assert result.referenced_chunk_ids == []


def test_synthesize_field_language_selection():
    synthesizer = LLMSynthesizer()
    chunk_id = uuid.uuid4()
    chunks = [
        ChunkContext(
            chunk_id=chunk_id,
            page_number=1,
            excerpt_text="Sistem ini menghasilkan outline paper secara otomatis.",
        )
    ]

    with patch.object(synthesizer, "_call_llm", return_value='{"content": "Sistem ini menggunakan kecerdasan buatan.", "is_needs_input": false, "referenced_chunk_ids": []}') as mock_call:
        synthesizer.synthesize_field(
            section_title="I. INTRODUCTION",
            field_key="background",
            field_label="Background",
            field_guidance="Latar belakang riset",
            chunks=chunks,
            language=OutlineLanguageEnum.id_formal,
        )
        prompt_arg = mock_call.call_args[0][0]
        assert "Bahasa Indonesia" in prompt_arg
