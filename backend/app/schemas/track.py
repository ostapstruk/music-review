from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class TrackRead(BaseModel):
    """Трек у відповіді API (список)."""
    
    id: int
    title: str
    artist_id: int
    album_id: int | None
    spotify_id: str | None
    duration_ms: int | None
    cover_url: str | None
    
    model_config = ConfigDict(from_attributes=True)


class TrackDetail(TrackRead):
    """
    Розширена інформація про трек (сторінка треку).
    Наслідує TrackRead і додає audio features + статистику.
    """
    
    preview_url: str | None
    danceability: Decimal | None
    energy: Decimal | None
    acousticness: Decimal | None
    valence: Decimal | None
    tempo: Decimal | None
    created_at: datetime
    
    # Ці поля будуть обчислюватись бекендом, не з БД напряму
    avg_rating: float | None = None
    reviews_count: int = 0
    artist_name: str | None = None


class TrackCreate(BaseModel):
    """Схема для ручного додавання треку (без Spotify)."""
    
    title: str = Field(min_length=1, max_length=255)
    artist_name: str = Field(min_length=1, max_length=255)
    album_title: str | None = None
    release_year: int | None = None
    cover_url: str | None = None
    duration_ms: int | None = None

class TrackTrending(BaseModel):
    """Трек у Trending-чарті."""
    
    id: int
    title: str
    artist_id: int
    artist_name: str | None
    cover_url: str | None
    spotify_id: str | None
    duration_ms: int | None
    album_id: int | None
    avg_rating: float
    reviews_count: int
    recent_reviews: int
    trending_score: float

class SpotifySearchResult(BaseModel):
    """Результат пошуку з Spotify."""
    
    spotify_id: str
    title: str
    artist_name: str
    album_title: str | None
    release_year: int | None
    cover_url: str | None
    duration_ms: int | None
    preview_url: str | None