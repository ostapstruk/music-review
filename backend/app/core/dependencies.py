from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import User


# Окрема схема для опційного auth — auto_error=False не кидає 403,
# якщо заголовку немає, а просто віддає None.
optional_security_scheme = HTTPBearer(auto_error=False)


# HTTPBearer — вбудований механізм FastAPI для витягування токена
# з заголовку Authorization: Bearer <token>.
# auto_error=True означає: якщо заголовку немає — одразу 403.
security_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Залежність, що витягує поточного користувача з JWT-токена.
    
    Використання в ендпоінті:
        @router.get("/something")
        async def my_endpoint(user: User = Depends(get_current_user)):
            print(user.username)  # Ім'я залогіненого юзера
    
    Кидає HTTPException 401, якщо:
    - Токен невалідний або прострочений.
    - Користувача з таким id не існує (видалений акаунт).
    """
    # 1. Декодуємо токен
    user_id = decode_access_token(credentials.credentials)
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. Шукаємо юзера в БД
    stmt = select(User).where(User.id == user_id)
    user = db.execute(stmt).scalar_one_or_none()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_role(*allowed_roles: str):
    """
    Фабрика залежностей: пропускає лише юзерів з роллю зі списку.

        @router.delete("/tracks/{id}")
        async def delete(user: User = Depends(require_role("admin"))):
            ...

    Кидає HTTP 403, якщо роль не підходить.
    """

    async def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient privileges",
            )
        return current_user

    return _check


require_admin = require_role("admin")
require_artist = require_role("artist", "admin")


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_security_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """
    Те саме, що get_current_user, але якщо заголовку Authorization немає —
    повертає None замість 403. Корисно для публічних ендпоінтів, які
    хочуть пер-юзер логіку (типу: показувати власні pending-треки).
    Якщо токен ПЕРЕДАНО, але невалідний — кидаємо 401, як зазвичай.
    """
    if credentials is None:
        return None

    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    return user
