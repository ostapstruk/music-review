from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.activity_service import get_recent_activity


router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("/")
async def list_activity(
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Стрічка останніх подій на платформі."""
    return get_recent_activity(db, limit=limit)