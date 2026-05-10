"""
Фонова таска для періодичного оновлення `tracks.preview_url`.

Чому це потрібно:
- Spotify preview URL-и для Client-Credentials-апів стали недоступні
  (зміни Spotify у листопаді 2024).
- Deezer URL-и містять токени `?cid=...&hdnea=...` зі строком життя
  кілька годин/днів. Після цього CDN повертає 403, плеєр на фронті
  падає з помилкою.

Стратегія:
- Раз на REFRESH_INTERVAL_SECONDS таска бере N найстаріших треків
  (preview_updated_at найдавніший або NULL) і просить
  `refresh_track_preview` для кожного — це робить новий Deezer search
  і записує свіжий URL. Між запитами невеличка пауза, щоб не дудосити Deezer.
- На фронті є lazy-fallback: при помилці <audio> викликається
  POST /tracks/{id}/refresh-preview і програється новий URL.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import or_, select

from app.core.database import SessionLocal
from app.models import Track
from app.services.track_service import refresh_track_preview


logger = logging.getLogger(__name__)


# Як часто запускати скан (секунд). 6 годин — компроміс між свіжістю URL-ів
# і навантаженням на Deezer.
REFRESH_INTERVAL_SECONDS = 6 * 60 * 60

# Скільки треків оновлюємо за один прохід. Малий батч — щоб не висіло вічно.
BATCH_SIZE = 30

# Поріг "застарілості" preview_url. Все, що старше — кандидат на оновлення.
STALE_THRESHOLD = timedelta(hours=12)

# Пауза між викликами Deezer-у в межах батчу (анти-rate-limit).
DELAY_BETWEEN_TRACKS = 0.4


async def _refresh_batch_once() -> int:
    """Один прохід — оновлює до BATCH_SIZE найстаріших треків. Повертає к-сть."""
    db = SessionLocal()
    refreshed = 0
    try:
        cutoff = datetime.now(timezone.utc) - STALE_THRESHOLD
        track_ids = db.execute(
            select(Track.id)
            .where(
                or_(
                    Track.preview_updated_at.is_(None),
                    Track.preview_updated_at < cutoff,
                ),
                Track.status == "approved",
            )
            .order_by(Track.preview_updated_at.asc().nulls_first())
            .limit(BATCH_SIZE)
        ).scalars().all()

        if not track_ids:
            return 0

        for track_id in track_ids:
            try:
                await refresh_track_preview(db, track_id)
                refreshed += 1
            except Exception:
                logger.exception("preview refresh failed for track %s", track_id)
            await asyncio.sleep(DELAY_BETWEEN_TRACKS)
    finally:
        db.close()

    return refreshed


async def periodic_preview_refresh():
    """Безкінечний цикл: спить REFRESH_INTERVAL_SECONDS, потім оновлює батч."""
    # Не лізти зразу при старті — даємо бекенду спокійно прийняти перші запити.
    await asyncio.sleep(60)
    while True:
        try:
            count = await _refresh_batch_once()
            logger.info("Preview refresh batch done: %s tracks", count)
        except Exception:
            logger.exception("periodic_preview_refresh iteration failed")
        await asyncio.sleep(REFRESH_INTERVAL_SECONDS)
