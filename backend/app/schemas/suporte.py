from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

ASSUNTOS = {
    "duvida": "Dúvida",
    "problema": "Problema no app",
    "sugestao": "Sugestão",
    "dados": "Excluir conta ou dados",
    "outro": "Outro",
}


class ChamadoCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    assunto: Literal["duvida", "problema", "sugestao", "dados", "outro"]
    mensagem: str = Field(..., min_length=10, max_length=4000)
    pagina: Optional[str] = Field(None, max_length=300)
    # Campo escondido no formulário: pessoas não preenchem, robôs sim.
    site: Optional[str] = Field(None, max_length=200)


class ChamadoResponse(BaseModel):
    id: int
    protocolo: str
