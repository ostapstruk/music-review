from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.models import Artist, Review, ReviewLike, ReviewReply, Track, User


def _get_verified_user_ids(db: Session, user_ids: set[int]) -> set[int]:
    """Знаходить серед заданих юзерів тих, хто володіє артистом."""
    if not user_ids:
        return set()
    rows = db.execute(
        select(Artist.claimed_by_user_id).where(
            Artist.claimed_by_user_id.in_(user_ids)
        )
    ).scalars().all()
    return set(rows)

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
    
    # 5. Повертаємо з username, роллю та статусом верифікації
    row = db.execute(
        select(User.username, User.role).where(User.id == user_id)
    ).one()
    username, role = row
    verified = bool(_get_verified_user_ids(db, {user_id}))

    return _review_to_dict(
        review, username, role=role, is_verified_artist=verified,
    )


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
            User.avatar_url,
            User.role,
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
    user_ids = {review.user_id for review, *_ in rows}
    verified_ids = _get_verified_user_ids(db, user_ids)

    return [
        _review_to_dict(
            review, username, likes, dislikes, avatar_url,
            role=role,
            is_verified_artist=review.user_id in verified_ids,
        )
        for review, username, avatar_url, role, likes, dislikes in rows
    ]

def get_reviews_by_user(
    db: Session,
    user_id: int,
    limit: int = 20,
    offset: int = 0,
) -> list[dict]:
    """Повертає рецензії конкретного користувача (для профілю)."""
    stmt = (
        select(
            Review,
            User.username,
            User.role,
            Track.title.label("track_title"),
            Track.cover_url.label("track_cover"),
        )
        .join(User, Review.user_id == User.id)
        .join(Track, Review.track_id == Track.id)
        .where(Review.user_id == user_id)
        .order_by(Review.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    rows = db.execute(stmt).all()
    verified = bool(_get_verified_user_ids(db, {user_id}))
    return [
        {
            **_review_to_dict(
                review, username, role=role, is_verified_artist=verified,
            ),
            "track_title": track_title,
            "track_cover": track_cover,
        }
        for review, username, role, track_title, track_cover in rows
    ]

def _review_to_dict(
    review: Review,
    username: str,
    likes_count: int = 0,
    dislikes_count: int = 0,
    avatar_url: str | None = None,
    role: str | None = None,
    is_verified_artist: bool = False,
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
        "avatar_url": avatar_url,
        "role": role,
        "is_verified_artist": is_verified_artist,
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

def delete_review(
    db: Session,
    review_id: int,
    user_id: int,
    is_admin: bool = False,
) -> bool:
    """
    Видаляє рецензію. Автор може видалити лише свою; адмін — будь-яку.
    Повертає True якщо видалено, False якщо не знайдено.
    Кидає PermissionError якщо це не свій запис і не адмін.
    """
    review = db.execute(
        select(Review).where(Review.id == review_id)
    ).scalar_one_or_none()

    if review is None:
        return False

    if not is_admin and review.user_id != user_id:
        raise PermissionError("Cannot delete another user's review")

    db.delete(review)
    db.commit()
    return True

def get_user_votes(db: Session, user_id: int, track_id: int) -> dict:
    """
    Повертає голоси юзера за рецензіями конкретного треку.
    Формат: {review_id: 'like' або 'dislike'}
    """
    stmt = (
        select(ReviewLike.review_id, ReviewLike.is_like)
        .join(Review, ReviewLike.review_id == Review.id)
        .where(
            ReviewLike.user_id == user_id,
            Review.track_id == track_id,
        )
    )
    rows = db.execute(stmt).all()

    return {
        str(review_id): "like" if is_like else "dislike"
        for review_id, is_like in rows
    }


# ----------------------------------------------------------------------------
# Replies (плоскі коментарі під рецензією)
# ----------------------------------------------------------------------------

class ReplyNotFoundError(Exception):
    pass


class ReviewNotFoundError(Exception):
    pass


def _reply_to_dict(
    reply: ReviewReply,
    username: str | None,
    avatar_url: str | None,
    role: str | None,
    is_verified_artist: bool,
) -> dict:
    return {
        "id": reply.id,
        "review_id": reply.review_id,
        "user_id": reply.user_id,
        "text": reply.text,
        "created_at": reply.created_at,
        "updated_at": reply.updated_at,
        "username": username,
        "avatar_url": avatar_url,
        "role": role,
        "is_verified_artist": is_verified_artist,
    }


def get_replies_for_review(
    db: Session, review_id: int, limit: int = 100, offset: int = 0,
) -> list[dict]:
    """Усі відповіді під рецензією, найстарші — перші (хронологічно)."""
    stmt = (
        select(ReviewReply, User.username, User.avatar_url, User.role)
        .join(User, ReviewReply.user_id == User.id)
        .where(ReviewReply.review_id == review_id)
        .order_by(ReviewReply.created_at.asc())
        .limit(limit)
        .offset(offset)
    )
    rows = db.execute(stmt).all()
    user_ids = {reply.user_id for reply, *_ in rows}
    verified_ids = _get_verified_user_ids(db, user_ids)

    return [
        _reply_to_dict(
            reply, username, avatar_url, role,
            is_verified_artist=reply.user_id in verified_ids,
        )
        for reply, username, avatar_url, role in rows
    ]


def create_reply(
    db: Session, user_id: int, review_id: int, text: str,
) -> dict:
    """Створює відповідь під рецензією."""
    review = db.execute(
        select(Review).where(Review.id == review_id)
    ).scalar_one_or_none()
    if review is None:
        raise ReviewNotFoundError(f"Review {review_id} not found")

    reply = ReviewReply(
        review_id=review_id,
        user_id=user_id,
        text=text.strip(),
    )
    db.add(reply)
    db.commit()
    db.refresh(reply)

    row = db.execute(
        select(User.username, User.avatar_url, User.role).where(User.id == user_id)
    ).one()
    username, avatar_url, role = row
    verified = bool(_get_verified_user_ids(db, {user_id}))
    return _reply_to_dict(reply, username, avatar_url, role, verified)


def delete_reply(
    db: Session, reply_id: int, user_id: int, is_admin: bool = False,
) -> bool:
    """
    Видаляє відповідь. Автор може видалити свою; адмін — будь-яку.
    Повертає True якщо видалено, False якщо не знайдено.
    """
    reply = db.execute(
        select(ReviewReply).where(ReviewReply.id == reply_id)
    ).scalar_one_or_none()
    if reply is None:
        return False

    if not is_admin and reply.user_id != user_id:
        raise PermissionError("Cannot delete another user's reply")

    db.delete(reply)
    db.commit()
    return True