import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr


class GoogleProfileDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    email: str
    full_name: str
    avatar_url: Optional[str] = None


class OAuthTokenDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    access_token: str
    refresh_token: Optional[str] = None
    expires_in: int = 3600
    scope: str = ""


class ResearcherProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    researcher_id: uuid.UUID
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    is_drive_granted: bool
    session_expires_at: datetime


class ErrorResponse(BaseModel):
    error: str
    message: str


class MessageResponse(BaseModel):
    message: str
