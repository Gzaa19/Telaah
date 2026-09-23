import uuid
from typing import Optional, List, Dict, Any, Tuple
from sqlmodel import Session

from backend.src.core.config import settings
from backend.src.documents.models import Document, ExtractedText
from backend.src.indexing.models import DocumentIndexVersion, IndexingJob
from backend.src.indexing.repository import IndexingRepository, ChunkMetadataRepository
from backend.src.indexing.cleaner import TextCleaningService
from backend.src.indexing.chunker import ChunkingService
from backend.src.indexing.embedding import LocalEmbeddingProvider
from backend.src.indexing.fingerprint import ChecksumService


class DocumentNotFoundError(Exception):
    pass


class InvalidDocumentStatusError(Exception):
    pass


class DuplicateFingerprintError(Exception):
    def __init__(self, existing_version: DocumentIndexVersion):
        self.existing_version = existing_version
        super().__init__(f"Duplicate fingerprint already indexed: {existing_version.id}")


class DocumentIndexingService:
    def __init__(
        self,
        db: Session,
        repo: Optional[IndexingRepository] = None,
        chunk_repo: Optional[ChunkMetadataRepository] = None,
        cleaner: Optional[TextCleaningService] = None,
        chunker: Optional[ChunkingService] = None,
        embedder: Optional[LocalEmbeddingProvider] = None,
        checksum_svc: Optional[ChecksumService] = None,
    ):
        self.db = db
        self.repo = repo or IndexingRepository(db=db)
        self.chunk_repo = chunk_repo or ChunkMetadataRepository(db=db)
        self.cleaner = cleaner or TextCleaningService()
        self.chunker = chunker or ChunkingService()
        self.embedder = embedder or LocalEmbeddingProvider.get_instance()
        self.checksum_svc = checksum_svc or ChecksumService()

    def validate_document_access(
        self, doc_id: uuid.UUID, researcher_id: uuid.UUID
    ) -> Document:
        doc = self.repo.get_document_with_access(doc_id, researcher_id)
        if not doc:
            raise DocumentNotFoundError("Document not found or access denied.")
        return doc

    def validate_extracted_status(self, doc: Document) -> None:
        # Document import_status can be enum or str
        status_val = str(doc.import_status.value if hasattr(doc.import_status, "value") else doc.import_status)
        if status_val != "extracted":
            raise InvalidDocumentStatusError(
                f"Document must have status 'extracted' to be indexed. Current status: '{status_val}'."
            )

    def create_and_enqueue_job(
        self,
        doc_id: Optional[uuid.UUID] = None,
        researcher_id: Optional[uuid.UUID] = None,
        is_retry: bool = False,
        document_id: Optional[uuid.UUID] = None,
    ) -> Tuple[IndexingJob, DocumentIndexVersion]:
        target_doc_id = doc_id or document_id
        if not target_doc_id or not researcher_id:
            raise ValueError("document_id and researcher_id are required")
        doc = self.validate_document_access(target_doc_id, researcher_id)
        self.validate_extracted_status(doc)

        extracted = self.repo.get_extracted_text(target_doc_id)
        raw_text = extracted.full_text if extracted else ""
        source_checksum = self.checksum_svc.compute_document_checksum(raw_text)

        model_meta = self.embedder.get_model_metadata()
        chunk_config = self.chunker.get_configuration()

        fingerprint = self.checksum_svc.compute_index_fingerprint(
            checksum=source_checksum,
            model_name=model_meta["model_name"],
            model_version=model_meta["model_version"],
            dim=model_meta["embedding_dimension"],
            chunk_size=chunk_config["chunk_size"],
            chunk_overlap=chunk_config["chunk_overlap"],
            preproc_version="v1",
        )

        existing = self.repo.find_by_fingerprint(fingerprint)
        if existing and existing.status in ("indexed", "completed") and not is_retry:
            raise DuplicateFingerprintError(existing)

        # Create new index version (or reuse if retrying failed)
        if existing and existing.status == "failed" and is_retry:
            version = existing
            version.status = "queued"
            version.failure_reason = None
            self.db.add(version)
            self.db.commit()
            self.db.refresh(version)
        else:
            version = self.repo.create_index_version(
                document_id=target_doc_id,
                researcher_id=researcher_id,
                model_name=model_meta["model_name"],
                model_version=model_meta["model_version"],
                model_commit_hash=model_meta["model_commit_hash"],
                embedding_dimension=model_meta["embedding_dimension"],
                chunk_size=chunk_config["chunk_size"],
                chunk_overlap=chunk_config["chunk_overlap"],
                source_checksum=source_checksum,
                index_fingerprint=fingerprint,
                is_active=False,
                status="queued",
            )

        job = self.repo.create_indexing_job(
            document_id=target_doc_id,
            researcher_id=researcher_id,
            index_version_id=version.id,
            max_retries=settings.INDEXING_MAX_RETRIES,
        )

        return job, version

    def get_job_status(
        self, job_id: uuid.UUID, researcher_id: uuid.UUID
    ) -> Optional[IndexingJob]:
        job = self.repo.get_job_by_id(job_id)
        if not job or job.researcher_id != researcher_id:
            return None
        return job

    def get_index_status(
        self, doc_id: uuid.UUID, researcher_id: uuid.UUID
    ) -> Optional[Dict[str, Any]]:
        return self.repo.get_job_with_summary(doc_id, researcher_id)

    def get_index_summary(
        self, doc_id: uuid.UUID, researcher_id: uuid.UUID
    ) -> Optional[Dict[str, Any]]:
        doc = self.repo.get_document_with_access(doc_id, researcher_id)
        if not doc:
            return None
        version = self.repo.get_active_index_version(doc_id) or self.repo.get_latest_index_version(doc_id)
        if not version:
            return None
        return {
            "document_id": doc.id,
            "file_name": doc.file_name,
            "index_version_id": version.id,
            "status": version.status,
            "model_name": version.model_name,
            "model_version": version.model_version,
            "embedding_dimension": version.embedding_dimension,
            "chunk_size": version.chunk_size,
            "chunk_overlap": version.chunk_overlap,
            "total_chunks": version.total_chunks,
            "source_checksum": version.source_checksum,
            "completed_at": version.completed_at,
            "is_active": version.is_active,
        }

    def request_reindex(
        self, doc_id: uuid.UUID, researcher_id: uuid.UUID
    ) -> Tuple[IndexingJob, DocumentIndexVersion, Optional[uuid.UUID]]:
        doc = self.validate_document_access(doc_id, researcher_id)
        self.validate_extracted_status(doc)

        active_version = self.repo.get_active_index_version(doc_id)
        archived_id = None
        if active_version:
            archived_id = active_version.id
            self.repo.archive_index_version(active_version.id)

        job, version = self.create_and_enqueue_job(
            doc_id=doc_id,
            researcher_id=researcher_id,
            is_retry=False,
        )
        return job, version, archived_id

    def similarity_search(
        self,
        query: str,
        researcher_id: uuid.UUID,
        doc_id: Optional[uuid.UUID] = None,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        query_vector = self.embedder.embed_query(query)
        return self.chunk_repo.similarity_search(
            query_vector=query_vector,
            researcher_id=researcher_id,
            doc_id=doc_id,
            top_k=top_k,
        )
