from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Review, ReviewLike, Track, User


class TrackNotFoundError(Exception):
    pass


class AlreadyReviewedError(Exception):
    pass


def create_review(
    db: Session,
    user_id: int,
    track_id: int,
    rating: int,
    text: str | None,
) -> dict:
    """
    Створює рецензію від користувача на трек.
    
    Кидає TrackNotFoundError, якщо трек не існує.
    Кидає AlreadyReviewedError, якщо юзер вже оцінив цей трек.
    """
    # 1. Перевірити, що трек існує
    track = db.execute(
        select(Track).where(Track.id == track_id)
    ).scalar_one_or_none()
    
    if track is None:
        raise TrackNotFoundError(f"Track {track_id} not found")
    
    # 2. Перевірити, чи юзер ще не оцінював цей трек
    existing = db.execute(
        select(Review).where(
            Review.user_id == user_id,
            Review.track_id == track_id,
        )
    ).scalar_one_or_none()
    
    if existing is not None:
        raise AlreadyReviewedError(
            f"User {user_id} already reviewed track {track_id}"
        )
    
    # 3. Створюємо рецензію
    review = Review(
        user_id=user_id,
        track_id=track_id,
        rating=rating,
        text=text,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    # 4. Записуємо в activity feed
    from app.models.activity_feed import ActivityFeed
    import json
    
    # Отримуємо назву треку для metadata
    track_title = track.title
    
    activity = ActivityFeed(
        user_id=user_id,
        action_type="review_posted",
        target_type="track",
        target_id=track_id,
        extra_data={"rating": rating, "track_title": track_title},
    )
    db.add(activity)
    db.commit()
    
    # 5. Повертаємо з username
    
    # 4. Повертаємо з username
    username = db.execute(
        select(User.username).where(User.id == user_id)
    ).scalar_one()
    
    return _review_to_dict(review, username)


def get_reviews_for_track(
    db: Session,
    track_id: int,
    limit: int = 20,
    offset: int = 0,
) -> list[dict]:
    """
    Повертає список рецензій для треку, відсортованих
    за корисністю (лайки - дизлайки) та датою.
    """
    # Підзапит для підрахунку лайків/дизлайків
    likes_sub = (
        select(
            ReviewLike.review_id,
            func.count(ReviewLike.user_id)
                .filter(ReviewLike.is_like.is_(True))
                .label("likes_count"),
            func.count(ReviewLike.user_id)
                .filter(ReviewLike.is_like.is_(False))
                .label("dislikes_count"),
        )
        .group_by(ReviewLike.review_id)
        .subquery()
    )
    
    stmt = (
        select(
            Review,
            User.username,
            func.coalesce(likes_sub.c.likes_count, 0).label("likes_count"),
            func.coalesce(likes_sub.c.dislikes_count, 0).label("dislikes_count"),
        )
        .join(User, Review.user_id == User.id)
        .outerjoin(likes_sub, Review.id == likes_sub.c.review_id)
        .where(Review.track_id == track_id)
        .order_by(
            (func.coalesce(likes_sub.c.likes_count, 0)
             - func.coalesce(likes_sub.c.dislikes_count, 0)).desc(),
            Review.created_at.desc(),
        )
        .limit(limit)
        .offset(offset)
    )
    
    rows = db.execute(stmt).all()
    
    return [
        _review_to_dict(review, username, likes, dislikes)
        for review, username, likes, dislikes in rows
    ]


def get_reviews_by_user(
    db: Session,
    user_id: int,
    limit: int = 20,
    offset: int = 0,
) -> list[dict]:
    """Повертає рецензії конкретного користувача (для профілю)."""
    stmt = (
        select(Review, User.username)
        .join(User, Review.user_id == User.id)
        .where(Review.user_id == user_id)
        .order_by(Review.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    
    rows = db.execute(stmt).all()
    return [_review_to_dict(review, username) for review, username in rows]


def _review_to_dict(
    review: Review,
    username: str,
    likes_count: int = 0,
    dislikes_count: int = 0,
) -> dict:
    """Допоміжна функція — перетворює Review на словник."""
    return {
        "id": review.id,
        "user_id": review.user_id,
        "track_id": review.track_id,
        "rating": review.rating,
        "text": review.text,
        "created_at": review.created_at,
        "updated_at": review.updated_at,
        "username": username,
        "likes_count": likes_count,
        "dislikes_count": dislikes_count,
    }


def toggle_review_like(
    db: Session,
    user_id: int,
    review_id: int,
    is_like: bool,
) -> dict:
    """
    Ставить лайк або дизлайк на рецензію.
    
    Логіка:
    - Якщо голосу не було — створюємо.
    - Якщо був такий самий (лайк → лайк) — видаляємо (toggle off).
    - Якщо був протилежний (лайк → дизлайк) — змінюємо.
    
    Повертає поточний стан: {"status": "liked" | "disliked" | "removed"}.
    """
    # Перевіряємо, що рецензія існує
    review = db.execute(
        select(Review).where(Review.id == review_id)
    ).scalar_one_or_none()
    
    if review is None:
        raise TrackNotFoundError(f"Review {review_id} not found")
    
    # Перевіряємо, що юзер не лайкає свою ж рецензію
    if review.user_id == user_id:
        raise AlreadyReviewedError("Cannot like your own review")
    
    # Шукаємо існуючий голос
    existing = db.execute(
        select(ReviewLike).where(
            ReviewLike.user_id == user_id,
            ReviewLike.review_id == review_id,
        )
    ).scalar_one_or_none()
    
    if existing is None:
        # Голосу не було — створюємо
        like = ReviewLike(
            user_id=user_id,
            review_id=review_id,
            is_like=is_like,
        )
        db.add(like)
        db.commit()
        return {"status": "liked" if is_like else "disliked"}
    
    if existing.is_like == is_like:
        # Той самий голос — видаляємо (toggle off)
        db.delete(existing)
        db.commit()
        return {"status": "removed"}
    
    # Протилежний голос — змінюємо
    existing.is_like = is_like
    db.commit()
    return {"status": "liked" if is_like else "disliked"}

def get_rating_distribution(db: Session, track_id: int) -> list[dict]:
    """Повертає розподіл оцінок (скільки 10, скільки 9, ... скільки 1)."""
    stmt = (
        select(Review.rating, func.count(Review.id).label("count"))
        .where(Review.track_id == track_id)
        .group_by(Review.rating)
        .order_by(Review.rating.desc())
    )
    rows = db.execute(stmt).all()
    
    # Заповнюємо всі 10 значень (навіть ті, де 0)
    dist_map = {r: c for r, c in rows}
    return [{"rating": r, "count": dist_map.get(r, 0)} for r in range(10, 0, -1)]

def delete_review(db: Session, review_id: int, user_id: int) -> bool:
    """
    Видаляє рецензію. Тільки автор може видалити свою рецензію.
    Повертає True якщо видалено, False якщо не знайдено.
    Кидає PermissionError якщо чужа рецензія.
    """
    review = db.execute(
        select(Review).where(Review.id == review_id)
    ).scalar_one_or_none()
    
    if review is None:
        return False
    
    if review.user_id != user_id:
        raise PermissionError("Cannot delete another user's review")
    
    db.delete(review)
    db.commit()
    return True