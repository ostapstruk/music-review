from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    """Тіло запиту на логін."""
    
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """
    Відповідь на успішний логін.
    Формат відповідає OAuth2 стандарту.
    """
    
    access_token: str
    token_type: str = "bearer"