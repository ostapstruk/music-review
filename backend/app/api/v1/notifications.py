from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User
from app.services.notification_service import (
    get_unread_count,
    list_notifications,
    mark_all_seen,
    mark_read,
)


router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/")
async def list_my_notifications(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Останні сповіщення поточного юзера, з даними автора і назвою треку."""
    return list_notifications(db, current_user.id, limit=limit, offset=offset)


@router.get("/unread-count")
async def get_my_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Кількість для бейджа на дзвонику. Зменшується після виклику
    POST /notifications/mark-all-seen — а не при кліку на айтем.
    """
    return {"count": get_unread_count(db, current_user.id)}


@router.post("/mark-all-seen")
async def mark_all_my_seen(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Викликається при відкритті сторінки /notifications. Лічильник на
    дзвонику обнуляється, але виділення на конкретних айтемах лишається,
    доки юзер не клацне по них (POST /notifications/{id}/mark-read).
    """
    updated = mark_all_seen(db, current_user.id)
    return {"updated": updated}


@router.post("/{notification_id}/mark-read")
async def mark_my_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Конкретний айтем — юзер клацнув, прибираємо виділення (is_read=true)."""
    ok = mark_read(db, current_user.id, notification_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return {"status": "ok"}
