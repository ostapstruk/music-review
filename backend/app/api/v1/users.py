from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User
from app.schemas import UserCreate, UserRead
from app.services import UserAlreadyExistsError, create_user


router = APIRouter(prefix="/users", tags=["users"])


@router.post(
    "/",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
)
async def register_user(
    data: UserCreate,
    db: Session = Depends(get_db),
):
    """
    Реєструє нового користувача.
    Публічний ендпоінт (токен не потрібен).
    """
    try:
        user = create_user(db, data)
    except UserAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )
    
    return user


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Повертає профіль поточного залогіненого користувача.
    
    Вимагає JWT-токен у заголовку Authorization.
    Використовується фронтендом для відображення профілю,
    аватарки в навбарі, перевірки ролі тощо.
    """
    return current_user