from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class EventoDB(BaseModel):
    user_id: str = "default"
    pipeline_id: Optional[str] = None
    vaga_id: str
    empresa: str
    titulo: str
    tipo: str  # entrevista_rh, entrevista_tecnica, teste_tecnico, follow_up
    data_inicio: datetime
    data_fim: Optional[datetime] = None
    descricao: str = ""
    local: str = ""
    url: str = ""
    status: str = "pendente"  # pendente, confirmado, concluido, cancelado
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class EventoResponse(BaseModel):
    id: str
    pipeline_id: Optional[str]
    vaga_id: str
    empresa: str
    titulo: str
    tipo: str
    data_inicio: datetime
    data_fim: Optional[datetime]
    descricao: str
    local: str
    url: str
    status: str
    created_at: datetime
    updated_at: datetime


class EventoCreate(BaseModel):
    pipeline_id: Optional[str] = None
    vaga_id: str
    empresa: str
    titulo: str
    tipo: str
    data_inicio: datetime
    data_fim: Optional[datetime] = None
    descricao: str = ""
    local: str = ""
    url: str = ""
    status: str = "pendente"
