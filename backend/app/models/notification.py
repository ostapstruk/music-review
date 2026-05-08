from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Notification(Base):
    """Сповіщення для юзера. Поки що тільки тип 'mention' (@-згадки)."""

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True,
    )
    recipient_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    actor_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    type: Mapped[str] = mapped_column(
        String(30), nullable=False,
    )
    track_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("tracks.id", ondelete="CASCADE"),
        nullable=False,
    )
    review_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("reviews.id", ondelete="CASCADE"),
        nullable=True,
    )
    reply_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("review_replies.id", ondelete="CASCADE"),
        nullable=True,
    )
    source_type: Mapped[str] = mapped_column(
        String(20), nullable=False,
    )
    text_snippet: Mapped[str | None] = mapped_column(
        Text, nullable=True,
    )
    is_read: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )

    def __repr__(self) -> str:
        return (
            f"<Notification(id={self.id}, recipient_id={self.recipient_id}, "
            f"type={self.type!r}, is_read={self.is_read})>"
        )
