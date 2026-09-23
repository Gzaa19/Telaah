import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlmodel import Session, select, desc
import sqlalchemy as sa

from backend.src.documents.models import Document, ExtractedText, ExtractedPage
from backend.src.indexing.models import DocumentIndexVersion, DocumentChunk, IndexingJob


class IndexingRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_document_with_access(
        self, doc_id: uuid.UUID, researcher_id: uuid.UUID
    ) -> Optional[Document]:
        statement = select(Document).where(
            Document.id == doc_id,
            Document.researcher_id == researcher_id,
        )
        return self.db.exec(statement).first()

    def get_extracted_text(self, doc_id: uuid.UUID) -> Optional[ExtractedText]:
        statement = select(ExtractedText).where(ExtractedText.document_id == doc_id)
        return self.db.exec(statement).first()

    def get_extracted_pages(self, doc_id: uuid.UUID) -> List[ExtractedPage]:
        extracted_text = self.get_extracted_text(doc_id)
        if not extracted_text:
            return []
        statement = (
            select(ExtractedPage)
            .where(ExtractedPage.extracted_text_id == extracted_text.id)
            .order_by(ExtractedPage.page_number)
        )
        return list(self.db.exec(statement).all())

    def find_by_fingerprint(self, fingerprint: str) -> Optional[DocumentIndexVersion]:
        statement = select(DocumentIndexVersion).where(
            DocumentIndexVersion.index_fingerprint == fingerprint
        )
        return self.db.exec(statement).first()

    def get_active_index_version(self, doc_id: uuid.UUID) -> Optional[DocumentIndexVersion]:
        statement = select(DocumentIndexVersion).where(
            DocumentIndexVersion.document_id == doc_id,
            DocumentIndexVersion.is_active == True,
        )
        return self.db.exec(statement).first()

    def get_latest_index_version(self, doc_id: uuid.UUID) -> Optional[DocumentIndexVersion]:
        statement = (
            select(DocumentIndexVersion)
            .where(DocumentIndexVersion.document_id == doc_id)
            .order_by(desc(DocumentIndexVersion.created_at))
        )
        return self.db.exec(statement).first()

    def create_index_version(
        self,
        document_id: uuid.UUID,
        researcher_id: uuid.UUID,
        model_name: str,
        model_version: str,
        model_commit_hash: str,
        embedding_dimension: int,
        chunk_size: int,
        chunk_overlap: int,
        source_checksum: str,
        index_fingerprint: str,
        is_active: bool = False,
        status: str = "queued",
    ) -> DocumentIndexVersion:
        version = DocumentIndexVersion(
            document_id=document_id,
            researcher_id=researcher_id,
            model_name=model_name,
            model_version=model_version,
            model_commit_hash=model_commit_hash,
            embedding_dimension=embedding_dimension,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            source_checksum=source_checksum,
            index_fingerprint=index_fingerprint,
            is_active=is_active,
            status=status,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(version)
        self.db.commit()
        self.db.refresh(version)
        return version

    def create_indexing_job(
        self,
        document_id: uuid.UUID,
        researcher_id: uuid.UUID,
        index_version_id: uuid.UUID,
        max_retries: int = 3,
    ) -> IndexingJob:
        now = datetime.now(timezone.utc)
        job = IndexingJob(
            document_id=document_id,
            researcher_id=researcher_id,
            index_version_id=index_version_id,
            status="queued",
            current_stage=None,
            max_retries=max_retries,
            enqueued_at=now,
            heartbeat_at=now,
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def get_job_by_id(self, job_id: uuid.UUID) -> Optional[IndexingJob]:
        statement = select(IndexingJob).where(IndexingJob.id == job_id)
        return self.db.exec(statement).first()

    def get_latest_job_for_document(self, doc_id: uuid.UUID) -> Optional[IndexingJob]:
        statement = (
            select(IndexingJob)
            .where(IndexingJob.document_id == doc_id)
            .order_by(desc(IndexingJob.enqueued_at))
        )
        return self.db.exec(statement).first()

    def update_job_status(
        self,
        job_id: uuid.UUID,
        status: str,
        stage: Optional[str] = None,
        failure_reason: Optional[str] = None,
        heartbeat: bool = True,
    ) -> Optional[IndexingJob]:
        job = self.get_job_by_id(job_id)
        if not job:
            return None

        now = datetime.now(timezone.utc)
        job.status = status
        if stage is not None:
            job.current_stage = stage
        if failure_reason is not None:
            job.failure_reason = failure_reason
        if heartbeat:
            job.heartbeat_at = now

        if status == "cleaning" and job.started_at is None:
            job.started_at = now
        elif status in ("indexed", "completed", "failed"):
            job.completed_at = now

        self.db.add(job)

        # Update index version status in sync
        version = self.db.exec(
            select(DocumentIndexVersion).where(DocumentIndexVersion.id == job.index_version_id)
        ).first()
        if version:
            version.status = status
            if failure_reason is not None:
                version.failure_reason = failure_reason
            if status == "cleaning" and version.started_at is None:
                version.started_at = now
            elif status in ("indexed", "completed", "failed"):
                version.completed_at = now
                if status in ("indexed", "completed"):
                    version.is_active = True
            self.db.add(version)

        self.db.commit()
        self.db.refresh(job)
        return job

    def save_chunks_transactional(
        self,
        chunks_data: List[Dict[str, Any]],
        index_version_id: uuid.UUID,
    ) -> int:
        now = datetime.now(timezone.utc)
        chunk_objects = []
        for c in chunks_data:
            chunk = DocumentChunk(
                document_id=c["document_id"],
                researcher_id=c["researcher_id"],
                index_version_id=index_version_id,
                chunk_index=c["chunk_index"],
                chunk_text=c["chunk_text"],
                embedding=c["embedding"],
                page_number=c.get("page_number"),
                section_name=c.get("section_name"),
                source_metadata=c.get("source_metadata", {}),
                created_at=now,
            )
            chunk_objects.append(chunk)

        self.db.add_all(chunk_objects)

        # Update total chunks in index version
        version = self.db.exec(
            select(DocumentIndexVersion).where(DocumentIndexVersion.id == index_version_id)
        ).first()
        if version:
            version.total_chunks = len(chunk_objects)
            self.db.add(version)

        self.db.commit()
        return len(chunk_objects)

    def archive_index_version(self, version_id: uuid.UUID) -> bool:
        version = self.db.exec(
            select(DocumentIndexVersion).where(DocumentIndexVersion.id == version_id)
        ).first()
        if not version:
            return False

        version.is_active = False
        version.status = "archived"
        self.db.add(version)
        self.db.commit()
        return True

    def get_job_with_summary(
        self, doc_id: uuid.UUID, researcher_id: uuid.UUID
    ) -> Optional[Dict[str, Any]]:
        doc = self.get_document_with_access(doc_id, researcher_id)
        if not doc:
            return None

        job = self.get_latest_job_for_document(doc_id)
        version = self.get_active_index_version(doc_id) or self.get_latest_index_version(doc_id)

        status = job.status if job else (version.status if version else "not_indexed")
        stage = job.current_stage if job else None
        total_chunks = version.total_chunks if version else None
        model_name = version.model_name if version else None
        embedding_dim = version.embedding_dimension if version else None
        completed_at = job.completed_at if job else (version.completed_at if version else None)
        failure_reason = job.failure_reason if job else (version.failure_reason if version else None)

        return {
            "document_id": doc.id,
            "file_name": doc.file_name,
            "status": status,
            "stage": stage,
            "total_chunks": total_chunks,
            "model_name": model_name,
            "embedding_dimension": embedding_dim,
            "completed_at": completed_at,
            "failure_reason": failure_reason,
        }

    def get_stale_jobs(self, threshold_minutes: int = 5) -> List[IndexingJob]:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=threshold_minutes)
        statement = select(IndexingJob).where(
            IndexingJob.status.notin_(["indexed", "completed", "failed", "archived"]),
            IndexingJob.heartbeat_at < cutoff,
        )
        return list(self.db.exec(statement).all())


class ChunkMetadataRepository:
    def __init__(self, db: Session):
        self.db = db

    def similarity_search(
        self,
        query_vector: List[float],
        researcher_id: uuid.UUID,
        doc_id: Optional[uuid.UUID] = None,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        # Using pgvector cosine distance operator <=>
        # Cosine similarity score = 1 - (embedding <=> query_vector)
        distance_expr = DocumentChunk.embedding.cosine_distance(query_vector)

        statement = (
            select(
                DocumentChunk,
                (1 - distance_expr).label("similarity_score"),
                Document.file_name.label("document_title"),
            )
            .join(Document, Document.id == DocumentChunk.document_id)
            .join(
                DocumentIndexVersion,
                DocumentIndexVersion.id == DocumentChunk.index_version_id,
            )
            .where(
                DocumentChunk.researcher_id == researcher_id,
                DocumentIndexVersion.is_active == True,
            )
        )

        if doc_id:
            statement = statement.where(DocumentChunk.document_id == doc_id)

        statement = statement.order_by(distance_expr).limit(top_k)

        results = self.db.exec(statement).all()
        items = []
        for chunk, score, title in results:
            items.append({
                "chunk_id": chunk.id,
                "chunk_index": chunk.chunk_index,
                "similarity_score": round(float(score), 4),
                "chunk_text": chunk.chunk_text,
                "document_id": chunk.document_id,
                "document_title": title,
                "page_number": chunk.page_number,
                "section_name": chunk.section_name,
            })
        return items

    def get_chunk_count(self, index_version_id: uuid.UUID) -> int:
        statement = select(sa.func.count(DocumentChunk.id)).where(
            DocumentChunk.index_version_id == index_version_id
        )
        return self.db.exec(statement).one() or 0

    def delete_chunks_by_version(self, version_id: uuid.UUID) -> int:
        statement = sa.delete(DocumentChunk).where(
            DocumentChunk.index_version_id == version_id
        )
        result = self.db.exec(statement)
        self.db.commit()
        return result.rowcount
