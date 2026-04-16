from pydantic import BaseModel, ConfigDict


class GenreRead(BaseModel):
    """
    Схема жанру для відповідей API (GET-запити).
    Те, що клієнт отримає у JSON.
    """
    
    id: int
    name: str
    slug: str
    
    # from_attributes=True — дозволяє Pydantic читати з SQLAlchemy-моделей.
    # Без цього довелось би вручну перетворювати genre.id → {"id": genre.id, ...}
    model_config = ConfigDict(from_attributes=True)