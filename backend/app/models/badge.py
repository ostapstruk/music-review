from sqlalchemy import BigInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Badge(Base):
    """
    Досягнення (бейдж), яке користувач може отримати за активність.
    Віддзеркалює таблицю `badges` у PostgreSQL.
    """
    
    __tablename__ = "badges"
    
    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )
    code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    icon_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    tier: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="bronze",
    )
    
    def __repr__(self) -> str:
        return f"<Badge(id={self.id}, code={self.code!r}, tier={self.tier!r})>"