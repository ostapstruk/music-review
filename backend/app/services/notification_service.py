"""
Сервіс нотифікацій. Поки що покриває лише @-mention-и в рецензіях/відповідях.
"""

import re

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Notification, Review, Track, User


# Юзернейми у нашій системі — латиниця/кирилиця/цифри/підкреслення
# (див. UserCreate валідатор). Матчимо саме цей патерн — щоб не зачіпати
# email-и типу `admin@example.com` у тексті.
MENTION_PATTERN = re.compile(r"@([a-zA-Z0-9_Ѐ-ӿԀ-ԯ]+)")

SNIPPET_LIMIT = 200


def _extract_mentions(text: str | None) -> set[str]:
    if not text:
        return set()
    return set(MENTION_PATTERN.findall(text))


def create_mention_notifications(
    db: Session,
    *,
    actor_id: int,
    text: str | None,
    source_type: str,
    track_id: int,
    review_id: int | None = None,
    reply_id: int | None = None,
) -> int:
    """
    Парсить текст, шукає @-згадки реальних юзерів і створює сповіщення.
    Повертає кількість створених сповіщень.

    Не створюємо нотифікацію самому собі (якщо юзер згадав себе в тексті).
    Дублі для одного юзера в межах одного тексту виключаються (бо set).
    """
    usernames = _extract_mentions(text)
    if not usernames:
        return 0

    users = db.execute(
        select(User).where(User.username.in_(usernames))
    ).scalars().all()

    if not users:
        return 0

    snippet = (text or "").strip()
    if len(snippet) > SNIPPET_LIMIT:
        snippet = snippet[: SNIPPET_LIMIT - 1].rstrip() + "…"

    created = 0
    for user in users:
        if user.id == actor_id:
            continue
        notif = Notification(
            recipient_id=user.id,
            actor_id=actor_id,
            type="mention",
            track_id=track_id,
            review_id=review_id,
            reply_id=reply_id,
            source_type=source_type,
            text_snippet=snippet,
        )
        db.add(notif)
        created += 1

    if created:
        db.commit()
    return created


def list_notifications(
    db: Session, recipient_id: int, limit: int = 50, offset: int = 0,
) -> list[dict]:
    """Останні нотифікації юзера, з даними актора і назвою треку."""
    actor_alias = User
    stmt = (
        select(
            Notification,
            actor_alias.username.label("actor_username"),
            actor_alias.avatar_url.label("actor_avatar_url"),
            actor_alias.role.label("actor_role"),
            Track.title.label("track_title"),
        )
        .outerjoin(actor_alias, Notification.actor_id == actor_alias.id)
        .join(Track, Notification.track_id == Track.id)
        .where(Notification.recipient_id == recipient_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = db.execute(stmt).all()
    return [
        {
            "id": n.id,
            "type": n.type,
            "source_type": n.source_type,
            "track_id": n.track_id,
            "track_title": track_title,
            "review_id": n.review_id,
            "reply_id": n.reply_id,
            "text_snippet": n.text_snippet,
            "is_read": n.is_read,
            "is_seen": n.is_seen,
            "created_at": n.created_at,
            "actor_id": n.actor_id,
            "actor_username": actor_username,
            "actor_avatar_url": actor_avatar_url,
            "actor_role": actor_role,
        }
        for n, actor_username, actor_avatar_url, actor_role, track_title in rows
    ]


def get_unread_count(db: Session, recipient_id: int) -> int:
    """
    Кількість для бейджа на дзвонику. Лічимо саме `is_seen=false` —
    щоб бейдж зник, як тільки юзер відкрив сторінку списку, навіть якщо
    окремі сповіщення ще не клікнуті.
    """
    return db.execute(
        select(func.count(Notification.id)).where(
            Notification.recipient_id == recipient_id,
            Notification.is_seen.is_(False),
        )
    ).scalar_one()


def mark_all_seen(db: Session, recipient_id: int) -> int:
    """
    Помічає усі сповіщення юзера як 'побачені' (is_seen=true).
    Викликається при відкритті сторінки /notifications. is_read лишається
    незмінним — щоб конкретні айтеми ще були виділені до натискання.
    """
    result = db.execute(
        Notification.__table__.update()
        .where(
            Notification.recipient_id == recipient_id,
            Notification.is_seen.is_(False),
        )
        .values(is_seen=True)
    )
    db.commit()
    return result.rowcount or 0


def mark_read(db: Session, recipient_id: int, notification_id: int) -> bool:
    """
    Помічає конкретне сповіщення як прочитане. Юзер клацнув по ньому —
    візуальне виділення зникає. Повертає True якщо знайдено й оновлено.
    """
    notif = db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.recipient_id == recipient_id,
        )
    ).scalar_one_or_none()
    if notif is None:
        return False

    if not notif.is_read or not notif.is_seen:
        notif.is_read = True
        notif.is_seen = True
        db.commit()
    return True
