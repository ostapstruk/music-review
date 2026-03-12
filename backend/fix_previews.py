import asyncio
from sqlalchemy import select
from app.core.database import SessionLocal
from app.models import Artist, Track
from app.services.spotify_service import fetch_deezer_preview


async def main():
    db = SessionLocal()
    
    stmt = (
        select(Track, Artist.name)
        .join(Artist, Track.artist_id == Artist.id)
    )
    rows = db.execute(stmt).all()
    
    print(f"Оновлюємо preview для {len(rows)} треків")
    
    updated = 0
    for track, artist_name in rows:
        preview = await fetch_deezer_preview(track.title, artist_name)
        if preview:
            track.preview_url = preview
            updated += 1
            print(f"  + {track.title} -- {artist_name}")
        else:
            track.preview_url = None
            print(f"  x {track.title} -- {artist_name}: ne znajdeno")
    
    db.commit()
    db.close()
    print(f"Onovleno {updated} trekiv")


asyncio.run(main())