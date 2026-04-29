from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.models import User


class InvalidCredentialsError(Exception):
    """Неправильний email або пароль."""
    pass


class EmailNotVerifiedError(Exception):
    """Юзер існує, пароль вірний, але email ще не підтверджено."""

    def __init__(self, email: str):
        self.email = email
        super().__init__("Email not verified")


def authenticate_user(db: Session, email: str, password: str) -> str:
    """
    Перевіряє логін/пароль і повертає JWT-токен у разі успіху.

    Кидає InvalidCredentialsError, якщо email не знайдено або пароль невірний.
    Кидає EmailNotVerifiedError, якщо email ще не підтверджено
    (передаємо email далі, щоб фронт міг перекинути на /verify-email).

    Примітка щодо безпеки:
    Однакова помилка для "користувача не існує" і "неправильний пароль" — щоб
    атакер не міг вгадати, чи існує email. EmailNotVerifiedError кидаємо лише
    коли пароль уже валідний, тому enumeration через нього неможливий.
    """
    stmt = select(User).where(User.email == email)
    user = db.execute(stmt).scalar_one_or_none()

    if user is None:
        raise InvalidCredentialsError()

    if not verify_password(password, user.password_hash):
        raise InvalidCredentialsError()

    if not user.is_verified:
        raise EmailNotVerifiedError(email=user.email)

    # Генеруємо токен
    token = create_access_token(user.id)
    return token