from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReviewReplyCreate(BaseModel):
    """Тіло запиту на створення відповіді під рецензією."""

    text: str = Field(min_length=1, max_length=2000)


class ReviewReplyRead(BaseModel):
    """Відповідь у відповіді API."""

    id: int
    review_id: int
    user_id: int
    text: str
    created_at: datetime
    updated_at: datetime

    username: str | None = None
    avatar_url: str | None = None
    role: str | None = None
    is_verified_artist: bool = False

    model_config = ConfigDict(from_attributes=True)


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
    
    username: str | None = None
    avatar_url: str | None = None
    role: str | None = None
    is_verified_artist: bool = False
    likes_count: int = 0
    dislikes_count: int = 0
    track_title: str | None = None
    track_cover: str | None = None
    
    model_config = ConfigDict(from_attributes=True)