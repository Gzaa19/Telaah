import asyncio
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer

from backend.src.core.config import settings


class LocalEmbeddingProvider:
    _instance: Optional["LocalEmbeddingProvider"] = None

    def __init__(
        self,
        model_name: Optional[str] = None,
        embedding_dim: Optional[int] = None,
        lazy_load: bool = True,
    ):
        self.model_name = model_name or settings.EMBEDDING_MODEL_NAME
        self.embedding_dim = embedding_dim or settings.EMBEDDING_DIMENSION
        self.model_version = "v1"
        self.model_commit_hash = "768-e5-base-local"
        self._model: Optional[SentenceTransformer] = None
        if not lazy_load:
            self._get_model()

    @classmethod
    def get_instance(cls) -> "LocalEmbeddingProvider":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _get_model(self) -> SentenceTransformer:
        if self._model is None:
            # Load local Hugging Face SentenceTransformer
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def embed_passages(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        if not texts:
            return []
        # Prefix convention for multilingual-e5: "passage: "
        prefixed_texts = [f"passage: {t}" for t in texts]
        model = self._get_model()
        embeddings = model.encode(
            prefixed_texts,
            batch_size=batch_size,
            show_progress_bar=False,
            normalize_embeddings=True,
        )
        return [e.tolist() if hasattr(e, "tolist") else list(e) for e in embeddings]

    async def embed_passages_async(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        # Run CPU-bound model inference in thread pool to prevent event loop blocking
        return await asyncio.to_thread(self.embed_passages, texts, batch_size)

    def embed_query(self, query: str) -> List[float]:
        # Prefix convention for multilingual-e5: "query: "
        prefixed_query = f"query: {query}"
        model = self._get_model()
        embedding = model.encode(
            [prefixed_query],
            show_progress_bar=False,
            normalize_embeddings=True,
        )[0]
        return embedding.tolist() if hasattr(embedding, "tolist") else list(embedding)

    async def embed_query_async(self, query: str) -> List[float]:
        return await asyncio.to_thread(self.embed_query, query)

    def validate_dimensions(
        self, vectors: List[List[float]], expected_dim: Optional[int] = None
    ) -> None:
        target_dim = expected_dim or self.embedding_dim
        for v in vectors:
            if len(v) != target_dim:
                raise ValueError(
                    f"Embedding dimension mismatch: expected {target_dim}, got {len(v)}"
                )

    def get_model_metadata(self) -> Dict[str, Any]:
        return {
            "model_name": self.model_name,
            "model_version": self.model_version,
            "model_commit_hash": self.model_commit_hash,
            "embedding_dimension": self.embedding_dim,
            "is_local": True,
        }
