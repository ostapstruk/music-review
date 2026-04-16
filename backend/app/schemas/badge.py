from pydantic import BaseModel, ConfigDict


class BadgeRead(BaseModel):
    """
    Схема бейджа для відповідей API.
    """
    
    id: int
    code: str
    name: str
    description: str
    icon_url: str | None
    tier: str
    
    model_config = ConfigDict(from_attributes=True)