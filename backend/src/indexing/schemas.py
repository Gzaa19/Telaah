import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class JobResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    job_id: uuid.UUID
    index_version_id: uuid.UUID
    document_id: uuid.UUID
    status: str = "queued"
    message: str = "Indexing job enqueued successfully."


class JobStatusDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    job_id: uuid.UUID
    document_id: uuid.UUID
    index_version_id: uuid.UUID
    status: str
    current_stage: Optional[str] = None
    retry_count: int = 0
    failure_reason: Optional[str] = None
    enqueued_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    heartbeat_at: Optional[datetime] = None


class IndexStatusDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    document_id: uuid.UUID
    file_name: Optional[str] = None
    status: str
    stage: Optional[str] = None
    total_chunks: Optional[int] = None
    model_name: Optional[str] = None
    embedding_dimension: Optional[int] = None
    completed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None


class IndexSummaryDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    document_id: uuid.UUID
    file_name: str
    index_version_id: uuid.UUID
    status: str
    model_name: str
    model_version: str
    embedding_dimension: int
    chunk_size: int
    chunk_overlap: int
    total_chunks: Optional[int] = None
    source_checksum: str
    completed_at: Optional[datetime] = None
    is_active: bool


class ReindexResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    job_id: uuid.UUID
    new_index_version_id: uuid.UUID
    archived_index_version_id: Optional[uuid.UUID] = None
    document_id: uuid.UUID
    status: str = "queued"
    message: str = "Re-indexing pipeline initiated."


class SearchResultItemDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    chunk_id: uuid.UUID
    chunk_index: int
    similarity_score: float
    chunk_text: str
    document_id: uuid.UUID
    document_title: Optional[str] = None
    page_number: Optional[int] = None
    section_name: Optional[str] = None


class SearchResultDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    query: str
    total_results: int
    results: List[SearchResultItemDTO]


class IndexingErrorResponse(BaseModel):
    error: str
    message: str
    existing_index_version_id: Optional[uuid.UUID] = None
