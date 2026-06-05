from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CandidaturaDB(BaseModel):
    vaga_id: str
    vaga_titulo: str
    empresa: str
    status: str = "salva"
    score_no_momento: int = 50
    curriculo_gerado: bool = False
    curriculo_path: Optional[str] = None
    observacoes: Optional[str] = None
    criada_em: datetime = Field(default_factory=datetime.utcnow)
    atualizada_em: datetime = Field(default_factory=datetime.utcnow)


class CandidaturaResponse(BaseModel):
    id: str
    vaga_id: str
    vaga_titulo: str
    empresa: str
    status: str
    score_no_momento: int
    curriculo_gerado: bool
    curriculo_path: Optional[str]
    observacoes: Optional[str]
    criada_em: datetime
    atualizada_em: datetime
