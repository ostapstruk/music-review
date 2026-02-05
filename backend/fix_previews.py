"""
Одноразовий скрипт: підтягує preview_url з Deezer для треків без preview.
Запускати: python fix_previews.py
"""
import asyncio
from sqlalchemy import select, update
from app.core.database import SessionLocal
from app.models import Artist, Track
from app.services.spotify_service import fetch_deezer_preview


async def main():
    db = SessionLocal()
    
    # Знаходимо треки без preview
    stmt = (
        select(Track, Artist.name)
        .join(Artist, Track.artist_id == Artist.id)
        .where(Track.preview_url.is_(None))
    )
    rows = db.execute(stmt).all()
    
    print(f"Знайдено {len(rows)} треків без preview")
    
    for track, artist_name in rows:
        preview = await fetch_deezer_preview(track.title, artist_name)
        if preview:
            track.preview_url = preview
            print(f"  ✓ {track.title} — {artist_name}: знайдено preview")
        else:
            print(f"  ✗ {track.title} — {artist_name}: preview не знайдено")
    
    db.commit()
    db.close()
    print("Готово!")


asyncio.run(main())