from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime


class CategoriaVaga(BaseModel):
    id: str
    label: str
    keywords_include: List[str] = []
    keywords_exclude: List[str] = []
    score_bonus: int = 0
    cor: str = "#6366f1"
    ativa: bool = True
    ordem: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None


class CategoriaUpdate(BaseModel):
    label: Optional[str] = None
    keywords_include: Optional[List[str]] = None
    keywords_exclude: Optional[List[str]] = None
    score_bonus: Optional[int] = None
    cor: Optional[str] = None
    ativa: Optional[bool] = None
    ordem: Optional[int] = None
