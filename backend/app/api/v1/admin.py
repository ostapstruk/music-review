from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.models import Artist, User
from app.schemas import ArtistClaimAdminRead, ArtistClaimRead, UserRead
from app.services.artist_service import (
    ClaimAlreadyResolvedError,
    ClaimConflictError,
    ClaimNotFoundError,
    approve_claim,
    list_claims,
    reject_claim,
)
from app.services.track_service import (
    TrackAlreadyReviewedError,
    TrackNotFoundError,
    approve_track,
    list_track_submissions,
    reject_track,
)


VALID_ROLES = ("listener", "artist", "admin")


class RoleChangeRequest(BaseModel):
    role: str = Field(..., pattern="^(listener|artist|admin)$")


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/claims", response_model=list[ArtistClaimAdminRead])
async def admin_list_claims(
    status_filter: str | None = Query(
        None, alias="status", pattern="^(pending|approved|rejected)$",
    ),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Список claim-запитів. Опційно фільтр за статусом."""
    return list_claims(db, status_filter=status_filter)


@router.post("/claims/{claim_id}/approve", response_model=ArtistClaimRead)
async def admin_approve_claim(
    claim_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Підтвердити володіння артистом. Юзер отримає role='artist'."""
    try:
        return approve_claim(db, claim_id, current_admin.id)
    except ClaimNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ClaimAlreadyResolvedError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except ClaimConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/claims/{claim_id}/reject", response_model=ArtistClaimRead)
async def admin_reject_claim(
    claim_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Відхилити claim."""
    try:
        return reject_claim(db, claim_id, current_admin.id)
    except ClaimNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ClaimAlreadyResolvedError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.patch("/users/{user_id}/role", response_model=UserRead)
async def admin_change_user_role(
    user_id: int,
    data: RoleChangeRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Адмін змінює роль будь-якого юзера.
    Не дозволяє адміну понизити самого себе (захист від лок-ауту).
    Якщо у юзера був заклеймлений артист, а ми переводимо його з 'artist'
    у 'listener' — claim лишається, але доступ до /artist кабінету
    зникає (require_artist його заблокує). Адмін може потім переклеймити.
    """
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role",
        )

    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.role = data.role
    db.commit()
    db.refresh(user)

    artist_id = db.execute(
        select(Artist.id).where(Artist.claimed_by_user_id == user.id)
    ).scalar_one_or_none()
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "created_at": user.created_at,
        "is_verified_artist": artist_id is not None,
    }


# =============================================================================
# Track moderation
# =============================================================================

@router.get("/track-submissions")
async def admin_list_track_submissions(
    status_filter: str | None = Query(
        None, alias="status", pattern="^(pending|approved|rejected)$",
    ),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Список заявок на додавання треку. Опційно фільтр за статусом."""
    return list_track_submissions(db, status_filter=status_filter)


@router.post("/track-submissions/{track_id}/approve")
async def admin_approve_track(
    track_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Адмін підтверджує заявку на трек — він стає публічним."""
    try:
        track = approve_track(db, track_id, current_admin.id)
    except TrackNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except TrackAlreadyReviewedError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return {"id": track.id, "status": track.status}


@router.post("/track-submissions/{track_id}/reject")
async def admin_reject_track(
    track_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Адмін відхиляє заявку. Трек лишається у БД зі статусом 'rejected'."""
    try:
        track = reject_track(db, track_id, current_admin.id)
    except TrackNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except TrackAlreadyReviewedError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return {"id": track.id, "status": track.status}
