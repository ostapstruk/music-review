from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import User


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