import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlmodel import Session, select, func
from sqlalchemy.orm import selectinload

from backend.src.outlines.models import (
    PaperOutline,
    OutlineSection,
    SectionField,
    SourceReference,
    GenerationStatusEnum,
    ApprovalStatusEnum,
    SectionStatusEnum,
)


class OutlineRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_outline_by_id(
        self,
        outline_id: uuid.UUID,
        researcher_id: Optional[uuid.UUID] = None,
        load_relations: bool = True,
    ) -> Optional[PaperOutline]:
        statement = select(PaperOutline).where(PaperOutline.id == outline_id)
        if researcher_id is not None:
            statement = statement.where(PaperOutline.researcher_id == researcher_id)

        if load_relations:
            statement = statement.options(
                selectinload(PaperOutline.sections)
                .selectinload(OutlineSection.fields)
                .selectinload(SectionField.source_references)
            )

        return self.db.exec(statement).first()

    def get_latest_version_number(
        self,
        document_id: uuid.UUID,
        researcher_id: uuid.UUID,
    ) -> int:
        statement = (
            select(func.coalesce(func.max(PaperOutline.version_number), 0))
            .where(
                PaperOutline.document_id == document_id,
                PaperOutline.researcher_id == researcher_id,
            )
        )
        result = self.db.exec(statement).one()
        return int(result)

    def has_active_generation(self, document_id: uuid.UUID) -> bool:
        active_statuses = [
            GenerationStatusEnum.preparing,
            GenerationStatusEnum.reading,
            GenerationStatusEnum.generating,
            GenerationStatusEnum.validating,
        ]
        statement = select(PaperOutline).where(
            PaperOutline.document_id == document_id,
            PaperOutline.generation_status.in_(active_statuses),
        )
        return self.db.exec(statement).first() is not None

    def create_outline(self, outline: PaperOutline) -> PaperOutline:
        self.db.add(outline)
        self.db.commit()
        self.db.refresh(outline)
        return outline

    def create_outline_with_sections(
        self,
        outline: PaperOutline,
        sections_data: List[Dict[str, Any]],
    ) -> PaperOutline:
        """
        Atomically persist PaperOutline, OutlineSections, SectionFields, and SourceReferences.
        """
        self.db.add(outline)
        self.db.flush()

        for sec_data in sections_data:
            section = OutlineSection(
                outline_id=outline.id,
                section_key=sec_data["section_key"],
                title=sec_data["title"],
                order_index=sec_data["order_index"],
                is_required=sec_data.get("is_required", True),
                section_status=sec_data.get("section_status", SectionStatusEnum.filled),
            )
            self.db.add(section)
            self.db.flush()

            for fld_data in sec_data.get("fields", []):
                field = SectionField(
                    section_id=section.id,
                    field_key=fld_data["field_key"],
                    field_label=fld_data["field_label"],
                    content=fld_data.get("content", "[NEEDS INPUT]"),
                    is_needs_input=fld_data.get("is_needs_input", False),
                    is_edited=fld_data.get("is_edited", False),
                    order_index=fld_data["order_index"],
                )
                self.db.add(field)
                self.db.flush()

                for ref_data in fld_data.get("source_refs", []):
                    ref = SourceReference(
                        field_id=field.id,
                        chunk_id=ref_data["chunk_id"],
                        document_id=outline.document_id,
                        page_number=ref_data.get("page_number"),
                        excerpt_text=ref_data.get("excerpt_text", ""),
                    )
                    self.db.add(ref)

        self.db.commit()
        self.db.refresh(outline)
        return outline

    def update_outline_status(
        self,
        outline_id: uuid.UUID,
        status: GenerationStatusEnum,
        failure_reason: Optional[str] = None,
    ) -> Optional[PaperOutline]:
        outline = self.get_outline_by_id(outline_id, load_relations=False)
        if not outline:
            return None

        outline.generation_status = status
        if failure_reason is not None:
            outline.failure_reason = failure_reason

        self.db.add(outline)
        self.db.commit()
        self.db.refresh(outline)
        return outline

    def get_field_by_id(
        self,
        field_id: uuid.UUID,
        outline_id: Optional[uuid.UUID] = None,
    ) -> Optional[SectionField]:
        statement = select(SectionField).where(SectionField.id == field_id)
        if outline_id is not None:
            statement = (
                statement.join(OutlineSection)
                .where(OutlineSection.outline_id == outline_id)
            )
        statement = statement.options(selectinload(SectionField.source_references))
        return self.db.exec(statement).first()

    def update_field_content(
        self,
        field_id: uuid.UUID,
        content: str,
    ) -> Optional[SectionField]:
        field = self.get_field_by_id(field_id)
        if not field:
            return None

        field.content = content
        field.is_edited = True
        field.is_needs_input = content.strip() == "[NEEDS INPUT]"

        # Also update parent section status to edited if not already
        section = self.db.exec(
            select(OutlineSection).where(OutlineSection.id == field.section_id)
        ).first()
        if section:
            section.section_status = SectionStatusEnum.edited
            self.db.add(section)

        self.db.add(field)
        self.db.commit()
        self.db.refresh(field)
        return field

    def clone_edited_sections(
        self,
        source_outline_id: uuid.UUID,
        target_outline_id: uuid.UUID,
    ) -> None:
        """
        Preserve edited sections from a previous outline version into a newly generated version.
        """
        source_outline = self.get_outline_by_id(source_outline_id, load_relations=True)
        target_outline = self.get_outline_by_id(target_outline_id, load_relations=True)
        if not source_outline or not target_outline:
            return

        target_section_map = {sec.section_key: sec for sec in target_outline.sections}

        for src_sec in source_outline.sections:
            if src_sec.section_status == SectionStatusEnum.edited:
                tgt_sec = target_section_map.get(src_sec.section_key)
                if tgt_sec:
                    tgt_sec.section_status = SectionStatusEnum.edited
                    tgt_field_map = {fld.field_key: fld for fld in tgt_sec.fields}

                    for src_fld in src_sec.fields:
                        if src_fld.is_edited:
                            tgt_fld = tgt_field_map.get(src_fld.field_key)
                            if tgt_fld:
                                tgt_fld.content = src_fld.content
                                tgt_fld.is_edited = True
                                tgt_fld.is_needs_input = src_fld.is_needs_input
                                self.db.add(tgt_fld)
                    self.db.add(tgt_sec)

        self.db.commit()

    def approve_outline(
        self,
        outline_id: uuid.UUID,
        approved_at: Optional[datetime] = None,
    ) -> Optional[PaperOutline]:
        outline = self.get_outline_by_id(outline_id, load_relations=False)
        if not outline:
            return None

        outline.approval_status = ApprovalStatusEnum.approved
        outline.approved_at = approved_at or datetime.now(timezone.utc)
        self.db.add(outline)
        self.db.commit()
        self.db.refresh(outline)
        return outline

    def list_outline_versions(
        self,
        document_id: uuid.UUID,
        researcher_id: uuid.UUID,
    ) -> List[PaperOutline]:
        statement = (
            select(PaperOutline)
            .where(
                PaperOutline.document_id == document_id,
                PaperOutline.researcher_id == researcher_id,
            )
            .order_by(PaperOutline.version_number.desc())
        )
        return list(self.db.exec(statement).all())
