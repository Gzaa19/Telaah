import math
import uuid
from typing import List, Optional
from pydantic import BaseModel
from sqlmodel import Session, select

from backend.src.indexing.models import DocumentChunk
from backend.src.indexing.embedding import LocalEmbeddingProvider


class ChunkContext(BaseModel):
    chunk_id: uuid.UUID
    document_id: Optional[uuid.UUID] = None
    page_number: Optional[int] = None
    excerpt_text: str


class ChunkRetriever:
    def __init__(self, db: Session, embedding_provider: Optional[LocalEmbeddingProvider] = None):
        self.db = db
        self.embedding_provider = embedding_provider

    def _get_embedding_provider(self) -> LocalEmbeddingProvider:
        if self.embedding_provider is None:
            self.embedding_provider = LocalEmbeddingProvider.get_instance()
        return self.embedding_provider

    def _embed_query(self, query_text: str) -> List[float]:
        provider = self._get_embedding_provider()
        return provider.embed_query(query_text)

    def _cosine_search(
        self,
        query_embedding: List[float],
        index_version_id: uuid.UUID,
        top_k: int = 5,
    ) -> List[DocumentChunk]:
        is_sqlite = False
        try:
            bind = self.db.get_bind()
            if bind and bind.dialect.name == "sqlite":
                is_sqlite = True
        except Exception:
            pass

        if is_sqlite:
            def cosine_sim(v1, v2):
                if not v1 or not v2:
                    return 0.0
                dot = sum(a * b for a, b in zip(v1, v2))
                norm1 = math.sqrt(sum(a * a for a in v1))
                norm2 = math.sqrt(sum(b * b for b in v2))
                return (dot / (norm1 * norm2)) if (norm1 and norm2) else 0.0

            statement = select(DocumentChunk).where(
                DocumentChunk.index_version_id == index_version_id
            )
            chunks = list(self.db.exec(statement).all())
            scored = [(c, cosine_sim(c.embedding, query_embedding)) for c in chunks]
            scored.sort(key=lambda x: x[1], reverse=True)
            return [c for c, _ in scored[:top_k]]
        else:
            statement = (
                select(DocumentChunk)
                .where(DocumentChunk.index_version_id == index_version_id)
                .order_by(DocumentChunk.embedding.cosine_distance(query_embedding))
                .limit(top_k)
            )
            return list(self.db.exec(statement).all())

    def retrieve_for_field(
        self,
        field_key: str,
        field_label: str,
        field_guidance: str,
        index_version_id: uuid.UUID,
        top_k: int = 5,
    ) -> List[ChunkContext]:
        query_text = f"{field_label}: {field_guidance}".strip()
        query_embedding = self._embed_query(query_text)
        chunks = self._cosine_search(
            query_embedding=query_embedding,
            index_version_id=index_version_id,
            top_k=top_k,
        )

        results: List[ChunkContext] = []
        for c in chunks:
            text = c.chunk_text.strip()
            # Trim to max 300 chars for excerpt
            excerpt = text[:300] + "..." if len(text) > 300 else text
            results.append(
                ChunkContext(
                    chunk_id=c.id,
                    document_id=c.document_id,
                    page_number=c.page_number,
                    excerpt_text=excerpt,
                )
            )
        return results
