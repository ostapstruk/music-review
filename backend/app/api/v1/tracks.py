from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User
from app.schemas import SpotifySearchResult, TrackCreate, TrackDetail, TrackRead, TrackTrending
from app.services.track_service import (
    create_track_from_spotify,
    create_track_manually,
    get_track_detail,
    get_tracks_list,
)
from app.services.trending_service import get_trending_tracks


router = APIRouter(prefix="/tracks", tags=["tracks"])


@router.get("/trending", response_model=list[TrackTrending])
async def trending_chart(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Гарячий чарт."""
    return get_trending_tracks(db, limit=limit)


@router.get("/search/spotify", response_model=list[SpotifySearchResult])
async def search_spotify(
    q: str = Query(..., min_length=1, description="Пошуковий запит"),
    limit: int = Query(10, ge=1, le=20),
):
    """
    Пошук треків у Spotify.
    Повертає результати, які можна потім додати через POST /tracks/from-spotify.
    """
    from app.services.spotify_service import spotify_client
    
    try:
        results = await spotify_client.search_tracks(q, limit=limit)
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Spotify API error: {str(e)}",
        )


@router.post(
    "/from-spotify",
    response_model=TrackRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_from_spotify(
    data: SpotifySearchResult,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Додає трек з результатів Spotify-пошуку.
    Автоматично підтягує audio features для радарної діаграми.
    """
    track = await create_track_from_spotify(db, data.model_dump())
    return track


@router.get("/", response_model=list[TrackRead])
async def list_tracks(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Список усіх треків."""
    return get_tracks_list(db, limit=limit, offset=offset)


@router.get("/{track_id}", response_model=TrackDetail)
async def get_track(track_id: int, db: Session = Depends(get_db)):
    """Деталі треку."""
    track = get_track_detail(db, track_id)
    if track is None:
        raise HTTPException(status_code=404, detail=f"Track {track_id} not found")
    return track


@router.post("/", response_model=TrackRead, status_code=status.HTTP_201_CREATED)
async def create_track(
    data: TrackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Додає трек вручну."""
    track = create_track_manually(db, data)
    return track