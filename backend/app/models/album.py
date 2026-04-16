from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Album(Base):
    """Альбом."""
    
    __tablename__ = "albums"
    
    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True,
    )
    artist_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("artists.id", ondelete="CASCADE"), nullable=False,
    )
    title: Mapped[str] = mapped_column(
        String(255), nullable=False,
    )
    spotify_id: Mapped[str | None] = mapped_column(
        String(50), unique=True, nullable=True,
    )
    release_year: Mapped[int | None] = mapped_column(
        Integer, nullable=True,
    )
    cover_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    
    def __repr__(self) -> str:
        return f"<Album(id={self.id}, title={self.title!r})>"