import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_artist
from app.models import Album, Artist, Review, Track, User
from app.schemas import ArtistClaimCreate, ArtistClaimRead, ArtistSyncResult
from app.services.artist_service import (
    ArtistMissingSpotifyIdError,
    ArtistNotFoundError,
    ClaimConflictError,
    NotAnArtistError,
    create_claim,
    get_my_artist,
    sync_artist_tracks,
)


router = APIRouter(prefix="/artists", tags=["artists"])


def _artist_with_tracks(db: Session, artist: Artist) -> dict:
    """Загальний серіалізатор: артист + його approved-треки + кількість альбомів."""
    stmt = (
        select(
            Track,
            func.coalesce(func.avg(Review.rating), 0).label("avg_rating"),
            func.count(Review.id).label("reviews_count"),
        )
        .outerjoin(Review, Track.id == Review.track_id)
        .where(Track.artist_id == artist.id, Track.status == "approved")
        .group_by(Track.id)
        .order_by(Track.created_at.desc())
    )
    rows = db.execute(stmt).all()

    tracks = []
    for track, avg_rating, reviews_count in rows:
        tracks.append({
            "id": track.id,
            "title": track.title,
            "cover_url": track.cover_url,
            "duration_ms": track.duration_ms,
            "avg_rating": round(float(avg_rating), 1) if avg_rating else None,
            "reviews_count": reviews_count,
        })

    albums_count = db.execute(
        select(func.count(Album.id)).where(Album.artist_id == artist.id)
    ).scalar_one()

    claimed_by_username = None
    if artist.claimed_by_user_id is not None:
        claimed_by_username = db.execute(
            select(User.username).where(User.id == artist.claimed_by_user_id)
        ).scalar_one_or_none()

    return {
        "id": artist.id,
        "name": artist.name,
        "bio": artist.bio,
        "image_url": artist.image_url,
        "spotify_id": artist.spotify_id,
        "claimed_by_user_id": artist.claimed_by_user_id,
        "claimed_by_username": claimed_by_username,
        "tracks": tracks,
        "albums_count": albums_count,
        "tracks_count": len(tracks),
    }


@router.get("/me")
async def get_my_artist_page(
    current_user: User = Depends(require_artist),
    db: Session = Depends(get_db),
):
    """Артист, привʼязаний до поточного юзера. Лише для role='artist'/'admin'."""
    artist = get_my_artist(db, current_user.id)
    if artist is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't own any artist page yet",
        )
    return _artist_with_tracks(db, artist)


@router.post(
    "/me/sync-tracks",
    response_model=ArtistSyncResult,
)
async def sync_my_tracks(
    current_user: User = Depends(require_artist),
    db: Session = Depends(get_db),
):
    """Тягне топ-треки артиста зі Spotify і додає нові у нашу БД.
    Адмін отримує auto_approve — нові треки одразу опубліковані,
    а вже існуючі pending-треки промотуються до approved.
    """
    try:
        return await sync_artist_tracks(
            db,
            current_user.id,
            auto_approve=current_user.role == "admin",
        )
    except NotAnArtistError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ArtistMissingSpotifyIdError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except httpx.HTTPStatusError as e:
        # Витягуємо точне повідомлення Spotify, щоб юзер бачив, що саме не так.
        try:
            spotify_msg = e.response.json().get("error", {}).get("message")
        except Exception:
            spotify_msg = e.response.text[:300]
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Spotify {e.response.status_code}: {spotify_msg or 'unknown error'}",
        )


@router.post(
    "/claim",
    response_model=ArtistClaimRead,
    status_code=status.HTTP_201_CREATED,
)
async def claim_artist(
    data: ArtistClaimCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Подати запит на володіння артистом. Адмін потім апрувить через
    POST /admin/claims/{id}/approve.
    """
    try:
        claim = create_claim(
            db,
            user_id=current_user.id,
            artist_id=data.artist_id,
            message=data.message,
        )
    except ArtistNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ClaimConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return claim


@router.get("/{artist_id}")
async def get_artist(artist_id: int, db: Session = Depends(get_db)):
    """Інформація про артиста з його треками."""
    artist = db.execute(
        select(Artist).where(Artist.id == artist_id)
    ).scalar_one_or_none()

    if artist is None:
        raise HTTPException(status_code=404, detail="Artist not found")

    return _artist_with_tracks(db, artist)
