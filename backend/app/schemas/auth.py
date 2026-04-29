from pydantic import BaseModel, EmailStr, Field


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


class VerifyRequest(BaseModel):
    """Тіло запиту на підтвердження коду."""

    email: EmailStr
    code: str = Field(min_length=4, max_length=10)


class ResendRequest(BaseModel):
    """Тіло запиту на повторне надсилання коду."""

    email: EmailStr