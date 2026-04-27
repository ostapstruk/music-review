from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Album, Artist, Review, Track, User
from app.schemas import TrackCreate


class TrackNotFoundError(Exception):
    pass


class TrackAlreadyReviewedError(Exception):
    """Трек уже не у статусі pending — ним не можна керувати як заявкою."""
    pass


def get_tracks_list(
    db: Session,
    limit: int = 20,
    offset: int = 0,
) -> list[dict]:
    """
    Повертає список треків з іменем артиста та середнім рейтингом.
    Лише approved (модерацію вже пройшли). Підтримує пагінацію.
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
        .where(Track.status == "approved")
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


def get_track_detail(
    db: Session,
    track_id: int,
    *,
    requester_id: int | None = None,
    is_admin: bool = False,
) -> dict | None:
    """
    Повертає детальну інформацію про трек, включаючи audio features,
    середній рейтинг та ім'я артиста.

    Pending-треки видно лише адміну та автору заявки. Rejected — лише адміну.
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

    # Доступ до pending/rejected: тільки адмін бачить усе, автор бачить власний pending.
    if track.status != "approved" and not is_admin:
        if track.status == "pending" and requester_id is not None and track.submitted_by == requester_id:
            pass  # автор може дивитись свій pending
        else:
            return None

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
        "status": track.status,
        "avg_rating": round(float(avg_rating), 1) if avg_rating else None,
        "reviews_count": reviews_count,
        "artist_name": artist_name,
    }


def create_track_manually(
    db: Session,
    data: TrackCreate,
    *,
    submitted_by: int | None = None,
    auto_approve: bool = False,
) -> Track:
    """
    Створює трек вручну (без Spotify API).
    Якщо артиста не існує — створює нового.
    Якщо вказано альбом — створює або знаходить.

    Якщо auto_approve=True (адмін додає) — статус 'approved' одразу.
    Інакше створюється pending-заявка для модерації.
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
    now = datetime.now(timezone.utc)
    track = Track(
        artist_id=artist.id,
        album_id=album_id,
        title=data.title,
        cover_url=data.cover_url,
        duration_ms=data.duration_ms,
        status="approved" if auto_approve else "pending",
        submitted_by=submitted_by,
        reviewed_at=now if auto_approve else None,
        reviewed_by=submitted_by if auto_approve else None,
    )
    db.add(track)
    db.commit()
    db.refresh(track)

    return track

def delete_track(db: Session, track_id: int) -> bool:
    """
    Видаляє трек повністю. Усі рецензії знесуться каскадом
    (FK reviews.track_id ON DELETE CASCADE).
    Повертає True якщо видалено, False якщо не знайдено.
    """
    track = db.execute(
        select(Track).where(Track.id == track_id)
    ).scalar_one_or_none()

    if track is None:
        return False

    db.delete(track)
    db.commit()
    return True


async def create_track_from_spotify(
    db: Session,
    spotify_data: dict,
    *,
    submitted_by: int | None = None,
    auto_approve: bool = False,
) -> Track:
    """
    Створює трек з даних Spotify.
    Автоматично створює артиста і альбом, якщо не існують.
    Підтягує audio features.

    Якщо auto_approve=True (адмін додає / sync на власному артисті) —
    одразу 'approved'. Інакше — 'pending' для модерації.
    """
    from app.services.spotify_service import spotify_client

    # Перевіряємо, чи трек вже є
    existing = db.execute(
        select(Track).where(Track.spotify_id == spotify_data["spotify_id"])
    ).scalar_one_or_none()

    if existing:
        return existing

    artist_spotify_id = spotify_data.get("artist_spotify_id")

    # Знайти артиста: спершу за spotify_id (надійніше), потім за іменем.
    artist = None
    if artist_spotify_id:
        artist = db.execute(
            select(Artist).where(Artist.spotify_id == artist_spotify_id)
        ).scalar_one_or_none()

    if artist is None:
        artist = db.execute(
            select(Artist).where(Artist.name == spotify_data["artist_name"])
        ).scalar_one_or_none()

    if artist is None:
        artist = Artist(
            name=spotify_data["artist_name"],
            spotify_id=artist_spotify_id,
        )
        db.add(artist)
        db.flush()
    else:
        # Бекфіл, якщо запис був без spotify_id або без зображення
        if not artist.spotify_id and artist_spotify_id:
            artist.spotify_id = artist_spotify_id
        if not artist.image_url and artist_spotify_id:
            try:
                meta = await spotify_client.get_artist(artist_spotify_id)
                if meta and meta.get("image_url"):
                    artist.image_url = meta["image_url"]
            except Exception:
                pass
    
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
    
    now = datetime.now(timezone.utc)
    track = Track(
        artist_id=artist.id,
        album_id=album_id,
        title=spotify_data["title"],
        spotify_id=spotify_data["spotify_id"],
        duration_ms=spotify_data.get("duration_ms"),
        cover_url=spotify_data.get("cover_url"),
        preview_url=preview_url,
        status="approved" if auto_approve else "pending",
        submitted_by=submitted_by,
        reviewed_at=now if auto_approve else None,
        reviewed_by=submitted_by if auto_approve else None,
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


# ----------------------------------------------------------------------------
# Moderation
# ----------------------------------------------------------------------------

def list_track_submissions(
    db: Session,
    status_filter: str | None = None,
) -> list[dict]:
    """Список заявок на трек для адмін-панелі."""
    stmt = (
        select(
            Track,
            Artist.name.label("artist_name"),
            User.username.label("submitter_username"),
        )
        .join(Artist, Track.artist_id == Artist.id)
        .outerjoin(User, Track.submitted_by == User.id)
        .order_by(Track.created_at.desc())
    )
    if status_filter:
        stmt = stmt.where(Track.status == status_filter)

    rows = db.execute(stmt).all()
    return [
        {
            "id": track.id,
            "title": track.title,
            "artist_id": track.artist_id,
            "artist_name": artist_name,
            "cover_url": track.cover_url,
            "duration_ms": track.duration_ms,
            "spotify_id": track.spotify_id,
            "preview_url": track.preview_url,
            "status": track.status,
            "submitted_by": track.submitted_by,
            "submitter_username": submitter_username,
            "created_at": track.created_at,
            "reviewed_at": track.reviewed_at,
            "reviewed_by": track.reviewed_by,
        }
        for track, artist_name, submitter_username in rows
    ]


def approve_track(db: Session, track_id: int, admin_id: int) -> Track:
    """Адмін підтверджує заявку."""
    track = db.execute(
        select(Track).where(Track.id == track_id)
    ).scalar_one_or_none()
    if track is None:
        raise TrackNotFoundError(f"Track {track_id} not found")

    if track.status != "pending":
        raise TrackAlreadyReviewedError(
            f"Track {track_id} already {track.status}"
        )

    track.status = "approved"
    track.reviewed_at = datetime.now(timezone.utc)
    track.reviewed_by = admin_id
    db.commit()
    db.refresh(track)
    return track


def reject_track(db: Session, track_id: int, admin_id: int) -> Track:
    """Адмін відхиляє заявку. Запис лишається у БД зі статусом rejected."""
    track = db.execute(
        select(Track).where(Track.id == track_id)
    ).scalar_one_or_none()
    if track is None:
        raise TrackNotFoundError(f"Track {track_id} not found")

    if track.status != "pending":
        raise TrackAlreadyReviewedError(
            f"Track {track_id} already {track.status}"
        )

    track.status = "rejected"
    track.reviewed_at = datetime.now(timezone.utc)
    track.reviewed_by = admin_id
    db.commit()
    db.refresh(track)
    return track