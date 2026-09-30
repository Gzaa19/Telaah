import json
import logging
import os
import uuid
from typing import List, Optional
from pydantic import BaseModel
import google.generativeai as genai

from backend.src.outlines.models import OutlineLanguageEnum
from backend.src.outlines.retriever import ChunkContext

logger = logging.getLogger(__name__)


class FieldResult(BaseModel):
    content: str
    is_needs_input: bool
    referenced_chunk_ids: List[uuid.UUID] = []


class LLMSynthesizer:
    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-2.0-flash"):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model_name = model_name
        self._model = None

    def _get_model(self):
        if self._model is None:
            if self.api_key:
                genai.configure(api_key=self.api_key)
            self._model = genai.GenerativeModel(
                model_name=self.model_name,
                generation_config={"response_mime_type": "application/json"},
            )
        return self._model

    def _call_llm(self, prompt: str) -> str:
        model = self._get_model()
        response = model.generate_content(prompt)
        return response.text if hasattr(response, "text") else str(response)

    def synthesize_field(
        self,
        section_title: str,
        field_key: str,
        field_label: str,
        field_guidance: str,
        chunks: List[ChunkContext],
        language: OutlineLanguageEnum = OutlineLanguageEnum.en_ieee,
    ) -> FieldResult:
        """
        Synthesizes a single field based on retrieved chunk contexts with strict anti-hallucination constraints.
        """
        # Strict zero-evidence fallback: if no chunks are provided, never hallucinate
        if not chunks:
            return FieldResult(
                content="[NEEDS INPUT]",
                is_needs_input=True,
                referenced_chunk_ids=[],
            )

        lang_instruction = (
            "Write the content strictly in formal academic Indonesian (Bahasa Indonesia baku)."
            if language == OutlineLanguageEnum.id_formal
            else "Write the content strictly in formal academic English suitable for an IEEE conference manuscript."
        )

        formatted_chunks = []
        valid_chunk_ids = set()
        for idx, c in enumerate(chunks, start=1):
            valid_chunk_ids.add(str(c.chunk_id))
            page_info = f" (Page {c.page_number})" if c.page_number else ""
            formatted_chunks.append(f"--- CHUNK {idx} [ID: {c.chunk_id}]{page_info} ---\n{c.excerpt_text}")

        chunks_text = "\n\n".join(formatted_chunks)

        prompt = f"""You are a scientific manuscript synthesizer for an IEEE conference paper.
Your task is to synthesize the field '{field_label}' for section '{section_title}'.

Guidance for this field:
{field_guidance}

Language Requirement:
{lang_instruction}

Critical Anti-Hallucination & Provenance Rules:
1. Base your synthesis SOLELY on the provided chunks below.
2. DO NOT invent experimental numbers, metric values, claims, or citation references not explicitly stated in the chunks.
3. If the provided chunks do NOT contain sufficient evidence or facts to answer this field, return "[NEEDS INPUT]" for content and set is_needs_input to true.
4. Keep the summary concise (1–3 directed sentences).
5. Preserve technical terms, algorithm names, model architectures, and proper names without alteration.
6. Return only valid JSON conforming to the schema below.

JSON Schema:
{{
  "content": "string (1-3 sentences or [NEEDS INPUT])",
  "is_needs_input": boolean,
  "referenced_chunk_ids": ["string (UUIDs of chunks that directly support the content)"]
}}

SOURCE CHUNKS:
{chunks_text}
"""

        try:
            raw_response = self._call_llm(prompt)
            data = json.loads(raw_response)

            content = str(data.get("content", "")).strip()
            is_needs_input = bool(data.get("is_needs_input", False))

            if not content or content == "[NEEDS INPUT]" or is_needs_input:
                return FieldResult(
                    content="[NEEDS INPUT]",
                    is_needs_input=True,
                    referenced_chunk_ids=[],
                )

            # Filter returned chunk IDs to only those that were actually provided
            raw_ref_ids = data.get("referenced_chunk_ids", [])
            valid_refs: List[uuid.UUID] = []
            for r in raw_ref_ids:
                r_str = str(r).strip()
                if r_str in valid_chunk_ids:
                    try:
                        valid_refs.append(uuid.UUID(r_str))
                    except ValueError:
                        pass

            # If content was produced but no valid chunks were referenced, fallback to first chunk if available
            if not valid_refs and chunks:
                valid_refs.append(chunks[0].chunk_id)

            return FieldResult(
                content=content,
                is_needs_input=False,
                referenced_chunk_ids=valid_refs,
            )

        except Exception as e:
            logger.warning(f"LLM synthesis failed or returned invalid JSON for field '{field_key}': {e}. Falling back to [NEEDS INPUT].")
            return FieldResult(
                content="[NEEDS INPUT]",
                is_needs_input=True,
                referenced_chunk_ids=[],
            )
