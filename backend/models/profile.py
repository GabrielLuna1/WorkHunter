from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class IdiomaProfile(BaseModel):
    nome: str
    nivel: str


class SkillsPorCategoria(BaseModel):
    frontend: list[str] = []
    backend: list[str] = []
    database: list[str] = []
    cloud: list[str] = []
    devops: list[str] = []
    mobile: list[str] = []
    ia: list[str] = []
    outros: list[str] = []


class ProfileSchema(BaseModel):
    user_id: str
    nome: str
    email: Optional[str] = ""
    telefone: Optional[str] = ""
    cidade: Optional[str] = ""
    estado: Optional[str] = ""
    pais: Optional[str] = ""
    linkedin: Optional[str] = ""
    github: Optional[str] = ""
    portfolio: Optional[str] = ""

    titulo_profissional: Optional[str] = ""
    senioridade: Optional[str] = ""
    anos_experiencia: int = 0
    total_empresas: int = 0
    tempo_total_experiencia: Optional[str] = ""

    stack_principal: list[str] = []
    skills: SkillsPorCategoria = SkillsPorCategoria()
    idiomas: list[IdiomaProfile] = []

    curriculo_ativo_id: Optional[str] = ""
    updated_at: Optional[datetime] = None
