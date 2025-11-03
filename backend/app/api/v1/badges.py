from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Badge
from app.schemas import BadgeRead


router = APIRouter(prefix="/badges", tags=["badges"])


# Дозволені значення tier — використаємо у фільтрі
ALLOWED_TIERS = {"bronze", "silver", "gold", "diamond"}


@router.get("/", response_model=list[BadgeRead])
async def list_badges(
    tier: str | None = Query(
        None,
        description="Фільтр за рівнем: bronze / silver / gold / diamond",
    ),
    db: Session = Depends(get_db),
):
    """
    Повертає всі бейджі. Можна фільтрувати за рівнем (tier).
    
    Приклад: GET /api/v1/badges/?tier=gold
    """
    if tier is not None and tier not in ALLOWED_TIERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid tier '{tier}'. Allowed: {sorted(ALLOWED_TIERS)}",
        )
    
    stmt = select(Badge)
    if tier is not None:
        stmt = stmt.where(Badge.tier == tier)
    stmt = stmt.order_by(Badge.tier, Badge.name)
    
    result = db.execute(stmt)
    badges = result.scalars().all()
    return badges


@router.get("/{code}", response_model=BadgeRead)
async def get_badge_by_code(code: str, db: Session = Depends(get_db)):
    """
    Повертає один бейдж за унікальним кодом (наприклад, 'strict_critic').
    """
    stmt = select(Badge).where(Badge.code == code)
    result = db.execute(stmt)
    badge = result.scalar_one_or_none()
    
    if badge is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Badge with code '{code}' not found",
        )
    
    return badge