from pydantic import BaseModel, ConfigDict


class ArtistRead(BaseModel):
    """Артист у відповіді API."""
    
    id: int
    name: str
    spotify_id: str | None
    bio: str | None
    image_url: str | None
    
    model_config = ConfigDict(from_attributes=True)