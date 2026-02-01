from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User
from app.schemas import ReviewCreate, ReviewRead
from app.services.review_service import (
    AlreadyReviewedError,
    TrackNotFoundError,
    create_review,
    delete_review,
    get_rating_distribution,
    get_reviews_by_user,
    get_reviews_for_track,
    toggle_review_like,
)


router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post(
    "/",
    response_model=ReviewRead,
    status_code=status.HTTP_201_CREATED,
)
async def post_review(
    data: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Створює рецензію на трек від імені поточного користувача.
    Один користувач може написати тільки одну рецензію на трек.
    """
    try:
        review = create_review(
            db,
            user_id=current_user.id,
            track_id=data.track_id,
            rating=data.rating,
            text=data.text,
        )
    except TrackNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Track {data.track_id} not found",
        )
    except AlreadyReviewedError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already reviewed this track",
        )
    
    return review


@router.get("/track/{track_id}", response_model=list[ReviewRead])
async def list_track_reviews(
    track_id: int,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Повертає рецензії до конкретного треку.
    Відсортовані за корисністю (лайки - дизлайки).
    """
    return get_reviews_for_track(db, track_id, limit, offset)


@router.get("/user/{user_id}", response_model=list[ReviewRead])
async def list_user_reviews(
    user_id: int,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Повертає рецензії конкретного користувача.
    Для сторінки профілю.
    """
    return get_reviews_by_user(db, user_id, limit, offset)

@router.get("/distribution/{track_id}")
async def rating_distribution(track_id: int, db: Session = Depends(get_db)):
    """Розподіл оцінок треку (для гістограми)."""
    return get_rating_distribution(db, track_id)

@router.delete("/{review_id}", status_code=204)
async def remove_review(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Видалити свою рецензію."""
    try:
        deleted = delete_review(db, review_id, current_user.id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Review not found")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.post("/like/{review_id}")
async def like_review(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Поставити лайк на рецензію."""
    try:
        return toggle_review_like(db, current_user.id, review_id, is_like=True)
    except TrackNotFoundError:
        raise HTTPException(status_code=404, detail="Review not found")
    except AlreadyReviewedError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/dislike/{review_id}")
async def dislike_review(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Поставити дизлайк на рецензію."""
    try:
        return toggle_review_like(db, current_user.id, review_id, is_like=False)
    except TrackNotFoundError:
        raise HTTPException(status_code=404, detail="Review not found")
    except AlreadyReviewedError as e:
        raise HTTPException(status_code=403, detail=str(e))