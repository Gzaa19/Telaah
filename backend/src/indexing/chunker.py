from typing import List, Dict, Any, Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter

from backend.src.core.config import settings


class ChunkingService:
    def __init__(
        self,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
    ):
        self.chunk_size = chunk_size or settings.CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
            keep_separator=True,
        )

    def chunk_text_only(self, text: str) -> List[str]:
        if not text:
            return []
        return self.splitter.split_text(text)

    def chunk_pages(self, pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        chunks_with_meta: List[Dict[str, Any]] = []
        chunk_index = 0

        for page in pages:
            page_text = page.get("text") or page.get("content") or ""
            if not page_text.strip():
                continue

            page_num = page.get("page_number")
            section_name = page.get("section_name")

            raw_chunks = self.splitter.split_text(page_text)
            for rc in raw_chunks:
                text_clean = rc.strip()
                if not text_clean:
                    continue
                chunks_with_meta.append({
                    "chunk_index": chunk_index,
                    "chunk_text": text_clean,
                    "page_number": page_num,
                    "section_name": section_name,
                })
                chunk_index += 1

        return chunks_with_meta

    def get_configuration(self) -> Dict[str, Any]:
        return {
            "chunk_size": self.chunk_size,
            "chunk_overlap": self.chunk_overlap,
            "splitter_type": "recursive_character",
        }
