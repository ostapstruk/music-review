from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Artist, ArtistClaim, Track, User
from app.services.spotify_service import spotify_client
from app.services.track_service import create_track_from_spotify


class ArtistNotFoundError(Exception):
    pass


class ClaimNotFoundError(Exception):
    pass


class ClaimConflictError(Exception):
    """Артист уже має власника, або юзер уже подавав активний запит, тощо."""
    pass


class ClaimAlreadyResolvedError(Exception):
    pass


class NotAnArtistError(Exception):
    """У юзера нема привʼязаного артиста."""
    pass


class ArtistMissingSpotifyIdError(Exception):
    pass


def get_my_artist(db: Session, user_id: int) -> Artist | None:
    """Артист, якого зараз володіє юзер (через claimed_by_user_id)."""
    return db.execute(
        select(Artist).where(Artist.claimed_by_user_id == user_id)
    ).scalar_one_or_none()


def create_claim(
    db: Session,
    user_id: int,
    artist_id: int,
    message: str | None,
) -> ArtistClaim:
    """
    Юзер подає запит на володіння артистом. Один юзер — один claim на одного
    артиста; створювати ще один pending можна лише якщо попередній відхилено.
    Юзер, який уже володіє якимось артистом, не може подавати нові запити.
    """
    artist = db.execute(
        select(Artist).where(Artist.id == artist_id)
    ).scalar_one_or_none()
    if artist is None:
        raise ArtistNotFoundError(f"Artist {artist_id} not found")

    if artist.claimed_by_user_id is not None:
        raise ClaimConflictError("This artist is already claimed by another user")

    already_owns = db.execute(
        select(Artist).where(Artist.claimed_by_user_id == user_id)
    ).scalar_one_or_none()
    if already_owns is not None:
        raise ClaimConflictError("You already own an artist page")

    existing = db.execute(
        select(ArtistClaim).where(
            ArtistClaim.user_id == user_id,
            ArtistClaim.artist_id == artist_id,
        )
    ).scalar_one_or_none()

    if existing is not None:
        if existing.status == "pending":
            raise ClaimConflictError("You already have a pending claim for this artist")
        if existing.status == "approved":
            raise ClaimConflictError("This claim was already approved")
        # rejected — дозволяємо подати знову, оновлюючи запис
        existing.status = "pending"
        existing.message = message
        existing.reviewed_at = None
        existing.reviewed_by = None
        db.commit()
        db.refresh(existing)
        return existing

    claim = ArtistClaim(
        user_id=user_id,
        artist_id=artist_id,
        status="pending",
        message=message,
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim


def list_claims(db: Session, status_filter: str | None = None) -> list[dict]:
    """Список claim-запитів для адмінської панелі. Опційно — за статусом."""
    stmt = (
        select(
            ArtistClaim,
            User.username,
            Artist.name.label("artist_name"),
            Artist.spotify_id.label("artist_spotify_id"),
        )
        .join(User, ArtistClaim.user_id == User.id)
        .join(Artist, ArtistClaim.artist_id == Artist.id)
        .order_by(ArtistClaim.created_at.desc())
    )
    if status_filter:
        stmt = stmt.where(ArtistClaim.status == status_filter)

    rows = db.execute(stmt).all()
    return [
        {
            "id": claim.id,
            "user_id": claim.user_id,
            "artist_id": claim.artist_id,
            "status": claim.status,
            "message": claim.message,
            "created_at": claim.created_at,
            "reviewed_at": claim.reviewed_at,
            "reviewed_by": claim.reviewed_by,
            "username": username,
            "artist_name": artist_name,
            "artist_spotify_id": artist_spotify_id,
        }
        for claim, username, artist_name, artist_spotify_id in rows
    ]


def approve_claim(db: Session, claim_id: int, admin_id: int) -> ArtistClaim:
    """
    Адмін апрувить claim:
    - проставляє artists.claimed_by_user_id = user_id;
    - users.role = 'artist' (якщо ще не admin);
    - відхиляє всі інші pending-запити цього юзера й цього артиста.
    """
    claim = db.execute(
        select(ArtistClaim).where(ArtistClaim.id == claim_id)
    ).scalar_one_or_none()
    if claim is None:
        raise ClaimNotFoundError(f"Claim {claim_id} not found")

    if claim.status != "pending":
        raise ClaimAlreadyResolvedError(
            f"Claim {claim_id} already {claim.status}"
        )

    artist = db.execute(
        select(Artist).where(Artist.id == claim.artist_id)
    ).scalar_one_or_none()
    if artist is None:
        raise ArtistNotFoundError(f"Artist {claim.artist_id} not found")

    if artist.claimed_by_user_id is not None and artist.claimed_by_user_id != claim.user_id:
        raise ClaimConflictError("This artist is already claimed by another user")

    user = db.execute(
        select(User).where(User.id == claim.user_id)
    ).scalar_one_or_none()
    if user is None:
        raise ClaimNotFoundError("Claim author no longer exists")

    now = datetime.now(timezone.utc)

    artist.claimed_by_user_id = user.id
    if user.role != "admin":
        user.role = "artist"

    claim.status = "approved"
    claim.reviewed_at = now
    claim.reviewed_by = admin_id

    # Інші pending-запити цього юзера або на цього артиста — відхиляємо.
    other_claims = db.execute(
        select(ArtistClaim).where(
            ArtistClaim.id != claim.id,
            ArtistClaim.status == "pending",
            (ArtistClaim.user_id == user.id) | (ArtistClaim.artist_id == artist.id),
        )
    ).scalars().all()
    for other in other_claims:
        other.status = "rejected"
        other.reviewed_at = now
        other.reviewed_by = admin_id

    db.commit()
    db.refresh(claim)
    return claim


def reject_claim(db: Session, claim_id: int, admin_id: int) -> ArtistClaim:
    """Адмін відхиляє claim."""
    claim = db.execute(
        select(ArtistClaim).where(ArtistClaim.id == claim_id)
    ).scalar_one_or_none()
    if claim is None:
        raise ClaimNotFoundError(f"Claim {claim_id} not found")

    if claim.status != "pending":
        raise ClaimAlreadyResolvedError(
            f"Claim {claim_id} already {claim.status}"
        )

    claim.status = "rejected"
    claim.reviewed_at = datetime.now(timezone.utc)
    claim.reviewed_by = admin_id
    db.commit()
    db.refresh(claim)
    return claim


async def sync_artist_tracks(
    db: Session,
    user_id: int,
    *,
    auto_approve: bool = False,
) -> dict:
    """
    Тягне топ-треки привʼязаного артиста зі Spotify і додає ті, яких ще нема.
    Існуючі треки (з тим самим spotify_id) пропускаємо.

    Якщо auto_approve=False (звичайний верифікований артист) — створені треки
    отримують статус 'pending' і потрапляють на адмін-модерацію.
    Якщо auto_approve=True (адмін синкає) — одразу 'approved'.
    """
    artist = get_my_artist(db, user_id)
    if artist is None:
        raise NotAnArtistError("You don't own any artist page")

    if not artist.spotify_id:
        raise ArtistMissingSpotifyIdError(
            "Artist has no Spotify ID — cannot auto-sync tracks"
        )

    top = await spotify_client.get_artist_top_tracks(
        artist.spotify_id, artist_name=artist.name,
    )
    fetched = len(top)
    created = 0
    skipped = 0
    promoted = 0

    for spotify_track in top:
        existing = db.execute(
            select(Track).where(Track.spotify_id == spotify_track["spotify_id"])
        ).scalar_one_or_none()
        if existing is not None:
            # Якщо адмін повторно синкає і вже існуючий трек у статусі
            # pending — промотуємо до approved, щоб не доводилось окремо
            # йти в адмін-панель модерації.
            if auto_approve and existing.status == "pending":
                existing.status = "approved"
                promoted += 1
            else:
                skipped += 1
            continue

        await create_track_from_spotify(
            db,
            spotify_track,
            submitted_by=user_id,
            auto_approve=auto_approve,
        )
        created += 1

    if promoted:
        db.commit()

    return {
        "artist_id": artist.id,
        "spotify_id": artist.spotify_id,
        "fetched": fetched,
        "created": created,
        "skipped": skipped,
        "promoted": promoted,
    }
