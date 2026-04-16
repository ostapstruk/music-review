from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ReviewLike(Base):
    """Лайк або дизлайк рецензії."""
    
    __tablename__ = "review_likes"
    
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    review_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("reviews.id", ondelete="CASCADE"),
        primary_key=True,
    )
    is_like: Mapped[bool] = mapped_column(
        Boolean, nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    
    def __repr__(self) -> str:
        kind = "like" if self.is_like else "dislike"
        return f"<ReviewLike(user={self.user_id}, review={self.review_id}, {kind})>"