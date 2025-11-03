from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Genre
from app.schemas import GenreRead


router = APIRouter(prefix="/genres", tags=["genres"])


@router.get("/", response_model=list[GenreRead])
async def list_genres(db: Session = Depends(get_db)):
    """
    Повертає всі жанри, відсортовані за назвою.
    """
    stmt = select(Genre).order_by(Genre.name)
    result = db.execute(stmt)
    genres = result.scalars().all()
    return genres


@router.get("/{slug}", response_model=GenreRead)
async def get_genre_by_slug(slug: str, db: Session = Depends(get_db)):
    """
    Повертає один жанр за його slug.
    Якщо жанр не знайдено — повертає 404.
    """
    stmt = select(Genre).where(Genre.slug == slug)
    result = db.execute(stmt)
    genre = result.scalar_one_or_none()
    
    if genre is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Genre with slug '{slug}' not found",
        )
    
    return genre