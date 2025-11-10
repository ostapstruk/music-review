from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
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
    
    Повертає створеного користувача (без пароля) зі статусом 201.
    У разі конфлікту username/email — 409.
    """
    try:
        user = create_user(db, data)
    except UserAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )
    
    return user