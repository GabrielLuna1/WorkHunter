from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.perfil_usuario import PerfilUsuario
from core.logger import logger


DEFAULT_TERMOS = [
    "desenvolvedor frontend",
    "desenvolvedor backend",
    "desenvolvedor full stack",
    "engenheiro de software",
    "react developer",
    "node.js developer",
    "frontend",
    "backend",
    "full stack",
    "react",
    "next.js",
    "node.js",
    "python developer",
    "fastapi",
    "typescript",
]


class SearchTermsService:
    """Gera termos de busca inteligentes a partir do perfil do usuÃ¡rio."""

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db

    async def get_termos(self) -> List[str]:
        """
        Combina cargos_alvo + skills principais + palavras_chave_busca
        do perfil para gerar a lista final de termos de busca.
        Fallback: termos padrÃ£o de desenvolvimento se perfil nÃ£o existir.
        """
        perfil = await self._carregar_perfil()
        if not perfil:
            logger.info("search_terms.sem_perfil_usando_default")
            return DEFAULT_TERMOS

        termos: List[str] = []

        # 1. Cargos-alvo sÃ£o prioridade mÃ¡xima
        if perfil.cargos_alvo:
            termos.extend(perfil.cargos_alvo)

        # 2. Palavras-chave de busca do perfil
        if perfil.palavras_chave_busca:
            termos.extend(perfil.palavras_chave_busca)

        # 3. Skills mais relevantes (top 10 por nome)
        if perfil.stacks_atuais:
            skill_names = [s.nome for s in perfil.stacks_atuais[:10]]
            termos.extend(skill_names)

        # Dedup preservando ordem
        seen: set = set()
        unique: List[str] = []
        for t in termos:
            t_lower = t.lower().strip()
            if t_lower and t_lower not in seen:
                seen.add(t_lower)
                unique.append(t.strip())

        if not unique:
            logger.info("search_terms.perfil_vazio_usando_default")
            return DEFAULT_TERMOS

        logger.info("search_terms.gerados", total=len(unique), termos=unique[:5])
        return unique

    async def _carregar_perfil(self) -> Optional[PerfilUsuario]:
        doc = await self.db["perfil_usuario"].find_one({})
        if not doc:
            return None
        try:
            return PerfilUsuario(**doc)
        except Exception as e:
            logger.warning("search_terms.erro_perfil", error=str(e))
            return None
