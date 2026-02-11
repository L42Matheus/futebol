from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime, date, time


class JogoBase(BaseModel):
    data_hora: datetime
    local: Optional[str] = Field(None, max_length=200)
    endereco: Optional[str] = Field(None, max_length=300)
    valor_campo: Optional[int] = Field(default=None, ge=0)
    observacoes: Optional[str] = None

    @field_validator("data_hora", mode="before")
    @classmethod
    def parse_data_hora(cls, value):
        if isinstance(value, datetime):
            return value
        if isinstance(value, date):
            return datetime.combine(value, time.min)
        if isinstance(value, str):
            for fmt in ("%d/%m/%Y", "%d/%m/%Y %H:%M", "%d/%m/%Y %H:%M:%S"):
                try:
                    parsed = datetime.strptime(value, fmt)
                    return parsed
                except ValueError:
                    continue
        return value


class JogoCreate(JogoBase):
    racha_id: int


class JogoUpdate(BaseModel):
    data_hora: Optional[datetime] = None
    local: Optional[str] = Field(None, max_length=200)
    endereco: Optional[str] = Field(None, max_length=300)
    valor_campo: Optional[int] = Field(None, ge=0)
    observacoes: Optional[str] = None
    finalizado: Optional[bool] = None
    cancelado: Optional[bool] = None

    @field_validator("data_hora", mode="before")
    @classmethod
    def parse_data_hora(cls, value):
        if value is None:
            return value
        if isinstance(value, datetime):
            return value
        if isinstance(value, date):
            return datetime.combine(value, time.min)
        if isinstance(value, str):
            for fmt in ("%d/%m/%Y", "%d/%m/%Y %H:%M", "%d/%m/%Y %H:%M:%S"):
                try:
                    parsed = datetime.strptime(value, fmt)
                    return parsed
                except ValueError:
                    continue
        return value


class JogoResponse(JogoBase):
    id: int
    racha_id: int
    finalizado: bool
    cancelado: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    total_confirmados: int = 0

    class Config:
        from_attributes = True
