from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


ETAPAS_PIPELINE = [
    "salva",
    "aplicada",
    "em_analise",
    "entrevista_rh",
    "entrevista_tecnica",
    "teste_tecnico",
    "contratado",
]

ETAPAS_REJEICAO = [
    "rejeitado",
]


class HistoricoEtapa(BaseModel):
    etapa: str
    data: datetime = Field(default_factory=datetime.utcnow)
    observacao: Optional[str] = None


class PipelineDB(BaseModel):
    user_id: str = "default"
    vaga_id: str
    vaga_titulo: str
    empresa: str
    fonte: str
    score: int = 50
    url: str = ""
    etapa: str = "salva"
    curriculo_gerado: bool = False
    curriculo_path: Optional[str] = None
    curriculo_versao_id: Optional[str] = None
    aplicada_em: Optional[datetime] = None
    notas: str = ""
    proxima_acao: Optional[str] = None
    proxima_data: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    historico: list[HistoricoEtapa] = []


class PipelineResponse(BaseModel):
    id: str
    vaga_id: str
    vaga_titulo: str
    empresa: str
    fonte: str
    score: int
    url: str
    etapa: str
    curriculo_gerado: bool
    curriculo_path: Optional[str]
    curriculo_versao_id: Optional[str]
    aplicada_em: Optional[datetime]
    notas: str
    proxima_acao: Optional[str]
    proxima_data: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    historico: list[HistoricoEtapa]
