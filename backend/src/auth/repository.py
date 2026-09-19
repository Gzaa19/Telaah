import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Session, select
from backend.src.auth.models import Peneliti, SesiPengguna, KredensialOAuth


class AuthRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_researcher_by_id(self, researcher_id: uuid.UUID) -> Optional[Peneliti]:
        statement = select(Peneliti).where(Peneliti.id == researcher_id)
        return self.db.exec(statement).first()

    def get_researcher_by_email(self, email: str) -> Optional[Peneliti]:
        statement = select(Peneliti).where(Peneliti.email == email)
        return self.db.exec(statement).first()

    def upsert_researcher(
        self,
        email: str,
        full_name: str,
        avatar_url: Optional[str] = None
    ) -> Peneliti:
        researcher = self.get_researcher_by_email(email)
        now = datetime.now(timezone.utc)
        if researcher:
            researcher.nama_lengkap = full_name
            researcher.url_avatar = avatar_url
            researcher.login_terakhir_pada = now
            researcher.diperbarui_pada = now
        else:
            researcher = Peneliti(
                email=email,
                nama_lengkap=full_name,
                url_avatar=avatar_url,
                apakah_aktif=True,
                login_terakhir_pada=now,
                dibuat_pada=now,
                diperbarui_pada=now,
            )
            self.db.add(researcher)
        self.db.commit()
        self.db.refresh(researcher)
        return researcher

    def save_oauth_credentials(
        self,
        researcher_id: uuid.UUID,
        enc_access_token: str,
        token_expires_at: datetime,
        is_drive_granted: bool,
        enc_refresh_token: Optional[str] = None,
        provider: str = "google"
    ) -> KredensialOAuth:
        statement = select(KredensialOAuth).where(KredensialOAuth.peneliti_id == researcher_id)
        credential = self.db.exec(statement).first()
        now = datetime.now(timezone.utc)
        if credential:
            credential.token_akses_terenkripsi = enc_access_token
            if enc_refresh_token:
                credential.token_penyegaran_terenkripsi = enc_refresh_token
            credential.token_kedaluwarsa_pada = token_expires_at
            credential.apakah_drive_diizinkan = is_drive_granted
            credential.diperbarui_pada = now
        else:
            credential = KredensialOAuth(
                peneliti_id=researcher_id,
                penyedia=provider,
                token_akses_terenkripsi=enc_access_token,
                token_penyegaran_terenkripsi=enc_refresh_token,
                token_kedaluwarsa_pada=token_expires_at,
                apakah_drive_diizinkan=is_drive_granted,
                dibuat_pada=now,
                diperbarui_pada=now,
            )
            self.db.add(credential)
        self.db.commit()
        self.db.refresh(credential)
        return credential

    def get_oauth_credential_by_researcher_id(
        self, researcher_id: uuid.UUID
    ) -> Optional[KredensialOAuth]:
        statement = select(KredensialOAuth).where(KredensialOAuth.peneliti_id == researcher_id)
        return self.db.exec(statement).first()

    def create_session(
        self,
        researcher_id: uuid.UUID,
        session_token: str,
        expires_at: datetime
    ) -> SesiPengguna:
        now = datetime.now(timezone.utc)
        user_session = SesiPengguna(
            peneliti_id=researcher_id,
            token_sesi=session_token,
            kedaluwarsa_pada=expires_at,
            apakah_aktif=True,
            dibuat_pada=now,
        )
        self.db.add(user_session)
        self.db.commit()
        self.db.refresh(user_session)
        return user_session

    def get_active_session_by_token(self, session_token: str) -> Optional[SesiPengguna]:
        statement = select(SesiPengguna).where(
            SesiPengguna.token_sesi == session_token,
            SesiPengguna.apakah_aktif == True,
        )
        session = self.db.exec(statement).first()
        if not session:
            return None
        expires_at = session.kedaluwarsa_pada
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= datetime.now(timezone.utc):
            return None
        return session

    def deactivate_session(self, session_token: str) -> bool:
        statement = select(SesiPengguna).where(SesiPengguna.token_sesi == session_token)
        session = self.db.exec(statement).first()
        if session:
            session.apakah_aktif = False
            self.db.commit()
            return True
        return False
