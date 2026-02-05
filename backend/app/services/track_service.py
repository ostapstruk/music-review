from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Album, Artist, Review, Track
from app.schemas import TrackCreate


def get_tracks_list(
    db: Session,
    limit: int = 20,
    offset: int = 0,
) -> list[dict]:
    """
    Повертає список треків з іменем артиста та середнім рейтингом.
    Підтримує пагінацію через limit/offset.
    """
    stmt = (
        select(
            Track,
            Artist.name.label("artist_name"),
            func.coalesce(func.avg(Review.rating), 0).label("avg_rating"),
            func.count(Review.id).label("reviews_count"),
        )
        .join(Artist, Track.artist_id == Artist.id)
        .outerjoin(Review, Track.id == Review.track_id)
        .group_by(Track.id, Artist.name)
        .order_by(Track.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    
    rows = db.execute(stmt).all()
    
    result = []
    for track, artist_name, avg_rating, reviews_count in rows:
        track_dict = {
            "id": track.id,
            "title": track.title,
            "artist_id": track.artist_id,
            "album_id": track.album_id,
            "spotify_id": track.spotify_id,
            "duration_ms": track.duration_ms,
            "cover_url": track.cover_url,
            "avg_rating": round(float(avg_rating), 1) if avg_rating else None,
            "reviews_count": reviews_count,
            "artist_name": artist_name,
        }
        result.append(track_dict)
    
    return result


def get_track_detail(db: Session, track_id: int) -> dict | None:
    """
    Повертає детальну інформацію про трек, включаючи audio features,
    середній рейтинг та ім'я артиста.
    """
    stmt = (
        select(
            Track,
            Artist.name.label("artist_name"),
            func.coalesce(func.avg(Review.rating), 0).label("avg_rating"),
            func.count(Review.id).label("reviews_count"),
        )
        .join(Artist, Track.artist_id == Artist.id)
        .outerjoin(Review, Track.id == Review.track_id)
        .where(Track.id == track_id)
        .group_by(Track.id, Artist.name)
    )
    
    row = db.execute(stmt).first()
    
    if row is None:
        return None
    
    track, artist_name, avg_rating, reviews_count = row
    
    return {
        "id": track.id,
        "title": track.title,
        "artist_id": track.artist_id,
        "album_id": track.album_id,
        "spotify_id": track.spotify_id,
        "duration_ms": track.duration_ms,
        "cover_url": track.cover_url,
        "preview_url": track.preview_url,
        "danceability": track.danceability,
        "energy": track.energy,
        "acousticness": track.acousticness,
        "valence": track.valence,
        "tempo": track.tempo,
        "created_at": track.created_at,
        "avg_rating": round(float(avg_rating), 1) if avg_rating else None,
        "reviews_count": reviews_count,
        "artist_name": artist_name,
    }


def create_track_manually(db: Session, data: TrackCreate) -> Track:
    """
    Створює трек вручну (без Spotify API).
    Якщо артиста не існує — створює нового.
    Якщо вказано альбом — створює або знаходить.
    """
    # 1. Знайти або створити артиста
    artist = db.execute(
        select(Artist).where(Artist.name == data.artist_name)
    ).scalar_one_or_none()
    
    if artist is None:
        artist = Artist(name=data.artist_name)
        db.add(artist)
        db.flush()  # flush, а не commit — отримуємо id, але транзакція ще відкрита
    
    # 2. Знайти або створити альбом (якщо вказано)
    album_id = None
    if data.album_title:
        album = db.execute(
            select(Album).where(
                Album.title == data.album_title,
                Album.artist_id == artist.id,
            )
        ).scalar_one_or_none()
        
        if album is None:
            album = Album(
                artist_id=artist.id,
                title=data.album_title,
                release_year=data.release_year,
            )
            db.add(album)
            db.flush()
        
        album_id = album.id
    
    # 3. Створюємо трек
    track = Track(
        artist_id=artist.id,
        album_id=album_id,
        title=data.title,
        cover_url=data.cover_url,
        duration_ms=data.duration_ms,
    )
    db.add(track)
    db.commit()
    db.refresh(track)
    
    return track

async def create_track_from_spotify(db: Session, spotify_data: dict) -> Track:
    """
    Створює трек з даних Spotify.
    Автоматично створює артиста і альбом, якщо не існують.
    Підтягує audio features.
    """
    from app.services.spotify_service import spotify_client
    
    # Перевіряємо, чи трек вже є
    existing = db.execute(
        select(Track).where(Track.spotify_id == spotify_data["spotify_id"])
    ).scalar_one_or_none()
    
    if existing:
        return existing
    
    # Знайти або створити артиста
    artist = db.execute(
        select(Artist).where(Artist.name == spotify_data["artist_name"])
    ).scalar_one_or_none()
    
    if artist is None:
        artist = Artist(name=spotify_data["artist_name"])
        db.add(artist)
        db.flush()
    
    # Знайти або створити альбом
    album_id = None
    if spotify_data.get("album_title"):
        album = db.execute(
            select(Album).where(
                Album.title == spotify_data["album_title"],
                Album.artist_id == artist.id,
            )
        ).scalar_one_or_none()
        
        if album is None:
            album = Album(
                artist_id=artist.id,
                title=spotify_data["album_title"],
                release_year=spotify_data.get("release_year"),
            )
            db.add(album)
            db.flush()
        album_id = album.id
    
    # Створюємо трек
    preview_url = spotify_data.get("preview_url")
    
    # Якщо Spotify не дав preview — шукаємо через Deezer
    if not preview_url:
        from app.services.spotify_service import fetch_deezer_preview
        try:
            preview_url = await fetch_deezer_preview(
                spotify_data["title"],
                spotify_data["artist_name"],
            )
        except Exception:
            pass
    
    track = Track(
        artist_id=artist.id,
        album_id=album_id,
        title=spotify_data["title"],
        spotify_id=spotify_data["spotify_id"],
        duration_ms=spotify_data.get("duration_ms"),
        cover_url=spotify_data.get("cover_url"),
        preview_url=preview_url,
    )
    
    # Підтягуємо audio features
    try:
        features = await spotify_client.get_track_features(spotify_data["spotify_id"])
        if features:
            track.danceability = features.get("danceability")
            track.energy = features.get("energy")
            track.acousticness = features.get("acousticness")
            track.valence = features.get("valence")
            track.tempo = features.get("tempo")
    except Exception:
        pass  # Audio features не критичні
    
    db.add(track)
    db.commit()
    db.refresh(track)
    
    return track