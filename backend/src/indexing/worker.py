import uuid
import logging
import asyncio
from typing import Optional
from sqlmodel import Session

from backend.src.core.database import engine
from backend.src.indexing.repository import IndexingRepository
from backend.src.indexing.cleaner import TextCleaningService
from backend.src.indexing.chunker import ChunkingService
from backend.src.indexing.embedding import LocalEmbeddingProvider

logger = logging.getLogger(__name__)


def run_indexing_pipeline(job_id: uuid.UUID, session: Optional[Session] = None) -> None:
    logger.info("Starting indexing pipeline for job_id=%s", job_id)

    def _execute(db: Session):
        repo = IndexingRepository(db=db)
        cleaner = TextCleaningService()
        chunker = ChunkingService()
        embedder = LocalEmbeddingProvider.get_instance()

        job = repo.get_job_by_id(job_id)
        if not job:
            logger.error("Job %s not found in database", job_id)
            return

        try:
            # 1. Cleaning stage
            repo.update_job_status(job_id, status="cleaning", stage="cleaning")
            extracted_text = repo.get_extracted_text(job.document_id)
            extracted_pages = repo.get_extracted_pages(job.document_id)

            if not extracted_text or not extracted_text.full_text.strip():
                raise ValueError("Tidak ada teks yang dapat diindeks — hasil ekstraksi kosong.")

            # Clean full text and pages
            cleaned_full_text = cleaner.clean(extracted_text.full_text)

            # 2. Chunking stage
            repo.update_job_status(job_id, status="chunking", stage="chunking")
            pages_data = []
            if extracted_pages:
                for p in extracted_pages:
                    cleaned_page_text = cleaner.clean(getattr(p, "content", None) or getattr(p, "page_text", None) or "")
                    pages_data.append({
                        "page_number": p.page_number,
                        "text": cleaned_page_text,
                        "section_name": getattr(p, "section_name", None),
                    })
                chunks_with_meta = chunker.chunk_pages(pages_data)
            else:
                raw_chunks = chunker.chunk_text_only(cleaned_full_text)
                chunks_with_meta = [
                    {
                        "chunk_index": i,
                        "chunk_text": t,
                        "page_number": 1,
                        "section_name": None,
                    }
                    for i, t in enumerate(raw_chunks)
                ]

            if not chunks_with_meta:
                raise ValueError("Gagal membagi dokumen menjadi chunk teks yang valid.")

            # 3. Embedding stage
            repo.update_job_status(job_id, status="embedding", stage="embedding")
            chunk_texts = [c["chunk_text"] for c in chunks_with_meta]

            vectors = embedder.embed_passages(chunk_texts)
            embedder.validate_dimensions(vectors, expected_dim=768)

            # 4. Storing stage
            repo.update_job_status(job_id, status="storing", stage="storing")
            doc = repo.get_document_with_access(job.document_id, job.researcher_id)
            doc_title = doc.file_name if doc else None
            source_drive_id = doc.google_drive_id if doc else None
            source_checksum = doc.drive_md5_checksum if doc else None

            chunks_to_save = []
            for i, c in enumerate(chunks_with_meta):
                chunks_to_save.append({
                    "document_id": job.document_id,
                    "researcher_id": job.researcher_id,
                    "chunk_index": c["chunk_index"],
                    "chunk_text": c["chunk_text"],
                    "embedding": vectors[i],
                    "page_number": c.get("page_number"),
                    "section_name": c.get("section_name"),
                    "source_metadata": {
                        "document_title": doc_title,
                        "authors": None,
                        "publication_year": None,
                        "source_google_drive_id": source_drive_id,
                        "source_checksum": source_checksum or "",
                    },
                })

            repo.save_chunks_transactional(chunks_to_save, job.index_version_id)

            # 5. Finalize stage
            repo.update_job_status(job_id, status="indexed", stage=None)
            logger.info("Indexing pipeline completed successfully for job_id=%s, total_chunks=%d", job_id, len(chunks_to_save))

        except Exception as e:
            logger.exception("Indexing failed for job_id=%s: %s", job_id, e)
            safe_message = str(e)
            repo.update_job_status(
                job_id,
                status="failed",
                stage=None,
                failure_reason=safe_message,
            )

    if session is not None:
        _execute(session)
    else:
        with Session(engine) as db:
            _execute(db)
