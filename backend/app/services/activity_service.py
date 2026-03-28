from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ActivityFeed, User


def get_recent_activity(db: Session, limit: int = 20) -> list[dict]:
    """Повертає останні події для стрічки на головній."""
    stmt = (
        select(ActivityFeed, User.username, User.avatar_url, User.id.label("user_id"))
        .join(User, ActivityFeed.user_id == User.id)
        .order_by(ActivityFeed.created_at.desc())
        .limit(limit)
    )
    
    rows = db.execute(stmt).all()
    
    results = []
    for event, username, avatar_url, user_id in rows:
        metadata = event.extra_data or {}
        
        if event.action_type == "review_posted":
            track_title = metadata.get("track_title", f"трек #{event.target_id}")
            rating = metadata.get("rating", "?")
            text = f"{username} поставив {rating}/10 треку «{track_title}»"
        else:
            text = f"{username} виконав дію {event.action_type}"
        
        results.append({
            "id": event.id,
            "text": text,
            "action_type": event.action_type,
            "target_type": event.target_type,
            "target_id": event.target_id,
            "username": username,
            "avatar_url": avatar_url,
            "user_id": user_id,
            "created_at": event.created_at,
        })
    
    return results