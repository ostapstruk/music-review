from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import activity, ai, auth, badges, genres, reviews, tracks, users
from app.core.config import settings


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API для платформи рецензування музики",
    debug=settings.DEBUG,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(activity.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(badges.router, prefix="/api/v1")
app.include_router(genres.router, prefix="/api/v1")
app.include_router(reviews.router, prefix="/api/v1")
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