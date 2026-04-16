from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.models import User


class InvalidCredentialsError(Exception):
    """Неправильний email або пароль."""
    pass


def authenticate_user(db: Session, email: str, password: str) -> str:
    """
    Перевіряє логін/пароль і повертає JWT-токен у разі успіху.
    
    Кидає InvalidCredentialsError, якщо email не знайдено або пароль невірний.
    
    Примітка щодо безпеки:
    Ми навмисно повертаємо ОДНУ й ту саму помилку і для "користувача не існує",
    і для "неправильний пароль". Це ускладнює атакеру вгадування, чи існує
    конкретний email у системі (enumeration attack).
    """
    stmt = select(User).where(User.email == email)
    user = db.execute(stmt).scalar_one_or_none()
    
    if user is None:
        raise InvalidCredentialsError()
    
    if not verify_password(password, user.password_hash):
        raise InvalidCredentialsError()
    
    # Генеруємо токен
    token = create_access_token(user.id)
    return token