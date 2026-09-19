import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship


class Peneliti(SQLModel, table=True):
    __tablename__ = "peneliti"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(index=True, unique=True, max_length=255, nullable=False)
    nama_lengkap: str = Field(max_length=255, nullable=False)
    url_avatar: Optional[str] = Field(default=None, nullable=True)
    apakah_aktif: bool = Field(default=True, nullable=False)
    login_terakhir_pada: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    dibuat_pada: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    diperbarui_pada: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    sesi: List["SesiPengguna"] = Relationship(
        back_populates="peneliti",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    kredensial_oauth: Optional["KredensialOAuth"] = Relationship(
        back_populates="peneliti",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "uselist": False}
    )


class SesiPengguna(SQLModel, table=True):
    __tablename__ = "sesi_pengguna"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    peneliti_id: uuid.UUID = Field(
        foreign_key="peneliti.id",
        index=True,
        nullable=False
    )
    token_sesi: str = Field(index=True, unique=True, max_length=512, nullable=False)
    kedaluwarsa_pada: datetime = Field(nullable=False)
    apakah_aktif: bool = Field(default=True, nullable=False)
    dibuat_pada: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    peneliti: Optional[Peneliti] = Relationship(back_populates="sesi")


class KredensialOAuth(SQLModel, table=True):
    __tablename__ = "kredensial_oauth"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    peneliti_id: uuid.UUID = Field(
        foreign_key="peneliti.id",
        unique=True,
        index=True,
        nullable=False
    )
    penyedia: str = Field(default="google", max_length=50, nullable=False)
    token_akses_terenkripsi: str = Field(nullable=False)
    token_penyegaran_terenkripsi: Optional[str] = Field(default=None, nullable=True)
    token_kedaluwarsa_pada: datetime = Field(nullable=False)
    apakah_drive_diizinkan: bool = Field(default=False, nullable=False)
    dibuat_pada: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    diperbarui_pada: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    peneliti: Optional[Peneliti] = Relationship(back_populates="kredensial_oauth")


# Backward-compatible aliases
ResearcherAccount = Peneliti
UserSession = SesiPengguna
OAuthCredential = KredensialOAuth
