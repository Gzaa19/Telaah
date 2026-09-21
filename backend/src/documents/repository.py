import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlmodel import Session, select
from backend.src.documents.models import Document, ExtractedText, ExtractedPage, ImportStatus


class DocumentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_drive_id(self, drive_file_id: str, researcher_id: uuid.UUID) -> Optional[Document]:
        statement = select(Document).where(
            Document.google_drive_id == drive_file_id,
            Document.researcher_id == researcher_id
        )
        return self.db.exec(statement).first()

    def get_by_id(self, document_id: uuid.UUID, researcher_id: Optional[uuid.UUID] = None) -> Optional[Document]:
        statement = select(Document).where(Document.id == document_id)
        if researcher_id is not None:
            statement = statement.where(Document.researcher_id == researcher_id)
        return self.db.exec(statement).first()

    def create(self, document: Document) -> Document:
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        return document

    def update_status(
        self,
        document_id: uuid.UUID,
        status: ImportStatus,
        failure_reason: Optional[str] = None,
        extracted_at: Optional[datetime] = None,
    ) -> Optional[Document]:
        doc = self.get_by_id(document_id)
        if not doc:
            return None

        doc.import_status = status
        doc.failure_reason = failure_reason
        if extracted_at is not None:
            doc.extracted_at = extracted_at
        elif status == ImportStatus.extracted and doc.extracted_at is None:
            doc.extracted_at = datetime.now(timezone.utc)

        doc.updated_at = datetime.now(timezone.utc)
        self.db.add(doc)
        self.db.commit()
        self.db.refresh(doc)
        return doc

    def list_by_researcher(
        self,
        researcher_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0
    ) -> List[Document]:
        statement = (
            select(Document)
            .where(Document.researcher_id == researcher_id)
            .order_by(Document.imported_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.db.exec(statement).all())

    def save_extracted_text(
        self,
        document_id: uuid.UUID,
        full_text: str,
        total_pages: int,
        pages_data: List[Dict[str, Any]],
    ) -> ExtractedText:
        # Check if existing extracted_text exists and remove if re-extracting
        existing_stmt = select(ExtractedText).where(ExtractedText.document_id == document_id)
        existing = self.db.exec(existing_stmt).first()
        if existing:
            self.db.delete(existing)
            self.db.commit()

        extracted_text = ExtractedText(
            document_id=document_id,
            full_text=full_text,
            total_pages=total_pages,
            extracted_at=datetime.now(timezone.utc),
        )
        self.db.add(extracted_text)
        self.db.flush()

        for page in pages_data:
            extracted_page = ExtractedPage(
                extracted_text_id=extracted_text.id,
                page_number=page["page_number"],
                content=page["content"],
            )
            self.db.add(extracted_page)

        self.db.commit()
        self.db.refresh(extracted_text)
        return extracted_text

    def delete(self, document_id: uuid.UUID, researcher_id: uuid.UUID) -> bool:
        doc = self.get_by_id(document_id, researcher_id=researcher_id)
        if not doc:
            return False
        self.db.delete(doc)
        self.db.commit()
        return True
