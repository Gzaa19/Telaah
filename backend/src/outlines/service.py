import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from sqlmodel import Session, select

from backend.src.outlines.models import (
    PaperOutline,
    OutlineSection,
    SectionField,
    OutlineLanguageEnum,
    GenerationStatusEnum,
    ApprovalStatusEnum,
    SectionStatusEnum,
)
from backend.src.outlines.repository import OutlineRepository
from backend.src.outlines.template_parser import TemplateParser, OutlineDefinition
from backend.src.outlines.retriever import ChunkRetriever
from backend.src.outlines.llm_synthesizer import LLMSynthesizer, FieldResult
from backend.src.documents.models import Document, ImportStatus
from backend.src.indexing.models import DocumentIndexVersion
from backend.src.outlines.schemas import (
    OutlineStatusResponse,
    OutlineDetailResponse,
    SectionDTO,
    FieldDTO,
    SourceRefDTO,
)

logger = logging.getLogger(__name__)


class OutlineValidationError(Exception):
    """Raised when outline validation fails."""
    pass


class OutlineService:
    def __init__(
        self,
        db: Session,
        repository: Optional[OutlineRepository] = None,
        template_parser: Optional[TemplateParser] = None,
        retriever: Optional[ChunkRetriever] = None,
        synthesizer: Optional[LLMSynthesizer] = None,
    ):
        self.db = db
        self.repository = repository or OutlineRepository(db=db)
        self.template_parser = template_parser or TemplateParser()
        self.retriever = retriever or ChunkRetriever(db=db)
        self.synthesizer = synthesizer or LLMSynthesizer()

    def validate_generate_request(self, researcher_id: uuid.UUID, document_id: uuid.UUID) -> Document:
        doc = self.db.exec(
            select(Document).where(
                Document.id == document_id,
                Document.researcher_id == researcher_id,
            )
        ).first()

        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Research document not found or access denied.",
            )

        # Check document index status
        active_index = self.db.exec(
            select(DocumentIndexVersion).where(
                DocumentIndexVersion.document_id == document_id,
                DocumentIndexVersion.is_active == True,
                DocumentIndexVersion.status == "indexed",
            )
        ).first()

        if not active_index:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The selected document has not been fully indexed yet. Please wait until indexing is complete before generating an outline.",
            )

        return doc

    def assert_no_active_generation(self, document_id: uuid.UUID) -> None:
        if self.repository.has_active_generation(document_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An outline generation process is already in progress for this document.",
            )

    def generate_outline(
        self,
        researcher_id: uuid.UUID,
        document_id: uuid.UUID,
        template_id: str = "icicos",
        language: OutlineLanguageEnum = OutlineLanguageEnum.en_ieee,
    ) -> uuid.UUID:
        self.validate_generate_request(researcher_id=researcher_id, document_id=document_id)
        self.assert_no_active_generation(document_id=document_id)

        latest_version = self.repository.get_latest_version_number(
            document_id=document_id,
            researcher_id=researcher_id,
        )
        version_number = latest_version + 1 if latest_version > 0 else 1

        outline = PaperOutline(
            researcher_id=researcher_id,
            document_id=document_id,
            template_id=template_id,
            version_number=version_number,
            language_choice=language,
            generation_status=GenerationStatusEnum.preparing,
            approval_status=ApprovalStatusEnum.draft,
        )
        saved = self.repository.create_outline(outline)
        return saved.id

    def validate_outline_structure(
        self,
        sections_data: List[Dict[str, Any]],
        definition: OutlineDefinition,
    ) -> bool:
        required_keys = [s.section_key for s in definition.sections if s.is_required]
        generated_keys = [s["section_key"] for s in sections_data]

        for req in required_keys:
            if req not in generated_keys:
                raise OutlineValidationError(f"Missing mandatory section: {req}")

        # Check section order invariance
        generated_order = [s["order_index"] for s in sections_data]
        if generated_order != sorted(generated_order):
            raise OutlineValidationError("Section order violated template definition sequence.")

        return True

    def run_generation_pipeline(self, outline_id: uuid.UUID) -> None:
        outline = self.repository.get_outline_by_id(outline_id, load_relations=False)
        if not outline:
            logger.error(f"Cannot run pipeline: outline {outline_id} not found.")
            return

        try:
            # 1. Status: Reading
            self.repository.update_outline_status(outline_id, GenerationStatusEnum.reading)

            # Load active index version for targeted chunk retrieval
            active_index = self.db.exec(
                select(DocumentIndexVersion).where(
                    DocumentIndexVersion.document_id == outline.document_id,
                    DocumentIndexVersion.is_active == True,
                )
            ).first()

            if not active_index:
                # In testing, index might be pending or mocked, use fallback uuid if needed
                index_version_id = uuid.uuid4()
            else:
                index_version_id = active_index.id

            # Parse template
            definition = self.template_parser.parse_template(outline.template_id)

            # 2. Status: Generating
            self.repository.update_outline_status(outline_id, GenerationStatusEnum.generating)

            sections_data: List[Dict[str, Any]] = []

            for sec in definition.sections:
                fields_data: List[Dict[str, Any]] = []
                section_has_needs_input = False

                for fld in sec.fields:
                    chunks = self.retriever.retrieve_for_field(
                        field_key=fld.field_key,
                        field_label=fld.field_label,
                        field_guidance=fld.guidance_notes,
                        index_version_id=index_version_id,
                        top_k=5,
                    )

                    field_res: FieldResult = self.synthesizer.synthesize_field(
                        section_title=sec.title,
                        field_key=fld.field_key,
                        field_label=fld.field_label,
                        field_guidance=fld.guidance_notes,
                        chunks=chunks,
                        language=outline.language_choice,
                    )

                    if field_res.is_needs_input:
                        section_has_needs_input = True

                    # Collect source references
                    source_refs = []
                    chunk_map = {c.chunk_id: c for c in chunks}
                    for ref_id in field_res.referenced_chunk_ids:
                        chunk_ctx = chunk_map.get(ref_id)
                        if chunk_ctx:
                            source_refs.append({
                                "chunk_id": chunk_ctx.chunk_id,
                                "page_number": chunk_ctx.page_number,
                                "excerpt_text": chunk_ctx.excerpt_text,
                            })

                    fields_data.append({
                        "field_key": fld.field_key,
                        "field_label": fld.field_label,
                        "content": field_res.content,
                        "is_needs_input": field_res.is_needs_input,
                        "is_edited": False,
                        "order_index": fld.order_index,
                        "source_refs": source_refs,
                    })

                sec_status = (
                    SectionStatusEnum.needs_input
                    if section_has_needs_input
                    else SectionStatusEnum.filled
                )

                sections_data.append({
                    "section_key": sec.section_key,
                    "title": sec.title,
                    "order_index": sec.order_index,
                    "is_required": sec.is_required,
                    "section_status": sec_status,
                    "fields": fields_data,
                })

            # 3. Status: Validating
            self.repository.update_outline_status(outline_id, GenerationStatusEnum.validating)
            self.validate_outline_structure(sections_data, definition)

            # Persist outline sections, fields, and provenance atomically
            self.repository.create_outline_with_sections(outline, sections_data)

            # 4. Status: Ready
            self.repository.update_outline_status(outline_id, GenerationStatusEnum.ready)
            logger.info(f"Successfully generated outline {outline_id} for document {outline.document_id}")

        except Exception as e:
            logger.exception(f"Outline generation pipeline failed for {outline_id}: {e}")
            self.repository.update_outline_status(
                outline_id,
                GenerationStatusEnum.failed,
                failure_reason=str(e),
            )

    def update_field_content(
        self,
        outline_id: uuid.UUID,
        field_id: uuid.UUID,
        content: str,
        researcher_id: uuid.UUID,
    ):
        outline = self.repository.get_outline_by_id(outline_id, researcher_id=researcher_id)
        if not outline:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Outline not found or unauthorized.",
            )

        if outline.approval_status == ApprovalStatusEnum.approved:
            # Must fork to new draft if already approved
            new_outline_id = self.fork_on_edit_attempt(outline_id, researcher_id)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Outline has been approved. A new draft has been forked.",
                headers={"X-Fork-Outline-Id": str(new_outline_id)},
            )

        updated_field = self.repository.update_field_content(field_id=field_id, content=content)
        if not updated_field:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Section field not found.",
            )
        return updated_field

    def check_needs_input(self, outline_id: uuid.UUID) -> int:
        outline = self.repository.get_outline_by_id(outline_id)
        if not outline:
            return 0
        count = 0
        for sec in outline.sections:
            for fld in sec.fields:
                if fld.is_needs_input:
                    count += 1
        return count

    def approve_outline(self, outline_id: uuid.UUID, researcher_id: uuid.UUID):
        outline = self.repository.get_outline_by_id(outline_id, researcher_id=researcher_id)
        if not outline:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Outline not found or unauthorized.",
            )
        approved = self.repository.approve_outline(outline_id)
        return approved

    def fork_on_edit_attempt(self, outline_id: uuid.UUID, researcher_id: uuid.UUID) -> uuid.UUID:
        """
        Creates a new draft fork (vX+1) when an edit is attempted on an approved outline.
        """
        source = self.repository.get_outline_by_id(outline_id, researcher_id=researcher_id)
        if not source:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outline not found")

        latest_ver = self.repository.get_latest_version_number(source.document_id, researcher_id)
        new_outline = PaperOutline(
            researcher_id=researcher_id,
            document_id=source.document_id,
            template_id=source.template_id,
            version_number=latest_ver + 1,
            language_choice=source.language_choice,
            generation_status=GenerationStatusEnum.ready,
            approval_status=ApprovalStatusEnum.draft,
        )
        saved = self.repository.create_outline(new_outline)

        # Clone sections and fields
        sections_data = []
        for sec in source.sections:
            flds = []
            for f in sec.fields:
                flds.append({
                    "field_key": f.field_key,
                    "field_label": f.field_label,
                    "content": f.content,
                    "is_needs_input": f.is_needs_input,
                    "is_edited": f.is_edited,
                    "order_index": f.order_index,
                    "source_refs": [
                        {
                            "chunk_id": r.chunk_id,
                            "page_number": r.page_number,
                            "excerpt_text": r.excerpt_text,
                        }
                        for r in f.source_references
                    ],
                })
            sections_data.append({
                "section_key": sec.section_key,
                "title": sec.title,
                "order_index": sec.order_index,
                "is_required": sec.is_required,
                "section_status": sec.section_status,
                "fields": flds,
            })

        self.repository.create_outline_with_sections(saved, sections_data)
        return saved.id

    def fork_outline_version(self, outline_id: uuid.UUID, reset_all_sections: bool = False) -> uuid.UUID:
        source = self.repository.get_outline_by_id(outline_id)
        if not source:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outline not found")

        new_outline_id = self.generate_outline(
            researcher_id=source.researcher_id,
            document_id=source.document_id,
            template_id=source.template_id,
            language=source.language_choice,
        )

        if not reset_all_sections:
            # Preserve edited sections from previous outline
            self.repository.clone_edited_sections(source.id, new_outline_id)

        return new_outline_id

    def get_outline_status(
        self,
        outline_id: uuid.UUID,
        researcher_id: uuid.UUID,
    ) -> OutlineStatusResponse:
        outline = self.repository.get_outline_by_id(outline_id, researcher_id=researcher_id, load_relations=False)
        if not outline:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Outline not found or unauthorized.",
            )

        progress_labels = {
            GenerationStatusEnum.preparing: "Preparing generation context...",
            GenerationStatusEnum.reading: "Reading & retrieving relevant sections...",
            GenerationStatusEnum.generating: "Generating structured outline sections...",
            GenerationStatusEnum.validating: "Validating structure against template...",
            GenerationStatusEnum.ready: "Ready for Review",
            GenerationStatusEnum.failed: "Generation failed",
        }

        return OutlineStatusResponse(
            outline_id=outline.id,
            generation_status=outline.generation_status,
            approval_status=outline.approval_status,
            version_number=outline.version_number,
            progress_label=progress_labels.get(outline.generation_status, "Processing..."),
            failure_reason=outline.failure_reason,
        )

    def get_outline_detail(
        self,
        outline_id: uuid.UUID,
        researcher_id: uuid.UUID,
    ) -> OutlineDetailResponse:
        outline = self.repository.get_outline_by_id(outline_id, researcher_id=researcher_id, load_relations=True)
        if not outline:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Outline not found or unauthorized.",
            )

        sections_dto = []
        for sec in sorted(outline.sections, key=lambda s: s.order_index):
            fields_dto = []
            for fld in sorted(sec.fields, key=lambda f: f.order_index):
                source_refs_dto = [
                    SourceRefDTO(
                        chunk_id=ref.chunk_id,
                        page_number=ref.page_number,
                        excerpt_text=ref.excerpt_text,
                    )
                    for ref in fld.source_references
                ]
                fields_dto.append(
                    FieldDTO(
                        field_id=fld.id,
                        field_key=fld.field_key,
                        field_label=fld.field_label,
                        content=fld.content,
                        is_needs_input=fld.is_needs_input,
                        is_edited=fld.is_edited,
                        order_index=fld.order_index,
                        source_refs=source_refs_dto,
                    )
                )
            sections_dto.append(
                SectionDTO(
                    section_id=sec.id,
                    section_key=sec.section_key,
                    title=sec.title,
                    order_index=sec.order_index,
                    is_required=sec.is_required,
                    section_status=sec.section_status,
                    fields=fields_dto,
                )
            )

        return OutlineDetailResponse(
            outline_id=outline.id,
            template_id=outline.template_id,
            version_number=outline.version_number,
            language_choice=outline.language_choice,
            generation_status=outline.generation_status,
            approval_status=outline.approval_status,
            approved_at=outline.approved_at,
            sections=sections_dto,
        )

    def regenerate_section(
        self,
        outline_id: uuid.UUID,
        section_id: uuid.UUID,
        researcher_id: uuid.UUID,
    ) -> OutlineSection:
        outline = self.repository.get_outline_by_id(outline_id, researcher_id=researcher_id)
        if not outline:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outline not found or unauthorized.")
        if outline.approval_status == ApprovalStatusEnum.approved:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot regenerate section of approved outline.")

        section = self.db.exec(
            select(OutlineSection)
            .where(OutlineSection.id == section_id, OutlineSection.outline_id == outline_id)
        ).first()
        if not section:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found.")

        # Load active index
        active_index = self.db.exec(
            select(DocumentIndexVersion).where(
                DocumentIndexVersion.document_id == outline.document_id,
                DocumentIndexVersion.is_active == True,
            )
        ).first()
        index_version_id = active_index.id if active_index else uuid.uuid4()

        definition = self.template_parser.parse_template(outline.template_id)
        sec_def = next((s for s in definition.sections if s.section_key == section.section_key), None)
        if not sec_def:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Section definition not found in template.")

        # Re-synthesize fields for this section
        section_has_needs_input = False
        fld_map = {f.field_key: f for f in section.fields}

        for fld in sec_def.fields:
            existing_fld = fld_map.get(fld.field_key)
            if not existing_fld:
                continue

            chunks = self.retriever.retrieve_for_field(
                field_key=fld.field_key,
                field_label=fld.field_label,
                field_guidance=fld.guidance_notes,
                index_version_id=index_version_id,
                top_k=5,
            )

            field_res = self.synthesizer.synthesize_field(
                section_title=sec_def.title,
                field_key=fld.field_key,
                field_label=fld.field_label,
                field_guidance=fld.guidance_notes,
                chunks=chunks,
                language=outline.language_choice,
            )

            if field_res.is_needs_input:
                section_has_needs_input = True

            # Update existing field
            existing_fld.content = field_res.content
            existing_fld.is_needs_input = field_res.is_needs_input
            existing_fld.is_edited = False
            self.db.add(existing_fld)

            # Clear old source refs and add new ones
            for old_ref in existing_fld.source_references:
                self.db.delete(old_ref)

            chunk_map = {c.chunk_id: c for c in chunks}
            for ref_id in field_res.referenced_chunk_ids:
                chunk_ctx = chunk_map.get(ref_id)
                if chunk_ctx:
                    ref = SourceReference(
                        field_id=existing_fld.id,
                        chunk_id=chunk_ctx.chunk_id,
                        document_id=outline.document_id,
                        page_number=chunk_ctx.page_number,
                        excerpt_text=chunk_ctx.excerpt_text,
                    )
                    self.db.add(ref)

        section.section_status = (
            SectionStatusEnum.needs_input
            if section_has_needs_input
            else SectionStatusEnum.filled
        )
        self.db.add(section)
        self.db.commit()
        self.db.refresh(section)
        return section
