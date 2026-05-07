from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import Artist, User
from app.schemas import PublicUserRead, UserCreate, UserRead, UserUpdate
from app.services import UserAlreadyExistsError, create_user


router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register_user(data: UserCreate, db: Session = Depends(get_db)):
    """
    Реєстрація. Створює юзера у статусі is_verified=false і одразу
    надсилає 6-значний код на email. Юзер активується через POST /auth/verify.
    Першого юзера у системі ставимо адміном і верифікованим автоматично.
    """
    from app.services.verification_service import issue_verification_code

    try:
        user = create_user(db, data)
    except UserAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    # Перший юзер уже верифікований (auto-admin) → пропускаємо лист.
    if not user.is_verified:
        try:
            await issue_verification_code(db, user, enforce_cooldown=False)
        except Exception:
            # Помилка SMTP не повинна валити саму реєстрацію — юзер може
            # запросити повторне надсилання через /auth/resend-code.
            pass

    return _user_to_dict(user, _claimed_artist_id(db, user.id))


def _user_to_dict(user: User, claimed_artist_id: int | None) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "created_at": user.created_at,
        "is_verified_artist": claimed_artist_id is not None,
    }


def _claimed_artist_id(db: Session, user_id: int) -> int | None:
    return db.execute(
        select(Artist.id).where(Artist.claimed_by_user_id == user_id)
    ).scalar_one_or_none()


@router.get("/me", response_model=UserRead)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Мій профіль."""
    return _user_to_dict(current_user, _claimed_artist_id(db, current_user.id))


@router.put("/me", response_model=UserRead)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Оновити профіль."""
    if data.bio is not None:
        current_user.bio = data.bio
    if data.avatar_url is not None:
        current_user.avatar_url = data.avatar_url
    db.commit()
    db.refresh(current_user)
    return _user_to_dict(current_user, _claimed_artist_id(db, current_user.id))

@router.get("/by-username/{username}")
async def get_user_by_username(username: str, db: Session = Depends(get_db)):
    """
    Мінімальний lookup за username — для @-mention-ів у коментарях.
    Повертає лише id, щоб фронт зробив редірект на /users/{id}.
    """
    user = db.execute(
        select(User).where(User.username == username)
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user.id, "username": user.username}


@router.get("/{user_id}/public", response_model=PublicUserRead)
async def get_user_public(user_id: int, db: Session = Depends(get_db)):
    """
    Публічний профіль будь-якого юзера. Якщо юзер володіє артистом
    (через claim-флоу), додаємо artist_id/artist_name/artist_image_url,
    щоб на фронті можна було показати кнопку на сторінку артиста.
    """
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    artist = db.execute(
        select(Artist).where(Artist.claimed_by_user_id == user_id)
    ).scalar_one_or_none()

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "created_at": user.created_at,
        "is_verified_artist": artist is not None,
        "artist_id": artist.id if artist else None,
        "artist_name": artist.name if artist else None,
        "artist_image_url": artist.image_url if artist else None,
    }