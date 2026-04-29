from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Конфігурація застосунку."""
    
    # Database
    DATABASE_URL: str
    
    # Application
    APP_NAME: str = "Music Review API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    
    # Security
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_ALGORITHM: str = "HS256"
    
    # Spotify
    SPOTIFY_CLIENT_ID: str = ""
    SPOTIFY_CLIENT_SECRET: str = ""
    
    # Gemini AI
    GEMINI_API_KEY: str = ""

    # Email (Resend) — для верифікації акаунтів.
    # Якщо RESEND_API_KEY порожній — лист не відсилається, код друкується у логах.
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "MusicReview <onboarding@resend.dev>"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


settings = Settings()