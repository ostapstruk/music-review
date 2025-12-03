from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User
from app.schemas import TrackCreate, TrackDetail, TrackRead, TrackTrending
from app.services.track_service import create_track_manually, get_track_detail, get_tracks_list
from app.services.trending_service import get_trending_tracks


router = APIRouter(prefix="/tracks", tags=["tracks"])


@router.get("/trending", response_model=list[TrackTrending])
async def trending_chart(
    limit: int = Query(10, ge=1, le=50, description="Кількість треків у чарті"),
    db: Session = Depends(get_db),
):
    """
    Гарячий чарт — топ треків за алгоритмом Trending.
    
    Формула: score = avg_rating × log2(1 + recent_reviews_7d) × time_decay
    
    Враховує:
    - Середній рейтинг (якість)
    - Кількість нових рецензій за тиждень (активність)
    - Час з останньої рецензії (свіжість)
    """
    return get_trending_tracks(db, limit=limit)


@router.get("/", response_model=list[TrackRead])
async def list_tracks(
    limit: int = Query(20, ge=1, le=100, description="Кількість треків"),
    offset: int = Query(0, ge=0, description="Зміщення для пагінації"),
    db: Session = Depends(get_db),
):
    """
    Повертає список треків з середнім рейтингом та іменем артиста.
    Підтримує пагінацію.
    """
    return get_tracks_list(db, limit=limit, offset=offset)


@router.get("/{track_id}", response_model=TrackDetail)
async def get_track(track_id: int, db: Session = Depends(get_db)):
    """
    Повертає детальну інформацію про трек:
    audio features, середній рейтинг, кількість рецензій.
    """
    track = get_track_detail(db, track_id)
    
    if track is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Track with id {track_id} not found",
        )
    
    return track


@router.post(
    "/",
    response_model=TrackRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_track(
    data: TrackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Додає новий трек вручну.
    Вимагає авторизацію.
    """
    track = create_track_manually(db, data)
    return track