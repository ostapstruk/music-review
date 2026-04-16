from sqlalchemy import BigInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Genre(Base):
    """
    Жанр музики.
    Віддзеркалює таблицю `genres` у PostgreSQL.
    """
    
    __tablename__ = "genres"
    
    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True,
    )
    slug: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True,
    )
    
    def __repr__(self) -> str:
        """Зручне представлення для логів і дебагу."""
        return f"<Genre(id={self.id}, slug={self.slug!r})>"