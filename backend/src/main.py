from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.src.core.config import settings
from backend.src.auth.router import router as auth_router

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for Paper Generator with Google OAuth 2.0 and pgvector",
    version="1.0.0",
    debug=settings.DEBUG,
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


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
