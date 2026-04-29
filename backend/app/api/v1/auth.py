from sqlalchemy import select
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token
from app.models import User
from app.schemas import LoginRequest, ResendRequest, TokenResponse, VerifyRequest
from app.services import (
    EmailNotVerifiedError,
    InvalidCredentialsError,
    authenticate_user,
)
from app.services.verification_service import (
    CodeExpiredError,
    CodeInvalidError,
    CodeNotFoundError,
    ResendCooldownError,
    UserAlreadyVerifiedError,
    issue_verification_code,
    verify_code,
)


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Логін за email і паролем. Повертає JWT-токен.

    Помилки:
    - 401 Invalid email or password — невірні дані.
    - 403 EMAIL_NOT_VERIFIED — пароль вірний, але email не підтверджено.
      Фронт за цим прапорцем перекидає на /verify-email.
    """
    try:
        token = authenticate_user(db, data.email, data.password)
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except EmailNotVerifiedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "EMAIL_NOT_VERIFIED", "email": e.email},
        )

    return TokenResponse(access_token=token)


@router.post("/verify", response_model=TokenResponse)
async def verify_email(data: VerifyRequest, db: Session = Depends(get_db)):
    """
    Підтвердження email кодом, надісланим при реєстрації.
    Якщо код валідний — повертає JWT, юзер одразу залогінений.
    """
    try:
        user = verify_code(db, data.email, data.code)
    except (CodeNotFoundError, CodeInvalidError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except CodeExpiredError as e:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail=str(e),
        )
    except UserAlreadyVerifiedError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already verified — try logging in",
        )

    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/resend-code", status_code=status.HTTP_202_ACCEPTED)
async def resend_code(data: ResendRequest, db: Session = Depends(get_db)):
    """
    Повторне надсилання коду. Анти-спам: не частіше ніж раз на 60 секунд.

    З міркувань безпеки відповідаємо однаково для існуючого і неіснуючого
    email — щоб не давати атакеру enumeration-вектор.
    """
    user = db.execute(
        select(User).where(User.email == data.email)
    ).scalar_one_or_none()

    if user is None:
        # Робимо вигляд, що відправили — не палимо існування юзера
        return {"status": "ok"}

    try:
        await issue_verification_code(db, user, enforce_cooldown=True)
    except UserAlreadyVerifiedError:
        # Юзер уже верифікований — просто повертаємо ОК (фронт може показати "увійдіть")
        return {"status": "already_verified"}
    except ResendCooldownError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {e.retry_after_seconds}s before requesting a new code",
            headers={"Retry-After": str(e.retry_after_seconds)},
        )

    return {"status": "ok"}
