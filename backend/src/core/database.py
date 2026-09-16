from typing import Generator
from sqlmodel import Session, create_engine
from backend.src.core.config import settings

engine = create_engine(
    settings.sync_database_url,
    echo=settings.DEBUG,
    pool_pre_ping=True
)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
