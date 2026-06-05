from typing import List, Optional
from pydantic import BaseModel


class StackItem(BaseModel):
    nome: str
    categoria: str = "geral"  # "frontend", "backend", "ai_ml", "devops", "geral"


class ProjetoItem(BaseModel):
    nome: str
    descricao: str
    stacks: List[str] = []
    url: Optional[str] = None


class ExperienciaItem(BaseModel):
    empresa: str
    cargo: str
    periodo: str
    descricao: str


class EducacaoItem(BaseModel):
    instituicao: str
    curso: str
    nivel: str
    periodo: str


class CertificadoItem(BaseModel):
    nome: str
    emissor: str
    ano: str


class PerfilUsuario(BaseModel):
    nome: str
    email: str
    telefone: Optional[str] = ""
    cidade: Optional[str] = ""
    linkedin: Optional[str] = ""
    github: Optional[str] = ""
    portfolio: Optional[str] = ""
    resumo_profissional: Optional[str] = ""
    cargos_alvo: Optional[List[str]] = None
    area_foco: Optional[List[str]] = None
    palavras_chave_busca: Optional[List[str]] = None
    stacks_atuais: Optional[List[StackItem]] = None
    stacks_aprendendo: Optional[List[StackItem]] = None
    experiencias: Optional[List[ExperienciaItem]] = None
    educacao: Optional[List[EducacaoItem]] = None
    certificados: Optional[List[CertificadoItem]] = None
    projetos: Optional[List[ProjetoItem]] = None
    preferencias_localizacao: Optional[List[str]] = None
    modelos_trabalho: Optional[List[str]] = None
    pretensao_salarial_min: Optional[float] = None
    palavras_chave_evitar: Optional[List[str]] = None
