from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import Review, ReviewLike, Track, User

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

@router.get("/my-likes")
async def my_likes_count(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Кількість лайків на рецензіях поточного юзера."""
    from app.models import Review, ReviewLike
    
    count = db.execute(
        select(func.count(ReviewLike.user_id))
        .join(Review, ReviewLike.review_id == Review.id)
        .where(Review.user_id == current_user.id)
        .where(ReviewLike.is_like.is_(True))
    ).scalar() or 0
    
    return {"likes_received": count}