import base64
from datetime import datetime, timezone

import httpx

from app.core.config import settings


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
        
        results = []
        for item in data.get("tracks", {}).get("items", []):
            results.append({
                "spotify_id": item["id"],
                "title": item["name"],
                "artist_name": item["artists"][0]["name"] if item["artists"] else "Unknown",
                "album_title": item["album"]["name"] if item.get("album") else None,
                "release_year": self._extract_year(item.get("album", {}).get("release_date")),
                "cover_url": self._get_cover(item.get("album", {}).get("images", [])),
                "duration_ms": item.get("duration_ms"),
                "preview_url": item.get("preview_url"),
            })
        
        return results
    
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