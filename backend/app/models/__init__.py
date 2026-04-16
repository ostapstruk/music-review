from app.core.database import Base
from app.models.genre import Genre


# Експортуємо все, що має бути доступним ззовні пакета
__all__ = ["Base", "Genre"]