from fastapi import FastAPI

from app.api.v1 import genres
from app.core.config import settings


# Створюємо застосунок FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API для платформи рецензування музики",
    debug=settings.DEBUG,
)


# Підключаємо роутери API v1
app.include_router(genres.router, prefix="/api/v1")


@app.get("/")
async def root():
    """
    Кореневий ендпоінт. Повертає базову інформацію про API.
    Корисно для перевірки, що сервер живий.
    """
    return {
        "message": "Music Review API is running",
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """
    Health check ендпоінт. Використовується Kubernetes та іншими
    системами моніторингу, щоб зрозуміти, чи живий сервер.
    """
    return {"status": "healthy"}