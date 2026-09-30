import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

from backend.src.outlines.models import (
    OutlineLanguageEnum,
    GenerationStatusEnum,
    ApprovalStatusEnum,
    SectionStatusEnum,
)


class GenerateOutlineRequest(BaseModel):
    document_id: uuid.UUID
    template_id: str = Field(default="icicos")
    language: OutlineLanguageEnum = Field(default=OutlineLanguageEnum.en_ieee)


class GenerateOutlineResponse(BaseModel):
    outline_id: uuid.UUID
    status: GenerationStatusEnum


class OutlineStatusResponse(BaseModel):
    outline_id: uuid.UUID
    generation_status: GenerationStatusEnum
    approval_status: ApprovalStatusEnum
    version_number: int
    progress_label: str
    failure_reason: Optional[str] = None


class SourceRefDTO(BaseModel):
    chunk_id: uuid.UUID
    page_number: Optional[int] = None
    excerpt_text: str


class FieldDTO(BaseModel):
    field_id: uuid.UUID
    field_key: str
    field_label: str
    content: str
    is_needs_input: bool
    is_edited: bool
    order_index: int
    source_refs: List[SourceRefDTO] = []


class SectionDTO(BaseModel):
    section_id: uuid.UUID
    section_key: str
    title: str
    order_index: int
    is_required: bool
    section_status: SectionStatusEnum
    fields: List[FieldDTO] = []


class OutlineDetailResponse(BaseModel):
    outline_id: uuid.UUID
    template_id: str
    version_number: int
    language_choice: OutlineLanguageEnum
    generation_status: GenerationStatusEnum
    approval_status: ApprovalStatusEnum
    approved_at: Optional[datetime] = None
    sections: List[SectionDTO] = []


class UpdateFieldRequest(BaseModel):
    content: str


class SectionFieldResponse(BaseModel):
    field_id: uuid.UUID
    content: str
    is_edited: bool
    is_needs_input: bool


class RegenerateOutlineRequest(BaseModel):
    reset_all_sections: bool = False


class RegenerateOutlineResponse(BaseModel):
    outline_id: uuid.UUID
    version_number: int


class RegenerateSectionResponse(BaseModel):
    section_id: uuid.UUID
    status: str = "generating"


class ApproveResponse(BaseModel):
    outline_id: uuid.UUID
    approval_status: ApprovalStatusEnum
    approved_at: datetime
    unresolved_needs_input_count: int


class OutlineVersionItem(BaseModel):
    outline_id: uuid.UUID
    version_number: int
    approval_status: ApprovalStatusEnum
    generation_status: GenerationStatusEnum
    created_at: datetime
    approved_at: Optional[datetime] = None
    trigger: str = "initial"


class VersionListResponse(BaseModel):
    versions: List[OutlineVersionItem]
