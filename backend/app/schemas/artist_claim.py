from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ArtistClaimCreate(BaseModel):
    """Запит на створення claim-запиту від юзера."""

    artist_id: int
    message: str | None = Field(None, max_length=2000)


class ArtistClaimRead(BaseModel):
    """Claim-запит у відповіді API."""

    id: int
    user_id: int
    artist_id: int
    status: str
    message: str | None
    created_at: datetime
    reviewed_at: datetime | None
    reviewed_by: int | None

    model_config = ConfigDict(from_attributes=True)


class ArtistClaimAdminRead(ArtistClaimRead):
    """Claim з додатковими полями для адмінської панелі."""

    username: str
    artist_name: str
    artist_spotify_id: str | None


class ArtistSyncResult(BaseModel):
    """Результат синхронізації треків артиста зі Spotify."""

    artist_id: int
    spotify_id: str
    fetched: int
    created: int
    skipped: int
