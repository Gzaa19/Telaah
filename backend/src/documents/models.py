import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List
import sqlalchemy as sa
from sqlmodel import SQLModel, Field, Relationship, Column, Text, BigInteger, DateTime


class ImportStatus(str, Enum):
    importing = "importing"
    extracting = "extracting"
    extracted = "extracted"
    failed = "failed"


class FileType(str, Enum):
    pdf = "pdf"
    docx = "docx"


class Document(SQLModel, table=True):
    __tablename__ = "documents"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    google_drive_id: str = Field(max_length=255, nullable=False)
    file_name: str = Field(max_length=500, nullable=False)
    file_type: FileType = Field(
        sa_column=Column(sa.Enum(FileType, name="file_type", create_type=False), nullable=False)
    )
    file_size_bytes: Optional[int] = Field(
        default=None,
        sa_column=Column(BigInteger, nullable=True)
    )
    drive_modified_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True)
    )
    drive_md5_checksum: Optional[str] = Field(
        default=None,
        max_length=64,
        nullable=True
    )
    import_status: ImportStatus = Field(
        default=ImportStatus.importing,
        sa_column=Column(
            sa.Enum(ImportStatus, name="import_status", create_type=False),
            default=ImportStatus.importing,
            nullable=False
        )
    )
    failure_reason: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True)
    )
    imported_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    extracted_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True)
    )
    researcher_id: uuid.UUID = Field(
        foreign_key="researchers.id",
        index=True,
        nullable=False
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )

    # Relationships
    extracted_text: Optional["ExtractedText"] = Relationship(
        back_populates="document",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "uselist": False}
    )


class ExtractedText(SQLModel, table=True):
    __tablename__ = "extracted_texts"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    document_id: uuid.UUID = Field(
        foreign_key="documents.id",
        unique=True,
        index=True,
        nullable=False
    )
    full_text: str = Field(sa_column=Column(Text, nullable=False))
    total_pages: int = Field(nullable=False)
    extracted_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )

    # Relationships
    document: Optional[Document] = Relationship(back_populates="extracted_text")
    pages: List["ExtractedPage"] = Relationship(
        back_populates="extracted_text",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class ExtractedPage(SQLModel, table=True):
    __tablename__ = "extracted_pages"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    extracted_text_id: uuid.UUID = Field(
        foreign_key="extracted_texts.id",
        index=True,
        nullable=False
    )
    page_number: int = Field(nullable=False)
    content: str = Field(sa_column=Column(Text, nullable=False))

    # Relationships
    extracted_text: Optional[ExtractedText] = Relationship(back_populates="pages")
