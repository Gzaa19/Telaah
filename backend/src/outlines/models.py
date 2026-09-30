import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List
import sqlalchemy as sa
from sqlalchemy import Index
from sqlmodel import SQLModel, Field, Relationship, Column, Text, DateTime


class OutlineLanguageEnum(str, Enum):
    en_ieee = "en_ieee"
    id_formal = "id_formal"


class GenerationStatusEnum(str, Enum):
    preparing = "preparing"
    reading = "reading"
    generating = "generating"
    validating = "validating"
    ready = "ready"
    failed = "failed"


class ApprovalStatusEnum(str, Enum):
    draft = "draft"
    approved = "approved"


class SectionStatusEnum(str, Enum):
    filled = "filled"
    needs_input = "needs_input"
    edited = "edited"


class PaperOutline(SQLModel, table=True):
    __tablename__ = "paper_outlines"
    __table_args__ = (
        Index("idx_po_researcher_doc", "researcher_id", "document_id"),
        Index("idx_po_doc_version", "document_id", "version_number"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    researcher_id: uuid.UUID = Field(
        foreign_key="researchers.id",
        nullable=False,
        index=True,
    )
    document_id: uuid.UUID = Field(
        foreign_key="documents.id",
        nullable=False,
        index=True,
    )
    template_id: str = Field(max_length=100, nullable=False)
    version_number: int = Field(default=1, nullable=False)
    language_choice: OutlineLanguageEnum = Field(
        sa_column=Column(
            sa.Enum(OutlineLanguageEnum, name="outline_language_enum", create_type=False),
            default=OutlineLanguageEnum.en_ieee,
            nullable=False,
        )
    )
    generation_status: GenerationStatusEnum = Field(
        sa_column=Column(
            sa.Enum(GenerationStatusEnum, name="generation_status_enum", create_type=False),
            default=GenerationStatusEnum.preparing,
            nullable=False,
        )
    )
    approval_status: ApprovalStatusEnum = Field(
        sa_column=Column(
            sa.Enum(ApprovalStatusEnum, name="approval_status_enum", create_type=False),
            default=ApprovalStatusEnum.draft,
            nullable=False,
        )
    )
    failure_reason: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    approved_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    # Relationships
    sections: List["OutlineSection"] = Relationship(
        back_populates="outline",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "order_by": "OutlineSection.order_index",
        },
    )


class OutlineSection(SQLModel, table=True):
    __tablename__ = "outline_sections"
    __table_args__ = (
        Index("idx_os_outline_order", "outline_id", "order_index"),
        Index("idx_os_outline_key", "outline_id", "section_key"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    outline_id: uuid.UUID = Field(
        foreign_key="paper_outlines.id",
        nullable=False,
        index=True,
    )
    section_key: str = Field(max_length=100, nullable=False)
    title: str = Field(max_length=500, nullable=False)
    order_index: int = Field(nullable=False)
    is_required: bool = Field(default=True, nullable=False)
    section_status: SectionStatusEnum = Field(
        sa_column=Column(
            sa.Enum(SectionStatusEnum, name="section_status_enum", create_type=False),
            default=SectionStatusEnum.needs_input,
            nullable=False,
        )
    )

    # Relationships
    outline: Optional[PaperOutline] = Relationship(back_populates="sections")
    fields: List["SectionField"] = Relationship(
        back_populates="section",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "order_by": "SectionField.order_index",
        },
    )


class SectionField(SQLModel, table=True):
    __tablename__ = "section_fields"
    __table_args__ = (
        Index("idx_sf_section_order", "section_id", "order_index"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    section_id: uuid.UUID = Field(
        foreign_key="outline_sections.id",
        nullable=False,
        index=True,
    )
    field_key: str = Field(max_length=100, nullable=False)
    field_label: str = Field(max_length=500, nullable=False)
    content: str = Field(
        default="[NEEDS INPUT]",
        sa_column=Column(Text, nullable=False, server_default=sa.text("'[NEEDS INPUT]'")),
    )
    is_needs_input: bool = Field(default=True, nullable=False)
    is_edited: bool = Field(default=False, nullable=False)
    order_index: int = Field(nullable=False)

    # Relationships
    section: Optional[OutlineSection] = Relationship(back_populates="fields")
    source_references: List["SourceReference"] = Relationship(
        back_populates="field",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class SourceReference(SQLModel, table=True):
    __tablename__ = "source_references"
    __table_args__ = (
        Index("idx_sr_field_id", "field_id"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    field_id: uuid.UUID = Field(
        foreign_key="section_fields.id",
        nullable=False,
        index=True,
    )
    chunk_id: uuid.UUID = Field(
        foreign_key="document_chunks.id",
        nullable=False,
    )
    document_id: uuid.UUID = Field(
        foreign_key="documents.id",
        nullable=False,
    )
    page_number: Optional[int] = Field(default=None, nullable=True)
    excerpt_text: str = Field(sa_column=Column(Text, nullable=False))

    # Relationships
    field: Optional[SectionField] = Relationship(back_populates="source_references")
