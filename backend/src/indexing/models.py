import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import sqlalchemy as sa
from sqlalchemy import UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import SQLModel, Field, Column, Text, DateTime
from pgvector.sqlalchemy import Vector


class DocumentIndexVersion(SQLModel, table=True):
    __tablename__ = "document_index_versions"
    __table_args__ = (
        UniqueConstraint("index_fingerprint", name="uq_div_fingerprint"),
        UniqueConstraint(
            "document_id",
            name="uq_div_one_active_per_doc",
            postgresql_where=sa.text("is_active = TRUE"),
        ),
        CheckConstraint(
            "status IN ('queued','cleaning','chunking','embedding','storing','indexed','failed','archived')",
            name="chk_div_status",
        ),
        CheckConstraint(
            "embedding_dimension > 0",
            name="chk_div_embedding_dimension",
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    document_id: uuid.UUID = Field(
        foreign_key="documents.id",
        nullable=False,
        index=True,
    )
    researcher_id: uuid.UUID = Field(
        foreign_key="researchers.id",
        nullable=False,
        index=True,
    )
    status: str = Field(default="queued", max_length=20, nullable=False)
    model_name: str = Field(max_length=255, nullable=False)
    model_version: str = Field(max_length=100, nullable=False)
    model_commit_hash: str = Field(max_length=64, nullable=False)
    embedding_dimension: int = Field(default=768, nullable=False)
    chunk_size: int = Field(default=1200, nullable=False)
    chunk_overlap: int = Field(default=150, nullable=False)
    splitter_type: str = Field(default="recursive_character", max_length=100, nullable=False)
    preprocessing_version: str = Field(default="v1", max_length=20, nullable=False)
    source_checksum: str = Field(max_length=64, nullable=False)
    index_fingerprint: str = Field(max_length=64, nullable=False)
    is_active: bool = Field(default=False, nullable=False)
    total_chunks: Optional[int] = Field(default=None, nullable=True)
    failure_reason: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    started_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    completed_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class DocumentChunk(SQLModel, table=True):
    __tablename__ = "document_chunks"
    __table_args__ = (
        CheckConstraint(
            "chunk_index >= 0",
            name="chk_chunk_index_non_negative",
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    document_id: uuid.UUID = Field(
        foreign_key="documents.id",
        nullable=False,
        index=True,
    )
    researcher_id: uuid.UUID = Field(
        foreign_key="researchers.id",
        nullable=False,
        index=True,
    )
    index_version_id: uuid.UUID = Field(
        foreign_key="document_index_versions.id",
        nullable=False,
        index=True,
    )
    chunk_index: int = Field(nullable=False)
    chunk_text: str = Field(sa_column=Column(Text, nullable=False))
    embedding: Any = Field(sa_column=Column(Vector(768), nullable=False))
    page_number: Optional[int] = Field(default=None, nullable=True)
    section_name: Optional[str] = Field(default=None, max_length=255, nullable=True)
    source_metadata: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class IndexingJob(SQLModel, table=True):
    __tablename__ = "indexing_jobs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    document_id: uuid.UUID = Field(
        foreign_key="documents.id",
        nullable=False,
        index=True,
    )
    researcher_id: uuid.UUID = Field(
        foreign_key="researchers.id",
        nullable=False,
        index=True,
    )
    index_version_id: uuid.UUID = Field(
        foreign_key="document_index_versions.id",
        nullable=False,
        index=True,
    )
    status: str = Field(default="queued", max_length=20, nullable=False)
    current_stage: Optional[str] = Field(default=None, max_length=30, nullable=True)
    failure_reason: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    retry_count: int = Field(default=0, nullable=False)
    max_retries: int = Field(default=3, nullable=False)
    enqueued_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    started_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    completed_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    heartbeat_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
