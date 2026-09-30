import uuid
import logging
from typing import Optional
from sqlmodel import Session

from backend.src.core.database import engine
from backend.src.outlines.service import OutlineService, OutlineValidationError
from backend.src.outlines.models import GenerationStatusEnum

logger = logging.getLogger(__name__)


def run_outline_generation_pipeline(
    outline_id: uuid.UUID,
    session: Optional[Session] = None,
    max_retries: int = 2,
) -> None:
    """
    Executes the outline generation pipeline in an async background task or worker thread.
    Includes automated retries for schema/structure validation errors (FR-010).
    """
    logger.info(f"Starting outline generation background worker for outline_id={outline_id}")

    def _execute(db: Session):
        service = OutlineService(db=db)
        outline = service.repository.get_outline_by_id(outline_id, load_relations=False)
        if not outline:
            logger.error(f"Worker cannot find outline {outline_id}")
            return

        attempts = 0
        while attempts <= max_retries:
            attempts += 1
            try:
                service.run_generation_pipeline(outline_id)
                current = service.repository.get_outline_by_id(outline_id, load_relations=False)
                if current and current.generation_status == GenerationStatusEnum.ready:
                    logger.info(f"Worker completed outline {outline_id} on attempt {attempts}")
                    return
                elif current and current.generation_status == GenerationStatusEnum.failed and attempts <= max_retries:
                    logger.warning(f"Generation attempt {attempts} failed. Retrying... (max={max_retries})")
                    continue
                else:
                    break
            except OutlineValidationError as e:
                logger.warning(f"Structure validation failed on attempt {attempts}: {e}")
                if attempts > max_retries:
                    service.repository.update_outline_status(
                        outline_id,
                        GenerationStatusEnum.failed,
                        failure_reason=f"Structural validation failed after {attempts} attempts: {e}",
                    )
                    break
            except Exception as e:
                logger.exception(f"Unexpected error in outline worker attempt {attempts}: {e}")
                if attempts > max_retries:
                    service.repository.update_outline_status(
                        outline_id,
                        GenerationStatusEnum.failed,
                        failure_reason=str(e),
                    )
                    break

    if session:
        _execute(session)
    else:
        with Session(engine) as db:
            _execute(db)
