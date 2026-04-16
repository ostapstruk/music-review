from fastapi import FastAPI

from app.api.v1 import auth, badges, genres, tracks, users
from app.core.config import settings


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API для платформи рецензування музики",
    debug=settings.DEBUG,
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(badges.router, prefix="/api/v1")
app.include_router(genres.router, prefix="/api/v1")
app.include_router(tracks.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")


@app.get("/")
async def root():
    """Кореневий ендпоінт."""
    return {
        "message": "Music Review API is running",
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check."""
    return {"status": "healthy"}