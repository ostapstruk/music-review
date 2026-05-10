import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.v1 import (
    activity,
    admin,
    ai,
    artists,
    auth,
    badges,
    genres,
    notifications,
    reviews,
    stats,
    tracks,
    users,
)
from app.core.config import settings
from app.services.preview_refresh_task import periodic_preview_refresh


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Фонова таска оновлення preview_url стартує разом з бекендом."""
    task = asyncio.create_task(periodic_preview_refresh())
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API для платформи рецензування музики",
    debug=settings.DEBUG,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # У продакшні замінити на конкретні домени
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus метрики на /metrics
Instrumentator().instrument(app).expose(app)

app.include_router(activity.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(artists.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(badges.router, prefix="/api/v1")
app.include_router(genres.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(reviews.router, prefix="/api/v1")
app.include_router(stats.router, prefix="/api/v1")
app.include_router(tracks.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "message": "Music Review API is running",
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}