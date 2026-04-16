import bcrypt


# Максимальна довжина пароля, яку приймає bcrypt.
# Все, що довше, буде обрізано — це стандартна поведінка bcrypt.
# Замість мовчазного обрізання ми явно попереджаємо користувача через валідацію
# у UserCreate (max_length=128), а реально підстраховуємось тут.
BCRYPT_MAX_BYTES = 72


def hash_password(plain_password: str) -> str:
    """
    Приймає пароль у відкритому вигляді, повертає bcrypt-хеш.
    Хеш — це рядок приблизно 60 символів, наприклад:
    "$2b$12$KIXvQ..."
    """
    # Кодуємо пароль у байти (bcrypt працює з байтами, не з рядками).
    password_bytes = plain_password.encode("utf-8")
    # Обрізаємо до 72 байт (обмеження bcrypt).
    password_bytes = password_bytes[:BCRYPT_MAX_BYTES]
    # Генеруємо salt (випадкова частина) і хешуємо.
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    # Повертаємо як рядок (для зберігання у VARCHAR).
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Перевіряє, чи відповідає введений пароль збереженому хешу.
    Повертає True/False.
    Використовується при логіні.
    """
    password_bytes = plain_password.encode("utf-8")[:BCRYPT_MAX_BYTES]
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(password_bytes, hashed_bytes)