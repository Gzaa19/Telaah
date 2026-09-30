import uuid
from datetime import datetime, timezone
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlmodel import Session

from backend.src.main import app
from backend.src.core.database import get_session
from backend.src.core.config import settings
from backend.src.auth.models import ResearcherAccount, UserSession
from backend.src.documents.models import Document, ImportStatus
from backend.src.outlines.models import (
    PaperOutline,
    OutlineSection,
    SectionField,
    SourceReference,
    OutlineLanguageEnum,
    GenerationStatusEnum,
    ApprovalStatusEnum,
    SectionStatusEnum,
)


@pytest.fixture
def auth_outline_client(db_session: Session):
    researcher1 = ResearcherAccount(
        id=uuid.uuid4(),
        email="editor1@test.com",
        full_name="Dr. Editor One",
        is_active=True,
    )
    researcher2 = ResearcherAccount(
        id=uuid.uuid4(),
        email="editor2@test.com",
        full_name="Dr. Editor Two",
        is_active=True,
    )
    db_session.add(researcher1)
    db_session.add(researcher2)

    session = UserSession(
        id=uuid.uuid4(),
        researcher_id=researcher1.id,
        session_token="test_editor_token",
        expires_at=datetime.now(timezone.utc).replace(year=2030),
        is_active=True,
    )
    db_session.add(session)
    db_session.commit()

    def override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = override_get_session
    client = TestClient(app)
    client.cookies.set(settings.SESSION_COOKIE_NAME, "test_editor_token")
    yield client, researcher1, researcher2, db_session
    app.dependency_overrides.clear()


def create_sample_outline(db: Session, researcher_id: uuid.UUID, approved: bool = False):
    doc = Document(
        id=uuid.uuid4(),
        google_drive_id="drive-sample",
        file_name="sample_paper.pdf",
        file_type="pdf",
        import_status=ImportStatus.extracted,
        researcher_id=researcher_id,
    )
    db.add(doc)
    db.commit()

    outline = PaperOutline(
        id=uuid.uuid4(),
        researcher_id=researcher_id,
        document_id=doc.id,
        template_id="icicos",
        version_number=1,
        language_choice=OutlineLanguageEnum.en_ieee,
        generation_status=GenerationStatusEnum.ready,
        approval_status=ApprovalStatusEnum.approved if approved else ApprovalStatusEnum.draft,
        approved_at=datetime.now(timezone.utc) if approved else None,
    )
    db.add(outline)
    db.commit()

    section = OutlineSection(
        id=uuid.uuid4(),
        outline_id=outline.id,
        section_key="introduction",
        title="I. INTRODUCTION",
        order_index=1,
        is_required=True,
        section_status=SectionStatusEnum.filled,
    )
    db.add(section)
    db.commit()

    field = SectionField(
        id=uuid.uuid4(),
        section_id=section.id,
        field_key="background",
        field_label="Background",
        content="Original synthesized background content.",
        is_needs_input=False,
        is_edited=False,
        order_index=1,
    )
    db.add(field)
    db.commit()

    ref = SourceReference(
        id=uuid.uuid4(),
        field_id=field.id,
        chunk_id=uuid.uuid4(),
        document_id=doc.id,
        page_number=3,
        excerpt_text="Excerpt text from chunk 1.",
    )
    db.add(ref)
    db.commit()

    return outline, section, field, doc


def test_update_field_content_success(auth_outline_client):
    client, researcher, _, db = auth_outline_client
    outline, section, field, _ = create_sample_outline(db, researcher.id, approved=False)

    response = client.patch(
        f"/api/outlines/{outline.id}/fields/{field.id}",
        json={"content": "Author edited content with refined scope."},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["field_id"] == str(field.id)
    assert data["content"] == "Author edited content with refined scope."
    assert data["is_edited"] is True
    assert data["is_needs_input"] is False

    # Verify db reflects updated status
    db.refresh(field)
    db.refresh(section)
    assert field.is_edited is True
    assert section.section_status == SectionStatusEnum.edited


def test_update_field_approved_outline_forks_draft(auth_outline_client):
    client, researcher, _, db = auth_outline_client
    outline, section, field, _ = create_sample_outline(db, researcher.id, approved=True)

    response = client.patch(
        f"/api/outlines/{outline.id}/fields/{field.id}",
        json={"content": "Attempted edit on approved outline."},
    )

    # FR-015: Editing an approved outline returns 409 Conflict with X-Fork-Outline-Id header
    assert response.status_code == 409
    assert "X-Fork-Outline-Id" in response.headers


def test_approve_outline_success(auth_outline_client):
    client, researcher, _, db = auth_outline_client
    outline, _, _, _ = create_sample_outline(db, researcher.id, approved=False)

    response = client.post(f"/api/outlines/{outline.id}/approve")
    assert response.status_code == 200
    data = response.json()
    assert data["outline_id"] == str(outline.id)
    assert data["approval_status"] == "approved"
    assert data["approved_at"] is not None
    assert data["unresolved_needs_input_count"] == 0


def test_get_outline_versions(auth_outline_client):
    client, researcher, _, db = auth_outline_client
    outline, _, _, doc = create_sample_outline(db, researcher.id, approved=False)

    response = client.get(f"/api/outlines/{outline.id}/versions")
    assert response.status_code == 200
    data = response.json()
    assert "versions" in data
    assert len(data["versions"]) >= 1
    assert data["versions"][0]["outline_id"] == str(outline.id)
