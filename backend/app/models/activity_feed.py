from datetime import datetime

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ActivityFeed(Base):
    """Запис у стрічці активності."""
    
    __tablename__ = "activity_feed"
    
    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True,
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
    )
    action_type: Mapped[str] = mapped_column(
        String(30), nullable=False,
    )
    target_type: Mapped[str] = mapped_column(
        String(30), nullable=False,
    )
    target_id: Mapped[int] = mapped_column(
        BigInteger, nullable=False,
    )
    # "metadata" зарезервовано SQLAlchemy, тому Python-атрибут називаємо extra_data,
    # а в БД колонка залишається "metadata" через параметр name=
    extra_data = Column("metadata", JSONB, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    
    def __repr__(self) -> str:
        return f"<ActivityFeed(id={self.id}, action={self.action_type})>"