from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class VagaBruta(BaseModel):
    titulo: str
    empresa: str
    descricao: str
    localizacao: Optional[str] = None
    uf: Optional[str] = None
    modelo_trabalho: Optional[str] = None
    url: str
    fonte: str
    fonte_detalhada: Optional[str] = None
    id_externo: str
    salario_min: Optional[float] = None
    salario_max: Optional[float] = None
    tipo_contrato: Optional[str] = None
    data_publicacao: Optional[datetime] = None
    termo_busca: str = ""


class AnaliseOffline(BaseModel):
    fake_junior: bool = False
    fake_junior_detalhes: list[str] = Field(default_factory=list)
    nivel_estimado: str = "Pleno"

class AnaliseIA(BaseModel):
    stack_principal: list[str] = Field(default_factory=list)
    nivel: str = "Pleno"
    fake_junior: bool = False
    salario_estimado_min: Optional[float] = None
    salario_estimado_max: Optional[float] = None
    resumo: str = ""

class VagaDB(VagaBruta):
    hash: str
    score: int = 50
    analise: Optional[AnaliseOffline] = None
    analise_ia: Optional[AnaliseIA] = None
    coletada_em: datetime = Field(default_factory=datetime.utcnow)
    ativa: bool = True


class VagaResponse(VagaBruta):
    id: str
    salario_min: Optional[float]
    salario_max: Optional[float]
    tipo_contrato: Optional[str]
    data_publicacao: Optional[datetime]
    score: int
    analise: Optional[AnaliseOffline] = None
    analise_ia: Optional[AnaliseIA] = None
    coletada_em: datetime
    ativa: bool
    usuario_status: Optional[dict] = None


class VagaListaResponse(BaseModel):
    data: list[VagaResponse]
    total: int
    page: int
    limit: int
    total_pages: int
