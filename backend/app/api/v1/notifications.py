from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User
from app.services.notification_service import (
    get_unread_count,
    list_notifications,
    mark_all_read,
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
    """Кількість непрочитаних сповіщень — для червоної точки в навбарі."""
    return {"count": get_unread_count(db, current_user.id)}


@router.post("/mark-all-read")
async def mark_all_my_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Позначити всі сповіщення як прочитані. Зазвичай викликаємо при відкритті сторінки."""
    updated = mark_all_read(db, current_user.id)
    return {"updated": updated}
