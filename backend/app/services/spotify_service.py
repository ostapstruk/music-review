import base64
import logging
from datetime import datetime, timezone

import httpx

from app.core.config import settings


logger = logging.getLogger(__name__)


def _log_spotify_error(response: httpx.Response, context: str) -> None:
    """Логує тіло помилкової відповіді Spotify, щоб було видно причину 4xx."""
    try:
        body = response.json()
        message = body.get("error", {}).get("message") or body
    except Exception:
        message = response.text[:500]
    logger.warning(
        "Spotify %s error for %s: %s",
        response.status_code, context, message,
    )
    print(
        f"[spotify-error] status={response.status_code} ctx={context} body={message}",
        flush=True,
    )


class SpotifyClient:
    """
    Клієнт для Spotify Web API.
    
    Використовує Client Credentials Flow — автентифікація додатку,
    без логіну користувача. Достатньо для пошуку треків.
    """
    
    TOKEN_URL = "https://accounts.spotify.com/api/token"
    API_BASE = "https://api.spotify.com/v1"
    
    def __init__(self):
        self._token: str | None = None
        self._token_expires: datetime | None = None
    
    async def _get_token(self) -> str:
        """
        Отримує access token від Spotify.
        Кешує до закінчення терміну дії.
        """
        now = datetime.now(timezone.utc)
        
        # Якщо токен ще валідний — повертаємо кешований
        if self._token and self._token_expires and now < self._token_expires:
            return self._token
        
        # Кодуємо client_id:client_secret у Base64
        credentials = f"{settings.SPOTIFY_CLIENT_ID}:{settings.SPOTIFY_CLIENT_SECRET}"
        encoded = base64.b64encode(credentials.encode()).decode()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                headers={
                    "Authorization": f"Basic {encoded}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={"grant_type": "client_credentials"},
            )
            response.raise_for_status()
            data = response.json()
        
        self._token = data["access_token"]
        # Spotify видає токен на 3600 секунд (1 год), ставимо з запасом
        self._token_expires = now.replace(second=0) 
        from datetime import timedelta
        self._token_expires = now + timedelta(seconds=data["expires_in"] - 60)
        
        return self._token
    
    async def search_tracks(self, query: str, limit: int = 10) -> list[dict]:
        """
        Шукає треки за запитом.
        Повертає список з назвою, артистом, обкладинкою, тривалістю.
        """
        token = await self._get_token()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE}/search",
                params={
                    "q": query,
                    "type": "track",
                    "limit": limit,
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()
            data = response.json()

        return [self._format_track(item) for item in data.get("tracks", {}).get("items", [])]

    def _format_track(self, item: dict) -> dict:
        """Перетворює track-обʼєкт зі Spotify-відповіді у наш плоский формат."""
        primary_artist = item["artists"][0] if item.get("artists") else None
        return {
            "spotify_id": item["id"],
            "title": item["name"],
            "artist_name": primary_artist["name"] if primary_artist else "Unknown",
            "artist_spotify_id": primary_artist["id"] if primary_artist else None,
            "album_title": item["album"]["name"] if item.get("album") else None,
            "release_year": self._extract_year(item.get("album", {}).get("release_date")),
            "cover_url": self._get_cover(item.get("album", {}).get("images", [])),
            "duration_ms": item.get("duration_ms"),
            "preview_url": item.get("preview_url"),
        }
    
    async def get_artist_top_tracks(
        self,
        spotify_artist_id: str,
        artist_name: str | None = None,
        market: str = "US",
        limit: int = 10,
    ) -> list[dict]:
        """
        Топ-треки артиста зі Spotify.
        Спочатку пробуємо офіційний `/artists/{id}/top-tracks`. Якщо Spotify
        віддає 403 (рестрикції Client-Credentials-режиму, які зʼявились у
        листопаді 2024), фолбекаємось до search-API з фільтром
        `artist:"<name>"` і відсіюємо лише треки потрібного артиста.
        """
        token = await self._get_token()

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.API_BASE}/artists/{spotify_artist_id}/top-tracks",
                    params={"market": market},
                    headers={"Authorization": f"Bearer {token}"},
                )
                if response.status_code >= 400:
                    _log_spotify_error(response, f"top-tracks artist={spotify_artist_id}")
                    response.raise_for_status()
                data = response.json()
            return [self._format_track(item) for item in data.get("tracks", [])][:limit]
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code != 403:
                raise
            # Падаємо в фолбек

        # Якщо імʼя артиста не передали — спробуємо дістати його з /artists/{id}.
        if not artist_name:
            try:
                meta = await self.get_artist(spotify_artist_id)
                if meta:
                    artist_name = meta.get("name")
            except httpx.HTTPStatusError:
                artist_name = None

        if not artist_name:
            return []

        return await self._search_tracks_by_artist(
            spotify_artist_id, artist_name, market, limit,
        )

    async def _search_tracks_by_artist(
        self,
        spotify_artist_id: str,
        artist_name: str,
        market: str,
        limit: int,
    ) -> list[dict]:
        """
        Search-фолбек: знаходить треки артиста через звичайний search і
        фільтрує за artist_id. Свідомо НЕ використовуємо `market` та
        field-filter `artist:"..."` — на Spotify dev-аплікаціях вони
        часто повертають 400. Точність забезпечуємо локальним фільтром
        за artist_id.
        """
        token = await self._get_token()
        # Spotify dev-апи без Extended Quota мають жорсткий ліміт = 10
        # на /search (limit=20 уже віддає 400 "Invalid limit").
        fetch_limit = 10

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE}/search",
                params={
                    "q": artist_name,
                    "type": "track",
                    "limit": fetch_limit,
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            if response.status_code >= 400:
                _log_spotify_error(
                    response,
                    f"search q={artist_name!r} limit={fetch_limit}",
                )
                response.raise_for_status()
            data = response.json()

        items = data.get("tracks", {}).get("items", [])
        # Лишаємо лише ті, де серед артистів є наш ID — позбавляємось колаб-треків
        # випадкових тезок. Дедуплікуємо за spotify_id (search може повертати дублі).
        seen: set[str] = set()
        results: list[dict] = []
        for item in items:
            track_artist_ids = {a["id"] for a in item.get("artists", [])}
            if spotify_artist_id not in track_artist_ids:
                continue
            track_id = item.get("id")
            if not track_id or track_id in seen:
                continue
            seen.add(track_id)
            results.append(self._format_track(item))
            if len(results) >= limit:
                break

        return results

    async def get_artist(self, spotify_artist_id: str) -> dict | None:
        """
        Метадані артиста (name, image, genres). Використовується при імпорті
        нового артиста з посилання Spotify.
        """
        token = await self._get_token()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE}/artists/{spotify_artist_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            data = response.json()

        return {
            "spotify_id": data["id"],
            "name": data["name"],
            "image_url": self._get_cover(data.get("images", [])),
        }

    async def get_track_features(self, spotify_id: str) -> dict | None:
        """
        Отримує audio features треку (danceability, energy тощо).
        Може повернути None, якщо Spotify не має даних для цього треку.
        """
        token = await self._get_token()
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.API_BASE}/audio-features/{spotify_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                if response.status_code == 404:
                    return None
                response.raise_for_status()
                data = response.json()
            
            return {
                "danceability": data.get("danceability"),
                "energy": data.get("energy"),
                "acousticness": data.get("acousticness"),
                "valence": data.get("valence"),
                "tempo": data.get("tempo"),
            }
        except Exception:
            return None
    
    @staticmethod
    def _get_cover(images: list) -> str | None:
        """Дістає URL обкладинки середнього розміру."""
        if not images:
            return None
        # Spotify повертає кілька розмірів, беремо середній
        if len(images) >= 2:
            return images[1]["url"]
        return images[0]["url"]
    
    @staticmethod
    def _extract_year(date_str: str | None) -> int | None:
        """Витягує рік з дати типу '2020-03-20' або '2020'."""
        if not date_str:
            return None
        try:
            return int(date_str[:4])
        except (ValueError, IndexError):
            return None


# Один екземпляр на весь додаток (кешує токен)
spotify_client = SpotifyClient()

async def fetch_deezer_preview(title: str, artist: str) -> str | None:
    """
    Шукає 30-секундний preview треку через Deezer API.
    Deezer API безкоштовний і не потребує ключів.
    Використовується як fallback, коли Spotify не дає preview_url.
    """
    query = f"{title} {artist}"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.deezer.com/search",
                params={"q": query, "limit": 1},
            )
            response.raise_for_status()
            data = response.json()
        
        items = data.get("data", [])
        if items and items[0].get("preview"):
            return items[0]["preview"]
        return None
    except Exception:
        return None