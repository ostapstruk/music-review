from datetime import datetime

from sqlalchemy import BigInteger, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Artist(Base):
    """Артист / виконавець."""
    
    __tablename__ = "artists"
    
    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True,
    )
    name: Mapped[str] = mapped_column(
        String(255), nullable=False,
    )
    spotify_id: Mapped[str | None] = mapped_column(
        String(50), unique=True, nullable=True,
    )
    bio: Mapped[str | None] = mapped_column(
        Text, nullable=True,
    )
    image_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    
    def __repr__(self) -> str:
        return f"<Artist(id={self.id}, name={self.name!r})>"