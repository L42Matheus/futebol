from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


class UserBase(BaseModel):
    nome: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    telefone: Optional[str] = Field(None, max_length=20)

    @model_validator(mode="after")
    def validate_email_or_phone(self):
        if not self.email and not self.telefone:
            raise ValueError("Informe e-mail ou telefone")
        return self


class UserCreate(UserBase):
    senha: str = Field(..., min_length=6, max_length=72)
    invite_token: Optional[str] = None
    role: UserRole = UserRole.ATLETA


class UserLogin(BaseModel):
    identificador: str = Field(..., min_length=3, max_length=255)
    senha: str = Field(..., min_length=6, max_length=72)
    push_token: Optional[str] = None
    plataforma: Optional[str] = None


class UserResponse(UserBase):
    id: int
    ativo: bool
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
