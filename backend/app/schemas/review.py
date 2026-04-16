from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    """Тіло запиту для створення рецензії."""
    
    track_id: int
    rating: int = Field(ge=1, le=10, description="Оцінка від 1 до 10")
    text: str | None = Field(
        None,
        max_length=5000,
        description="Текст рецензії (необов'язково)",
    )


class ReviewRead(BaseModel):
    """Рецензія у відповіді API."""
    
    id: int
    user_id: int
    track_id: int
    rating: int
    text: str | None
    created_at: datetime
    updated_at: datetime
    
    # Обчислювані поля
    username: str | None = None
    likes_count: int = 0
    dislikes_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)