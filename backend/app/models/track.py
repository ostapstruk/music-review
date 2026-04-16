from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Track(Base):
    """Трек (пісня)."""
    
    __tablename__ = "tracks"
    
    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True,
    )
    artist_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("artists.id", ondelete="CASCADE"), nullable=False,
    )
    album_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("albums.id", ondelete="SET NULL"), nullable=True,
    )
    title: Mapped[str] = mapped_column(
        String(255), nullable=False,
    )
    spotify_id: Mapped[str | None] = mapped_column(
        String(50), unique=True, nullable=True,
    )
    duration_ms: Mapped[int | None] = mapped_column(
        Integer, nullable=True,
    )
    cover_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True,
    )
    preview_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True,
    )
    # Audio features від Spotify (для радарної діаграми)
    danceability: Mapped[Decimal | None] = mapped_column(
        Numeric(3, 2), nullable=True,
    )
    energy: Mapped[Decimal | None] = mapped_column(
        Numeric(3, 2), nullable=True,
    )
    acousticness: Mapped[Decimal | None] = mapped_column(
        Numeric(3, 2), nullable=True,
    )
    valence: Mapped[Decimal | None] = mapped_column(
        Numeric(3, 2), nullable=True,
    )
    tempo: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    
    def __repr__(self) -> str:
        return f"<Track(id={self.id}, title={self.title!r})>"