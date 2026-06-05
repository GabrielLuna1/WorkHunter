from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class VagaAnalysisInput(BaseModel):
    titulo: str
    descricao: str
    empresa: str = ""
    fonte: str = ""


class Requisito(BaseModel):
    descricao: str
    tipo: str = "obrigatorio"


class SkillMatch(BaseModel):
    skill: str
    nivel_vaga: str = ""
    nivel_usuario: str = ""


class Gap(BaseModel):
    area: str
    descricao: str
    impacto: str = "medio"


class VagaAnalysis(BaseModel):
    vaga_id: str
    user_id: str = "default"
    stack_principal: list[str] = []
    nivel: str = ""
    fake_junior: bool = False
    salario_estimado_min: Optional[int] = None
    salario_estimado_max: Optional[int] = None
    resumo: str = ""
    requisitos_obrigatorios: list[Requisito] = []
    requisitos_desejaveis: list[Requisito] = []
    soft_skills: list[str] = []
    palavras_chave_ats: list[str] = []
    senioridade_detectada: str = ""
    modalidade: str = ""
    idiomas: list[dict] = []
    tempo_experiencia_anos: Optional[int] = None
    riscos: list[str] = []
    pontos_fortes: list[str] = []
    recomendacoes: list[str] = []
    raw_llm: Optional[dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MatchResult(BaseModel):
    vaga_id: str
    user_id: str = "default"
    curriculo_id: str = ""
    score_geral: int = 0
    score_tecnico: int = 0
    score_experiencia: int = 0
    score_soft_skills: int = 0
    skills_match: list[SkillMatch] = []
    missing_skills: list[str] = []
    gaps: list[Gap] = []
    chance_entrevista: str = "media"
    raw_llm: Optional[dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ResumeVersion(BaseModel):
    user_id: str = "default"
    vaga_id: Optional[str] = None
    versao: int = 1
    conteudo_original: dict = Field(default_factory=dict)
    conteudo_otimizado: dict = Field(default_factory=dict)
    changes_log: list[dict] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)


class LLMConfig(BaseModel):
    provider: str = "lm_studio"
    model: str = ""
    url: str = ""
    timeout: int = 120
    temperature: float = 0.1
    max_tokens: int = 2048
    api_key: str = ""


# â”€â”€â”€ Chat Models â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class ChatSessionDB(BaseModel):
    user_id: str = "default"
    titulo: str = "Nova conversa"
    status: str = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ChatMessageDB(BaseModel):
    sessao_id: str
    papel: str  # user | assistant | system
    conteudo: str
    metadata: Optional[dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ChatSessionCreate(BaseModel):
    titulo: str = "Nova conversa"


class ChatSessionResponse(BaseModel):
    id: str
    titulo: str
    status: str
    created_at: str
    updated_at: str


class ChatMessageResponse(BaseModel):
    id: str
    sessao_id: str
    papel: str
    conteudo: str
    metadata: Optional[dict] = None
    created_at: str


class ChatSendRequest(BaseModel):
    mensagem: str
    vaga_id: Optional[str] = None
