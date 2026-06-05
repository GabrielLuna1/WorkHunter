from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ExperienciaProfissional(BaseModel):
    empresa: str
    cargo: str
    data_inicio: Optional[str] = None  # Ex: "Mar 2023"
    data_fim: Optional[str] = None  # Ex: "Atual" ou "Dez 2022"
    descricao: list[str] = []  # Lista de bullets de responsabilidade
    tecnologias: list[str] = []  # Tecnologias usadas nessa experiÃªncia


class Projeto(BaseModel):
    nome: str
    descricao: Optional[str] = None
    bullets: list[str] = []  # RealizaÃ§Ãµes e detalhes tÃ©cnicos
    tecnologias: list[str] = []
    url: Optional[str] = None


class Formacao(BaseModel):
    instituicao: str
    curso: str
    nivel: Optional[str] = None  # Ex: "TecnÃ³logo", "Bacharelado", "MBA"
    data_conclusao: Optional[str] = None  # Ex: "Dez 2020"
    em_andamento: bool = False


class Certificacao(BaseModel):
    nome: str
    instituicao: Optional[str] = None
    ano: Optional[str] = None
    descricao: Optional[str] = None


class Idioma(BaseModel):
    idioma: str
    nivel: str  # Ex: "Nativo", "IntermediÃ¡rio", "AvanÃ§ado"


class SecaoGenerica(BaseModel):
    titulo: str  # "Achievements", "Open Source", etc.
    conteudo: str  # Texto bruto preservado
    ordem: int = 0


class CurriculoSchema(BaseModel):
    nome: str
    email: Optional[str] = None
    telefone: Optional[str] = None
    cidade: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio: Optional[str] = None
    github: Optional[str] = None

    resumo_profissional: Optional[str] = None
    experiencias: list[ExperienciaProfissional] = []
    projetos: list[Projeto] = []
    formacoes: list[Formacao] = []
    certificacoes: list[Certificacao] = []
    idiomas: list[Idioma] = []
    skills: list[str] = []
    secoes_personalizadas: list[SecaoGenerica] = []

    # Parsing metadata â€” preservaÃ§Ã£o e transparÃªncia
    texto_bruto: Optional[str] = None  # Texto extraÃ­do original, NUNCA modificado
    idioma_detectado: Optional[str] = None  # "pt" | "en" | "es"
    parsing_confidence: Optional[float] = None  # 0.0-1.0 mÃ©dia geral
    parsing_warnings: list[str] = []  # Alertas do parser
    total_secoes_detectadas: int = 0  # Quantidade de seÃ§Ãµes identificadas

    versao: int = 1
    nome_versao: Optional[str] = None
    criado_em: Optional[datetime] = None
    atualizado_em: Optional[datetime] = None
    fonte_arquivo: Optional[str] = None
    arquivo_original_path: Optional[str] = None
