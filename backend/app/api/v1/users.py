from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User
from app.schemas import UserCreate, UserRead, UserUpdate
from app.services import UserAlreadyExistsError, create_user


router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register_user(data: UserCreate, db: Session = Depends(get_db)):
    """Реєстрація."""
    try:
        user = create_user(db, data)
    except UserAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return user


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)):
    """Мій профіль."""
    return current_user


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
    return current_user

@router.get("/{user_id}/public", response_model=UserRead)
async def get_user_public(user_id: int, db: Session = Depends(get_db)):
    """Публічний профіль будь-якого юзера."""
    from sqlalchemy import select
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user