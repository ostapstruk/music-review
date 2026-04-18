from app.schemas.artist import ArtistRead
from app.schemas.artist_claim import (
    ArtistClaimAdminRead,
    ArtistClaimCreate,
    ArtistClaimRead,
    ArtistSyncResult,
)
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.badge import BadgeRead
from app.schemas.genre import GenreRead
from app.schemas.review import ReviewCreate, ReviewRead
from app.schemas.track import SpotifySearchResult, TrackCreate, TrackDetail, TrackRead, TrackTrending
from app.schemas.user import PublicUserRead, UserCreate, UserRead, UserUpdate


__all__ = [
    "ArtistClaimAdminRead",
    "ArtistClaimCreate",
    "ArtistClaimRead",
    "ArtistRead",
    "ArtistSyncResult",
    "BadgeRead",
    "GenreRead",
    "LoginRequest",
    "PublicUserRead",
    "ReviewCreate",
    "ReviewRead",
    "SpotifySearchResult",
    "TokenResponse",
    "TrackCreate",
    "TrackDetail",
    "TrackRead",
    "TrackTrending",
    "UserCreate",
    "UserRead",
    "UserUpdate",
]
