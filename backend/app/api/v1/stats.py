from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Review, Track, User


router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/")
async def platform_stats(db: Session = Depends(get_db)):
    """Загальна статистика платформи."""
    tracks_count = db.execute(select(func.count(Track.id))).scalar() or 0
    reviews_count = db.execute(select(func.count(Review.id))).scalar() or 0
    users_count = db.execute(select(func.count(User.id))).scalar() or 0
    
    return {
        "tracks_count": tracks_count,
        "reviews_count": reviews_count,
        "users_count": users_count,
    }