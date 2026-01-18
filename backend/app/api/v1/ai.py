from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.ai_service import get_ai_summary


router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/summary/{track_id}")
async def track_summary(track_id: int, db: Session = Depends(get_db)):
    """
    Повертає ШІ-згенерований підсумок рецензій до треку.
    Мінімум 3 рецензії для генерації.
    Результат кешується — повторні запити швидкі.
    """
    result = get_ai_summary(db, track_id)
    
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Недостатньо рецензій для генерації підсумку (мінімум 3)",
        )
    
    return result