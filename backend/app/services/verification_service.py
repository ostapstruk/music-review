"""
Сервіс верифікації email через 6-значні коди.
"""

import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import EmailVerification, User
from app.services.email_service import send_verification_email


CODE_TTL_MINUTES = 10
RESEND_COOLDOWN_SECONDS = 60


class UserAlreadyVerifiedError(Exception):
    pass


class CodeNotFoundError(Exception):
    pass


class CodeExpiredError(Exception):
    pass


class CodeInvalidError(Exception):
    pass


class ResendCooldownError(Exception):
    """Юзер просить надіслати ще один код раніше, ніж дозволено (анти-спам)."""

    def __init__(self, retry_after_seconds: int):
        self.retry_after_seconds = retry_after_seconds
        super().__init__(f"Wait {retry_after_seconds}s before requesting a new code")


def _generate_code() -> str:
    """6-значний код, лідуючі нулі OK (наприклад, 042857)."""
    return f"{secrets.randbelow(1_000_000):06d}"


async def issue_verification_code(
    db: Session,
    user: User,
    *,
    enforce_cooldown: bool = True,
) -> EmailVerification:
    """
    Створює новий код для юзера, інвалідовує попередні і надсилає лист.
    Якщо enforce_cooldown=True (resend-сценарій) — кидає ResendCooldownError,
    якщо попередній код видавався менше RESEND_COOLDOWN_SECONDS тому.
    """
    if user.is_verified:
        raise UserAlreadyVerifiedError("User is already verified")

    now = datetime.now(timezone.utc)

    if enforce_cooldown:
        last = db.execute(
            select(EmailVerification)
            .where(EmailVerification.user_id == user.id)
            .order_by(EmailVerification.created_at.desc())
            .limit(1)
        ).scalar_one_or_none()
        if last is not None:
            elapsed = (now - last.created_at).total_seconds()
            if elapsed < RESEND_COOLDOWN_SECONDS:
                raise ResendCooldownError(
                    int(RESEND_COOLDOWN_SECONDS - elapsed) + 1
                )

    # Інвалідовуємо всі попередні активні коди — тільки найновіший має силу.
    db.execute(
        EmailVerification.__table__.update()
        .where(
            EmailVerification.user_id == user.id,
            EmailVerification.used_at.is_(None),
        )
        .values(used_at=now)
    )

    code = _generate_code()
    record = EmailVerification(
        user_id=user.id,
        code=code,
        expires_at=now + timedelta(minutes=CODE_TTL_MINUTES),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # Лист — після коміту, щоб у разі помилки SMTP не лишився підвішений код.
    await send_verification_email(user.email, user.username, code)

    return record


def verify_code(db: Session, email: str, code: str) -> User:
    """
    Перевіряє код для конкретного email.
    Якщо ОК — позначає юзера верифікованим, код як використаний, і повертає юзера.
    """
    user = db.execute(
        select(User).where(User.email == email)
    ).scalar_one_or_none()
    if user is None:
        raise CodeNotFoundError("Invalid email or code")

    if user.is_verified:
        raise UserAlreadyVerifiedError("User is already verified")

    record = db.execute(
        select(EmailVerification)
        .where(
            EmailVerification.user_id == user.id,
            EmailVerification.used_at.is_(None),
        )
        .order_by(EmailVerification.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    if record is None:
        raise CodeNotFoundError("No active verification code — request a new one")

    now = datetime.now(timezone.utc)

    if record.expires_at < now:
        raise CodeExpiredError("Code expired — request a new one")

    if record.code != code.strip():
        raise CodeInvalidError("Invalid code")

    record.used_at = now
    user.is_verified = True
    db.commit()
    db.refresh(user)
    return user
