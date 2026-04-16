from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


BCRYPT_MAX_BYTES = 72


# -----------------------------------------------------------------------------
# Паролі (bcrypt)
# -----------------------------------------------------------------------------

def hash_password(plain_password: str) -> str:
    """Приймає пароль у відкритому вигляді, повертає bcrypt-хеш."""
    password_bytes = plain_password.encode("utf-8")[:BCRYPT_MAX_BYTES]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Перевіряє, чи відповідає введений пароль збереженому хешу."""
    password_bytes = plain_password.encode("utf-8")[:BCRYPT_MAX_BYTES]
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(password_bytes, hashed_bytes)


# -----------------------------------------------------------------------------
# JWT-токени
# -----------------------------------------------------------------------------

def create_access_token(user_id: int) -> str:
    """
    Створює JWT-токен для користувача.
    
    Payload містить:
    - sub: ID користувача (як рядок, за стандартом JWT)
    - exp: unix-час закінчення дії токена
    - iat: unix-час створення токена
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    payload = {
        "sub": str(user_id),      # subject — хто власник токена
        "exp": expire,             # expiration — до коли дійсний
        "iat": now,                # issued at — коли виданий
    }
    
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token


def decode_access_token(token: str) -> int | None:
    """
    Перевіряє підпис токена, розбирає його і повертає user_id.
    Повертає None, якщо токен невалідний або прострочений.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id_str = payload.get("sub")
        if user_id_str is None:
            return None
        return int(user_id_str)
    except JWTError:
        # Токен невалідний: зіпсований, з неправильним підписом, або прострочений
        return None