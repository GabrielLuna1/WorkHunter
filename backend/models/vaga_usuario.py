from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class VagaUsuario(BaseModel):
    user_id: str = "default"
    vaga_id: str
    favoritada: bool = False
    aplicada: bool = False
    salva: bool = False
    analisada: bool = False
    ignorada: bool = False
    arquivada: bool = False
    notas: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class VagaUsuarioResponse(BaseModel):
    id: str
    favoritada: bool
    aplicada: bool
    salva: bool
    analisada: bool
    ignorada: bool
    arquivada: bool
    notas: str
    updated_at: datetime
