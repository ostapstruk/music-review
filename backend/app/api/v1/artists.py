from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Album, Artist, Review, Track
from app.schemas import ArtistRead


router = APIRouter(prefix="/artists", tags=["artists"])


@router.get("/{artist_id}")
async def get_artist(artist_id: int, db: Session = Depends(get_db)):
    """Інформація про артиста з його треками."""
    artist = db.execute(
        select(Artist).where(Artist.id == artist_id)
    ).scalar_one_or_none()
    
    if artist is None:
        raise HTTPException(status_code=404, detail="Artist not found")
    
    # Треки артиста з рейтингами
    stmt = (
        select(
            Track,
            func.coalesce(func.avg(Review.rating), 0).label("avg_rating"),
            func.count(Review.id).label("reviews_count"),
        )
        .outerjoin(Review, Track.id == Review.track_id)
        .where(Track.artist_id == artist_id)
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
    
    # Альбоми
    albums = db.execute(
        select(Album).where(Album.artist_id == artist_id).order_by(Album.release_year.desc())
    ).scalars().all()
    
    return {
        "id": artist.id,
        "name": artist.name,
        "bio": artist.bio,
        "image_url": artist.image_url,
        "spotify_id": artist.spotify_id,
        "tracks": tracks,
        "albums_count": len(albums),
        "tracks_count": len(tracks),
    }