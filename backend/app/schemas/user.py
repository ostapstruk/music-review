from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    """
    Схема для створення користувача (реєстрації).
    Тіло POST-запиту.
    """
    
    username: str = Field(
        min_length=3,
        max_length=50,
        pattern=r"^[a-zA-Z0-9_]+$",
        description="3-50 символів: латиниця, цифри, підкреслення",
    )
    email: EmailStr = Field(
        description="Валідна email-адреса",
    )
    password: str = Field(
        min_length=8,
        max_length=128,
        description="Від 8 до 128 символів",
    )


class UserRead(BaseModel):
    """
    Схема користувача для відповідей API.
    НЕ містить password_hash.
    """
    
    id: int
    username: str
    email: EmailStr
    role: str
    avatar_url: str | None
    bio: str | None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    """Схема для оновлення профілю."""
    
    bio: str | None = Field(None, max_length=500)
    avatar_url: str | None = Field(None, max_length=500)