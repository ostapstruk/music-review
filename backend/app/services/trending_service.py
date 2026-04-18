import math
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Artist, Review, Track


def get_trending_tracks(
    db: Session,
    limit: int = 10,
    period_days: int = 7,
) -> list[dict]:
    """
    Повертає топ-чарт треків за алгоритмом Trending.
    
    Формула:
        score = avg_rating × log2(1 + recent_reviews) × time_decay
    
    Де:
    - avg_rating — середня оцінка треку (усі часи)
    - recent_reviews — кількість рецензій за останні period_days днів
    - time_decay = 1 / (1 + days_since_last_review / 7)
    
    Треки без жодної рецензії не потрапляють у чарт.
    """
    now = datetime.now(timezone.utc)
    period_start = now - timedelta(days=period_days)
    
    # Підзапит: статистика по кожному треку
    stats = (
        select(
            Review.track_id,
            func.avg(Review.rating).label("avg_rating"),
            func.count(Review.id).label("total_reviews"),
            func.count(Review.id)
                .filter(Review.created_at >= period_start)
                .label("recent_reviews"),
            func.max(Review.created_at).label("last_review_at"),
        )
        .group_by(Review.track_id)
        .subquery()
    )
    
    # Основний запит: трек + артист + статистика
    stmt = (
        select(
            Track,
            Artist.name.label("artist_name"),
            stats.c.avg_rating,
            stats.c.total_reviews,
            stats.c.recent_reviews,
            stats.c.last_review_at,
        )
        .join(Artist, Track.artist_id == Artist.id)
        .join(stats, Track.id == stats.c.track_id)
    )
    
    rows = db.execute(stmt).all()
    
    # Обчислюємо trending score на стороні Python
    results = []
    for track, artist_name, avg_rating, total_reviews, recent_reviews, last_review_at in rows:
        # Компонент 1: середній бал
        avg = float(avg_rating)
        
        # Компонент 2: логарифм активності
        activity = math.log2(1 + recent_reviews)
        
        # Компонент 3: часове загасання
        if last_review_at is not None:
            days_since = (now - last_review_at).total_seconds() / 86400
            time_decay = 1.0 / (1.0 + days_since / 7.0)
        else:
            time_decay = 0.0
        
        # Фінальний скор
        score = avg * activity * time_decay
        
        results.append({
            "id": track.id,
            "title": track.title,
            "artist_id": track.artist_id,
            "artist_name": artist_name,
            "cover_url": track.cover_url,
            "spotify_id": track.spotify_id,
            "duration_ms": track.duration_ms,
            "album_id": track.album_id,
            "avg_rating": round(avg, 1),
            "reviews_count": total_reviews,
            "recent_reviews": recent_reviews,
            "trending_score": round(score, 2),
        })
    
    # Сортуємо за score і беремо top N
    results.sort(key=lambda x: x["trending_score"], reverse=True)
    return results[:limit]