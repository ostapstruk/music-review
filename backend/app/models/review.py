from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, SmallInteger, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Review(Base):
    """Рецензія на трек."""
    
    __tablename__ = "reviews"
    
    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True,
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
    )
    track_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False,
    )
    rating: Mapped[int] = mapped_column(
        SmallInteger, nullable=False,
    )
    text: Mapped[str | None] = mapped_column(
        Text, nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
        onupdate=func.now(),
    )
    
    # Дублюємо UNIQUE constraint з SQL — SQLAlchemy теж має знати про нього
    __table_args__ = (
        UniqueConstraint("user_id", "track_id", name="unique_user_track_review"),
    )
    
    def __repr__(self) -> str:
        return f"<Review(id={self.id}, user_id={self.user_id}, track_id={self.track_id}, rating={self.rating})>"