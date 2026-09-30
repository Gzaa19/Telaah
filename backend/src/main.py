import os
import sys

# Ensure repository root and backend directory are in sys.path
_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

_BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.src.core.config import settings
from backend.src.auth.router import router as auth_router
from backend.src.drive.router import router as drive_router
from backend.src.documents.router import router as document_router
from backend.src.indexing.router import router as indexing_router
from backend.src.outlines.router import router as outlines_router

tags_metadata = [
    {
        "name": "Authentication",
        "description": "Google OAuth 2.0 authentication, callback, researcher profile, and session management.",
    },
    {
        "name": "Google Drive",
        "description": "Browse and search research files and folders in Google Drive using drive.readonly scope.",
    },
    {
        "name": "Documents",
        "description": "Import documents, background text extraction (PDF/DOCX), status tracking, and retry processing.",
    },
    {
        "name": "Document Indexing & Search",
        "description": "Document cleaning, local embedding generation (multilingual-e5-base), pgvector storage, and similarity search.",
    },
    {
        "name": "Paper Outlines",
        "description": "Template-based paper outline generation, section retrieval, LLM synthesis, editing, and versioning (UC-04).",
    },
    {
        "name": "Health",
        "description": "System health and liveness checks.",
    },
]

app = FastAPI(
    title="Telaah API: AI Scientific Journal Paper & Manuscript Generator",
    description="Backend REST API for Telaah. Provides Google OAuth 2.0, Google Drive document import and text extraction (UC-02), and pgvector citation indexing.",
    version="1.2.0",
    debug=settings.DEBUG,
    openapi_tags=tags_metadata,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(drive_router)
app.include_router(document_router)
app.include_router(indexing_router)
app.include_router(outlines_router)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
