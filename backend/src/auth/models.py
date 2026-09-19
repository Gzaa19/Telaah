import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship


class ResearcherAccount(SQLModel, table=True):
    __tablename__ = "researchers"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(index=True, unique=True, max_length=255, nullable=False)
    full_name: str = Field(max_length=255, nullable=False)
    avatar_url: Optional[str] = Field(default=None, nullable=True)
    is_active: bool = Field(default=True, nullable=False)
    last_login_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    sessions: List["UserSession"] = Relationship(
        back_populates="researcher",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    oauth_credential: Optional["OAuthCredential"] = Relationship(
        back_populates="researcher",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "uselist": False}
    )


class UserSession(SQLModel, table=True):
    __tablename__ = "user_sessions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    researcher_id: uuid.UUID = Field(
        foreign_key="researchers.id",
        index=True,
        nullable=False
    )
    session_token: str = Field(index=True, unique=True, max_length=512, nullable=False)
    expires_at: datetime = Field(nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    researcher: Optional[ResearcherAccount] = Relationship(back_populates="sessions")


class OAuthCredential(SQLModel, table=True):
    __tablename__ = "oauth_credentials"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    researcher_id: uuid.UUID = Field(
        foreign_key="researchers.id",
        unique=True,
        index=True,
        nullable=False
    )
    provider: str = Field(default="google", max_length=50, nullable=False)
    encrypted_access_token: str = Field(nullable=False)
    encrypted_refresh_token: Optional[str] = Field(default=None, nullable=True)
    token_expires_at: datetime = Field(nullable=False)
    is_drive_granted: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    researcher: Optional[ResearcherAccount] = Relationship(back_populates="oauth_credential")
