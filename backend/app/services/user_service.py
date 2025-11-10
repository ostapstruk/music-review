from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import User
from app.schemas import UserCreate


class UserAlreadyExistsError(Exception):
    """
    Спеціальне виключення: користувач з таким username або email вже існує.
    Кидається сервісом і ловиться ендпоінтом, який перетворює його на HTTP 409.
    """
    def __init__(self, field: str, value: str):
        self.field = field
        self.value = value
        super().__init__(f"User with {field} '{value}' already exists")


def create_user(db: Session, data: UserCreate) -> User:
    """
    Створює нового користувача.
    
    Алгоритм:
    1. Перевірити, чи немає конфлікту по username або email.
    2. Захешувати пароль.
    3. Створити об'єкт User і зберегти в БД.
    4. Повернути збережений об'єкт (з заповненим id і created_at).
    
    Кидає UserAlreadyExistsError, якщо username/email уже зайняті.
    """
    
    # 1. Перевірка на конфлікт.
    # Шукаємо запис, де username=X АБО email=Y — один запит замість двох.
    stmt = select(User).where(
        or_(User.username == data.username, User.email == data.email)
    )
    existing = db.execute(stmt).scalar_one_or_none()
    
    if existing is not None:
        if existing.username == data.username:
            raise UserAlreadyExistsError("username", data.username)
        else:
            raise UserAlreadyExistsError("email", data.email)
    
    # 2. Хешуємо пароль.
    password_hash = hash_password(data.password)
    
    # 3. Створюємо ORM-об'єкт.
    user = User(
        username=data.username,
        email=data.email,
        password_hash=password_hash,
        # role не вказуємо — спрацює default="listener"
    )
    
    # 4. Додаємо в сесію і комітимо.
    db.add(user)
    db.commit()
    db.refresh(user)  # оновлюємо об'єкт, щоб забрати id та created_at з БД
    
    return user