from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Genre
from app.schemas import GenreRead


# APIRouter — "під-застосунок", який потім приєднаємо до головного FastAPI.
# prefix="/genres" означає, що всі ендпоінти тут матимуть префікс /genres.
# tags=["genres"] — групування у Swagger UI для зручності.
router = APIRouter(prefix="/genres", tags=["genres"])


@router.get("/", response_model=list[GenreRead])
async def list_genres(db: Session = Depends(get_db)):
    """
    Повертає всі жанри, відсортовані за назвою.
    """
    stmt = select(Genre).order_by(Genre.name)
    result = db.execute(stmt)
    genres = result.scalars().all()
    return genres