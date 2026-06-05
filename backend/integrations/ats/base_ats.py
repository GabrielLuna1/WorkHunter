import asyncio
from abc import ABC, abstractmethod
from typing import List

from integrations.base import BaseCollector
from core.logger import logger
from models.vaga import VagaBruta
import re


_ats_semaphore = asyncio.Semaphore(3)


class ATSIntegrador(BaseCollector, ABC):
    nome: str = ""
    prioridade: int = 50
    MAX_FAILURES = 3
    TIMEOUT = 10

    def __init__(self) -> None:
        super().__init__(nome=self.nome)
        self._falhas: dict[str, int] = {}

    @property
    @abstractmethod
    def empresas(self) -> dict[str, dict]: ...

    def _registrar_sucesso(self, empresa: str):
        self._falhas[empresa] = 0

    def _registrar_falha(self, empresa: str) -> bool:
        self._falhas[empresa] = self._falhas.get(empresa, 0) + 1
        return self._falhas[empresa] >= self.MAX_FAILURES

    def _empresa_bloqueada(self, empresa: str) -> bool:
        return self._falhas.get(empresa, 0) >= self.MAX_FAILURES

    async def coletar(self) -> List[VagaBruta]:
        vagas: List[VagaBruta] = []
        logger.info("ats.iniciando", integrador=self.nome, prioridade=self.prioridade)

        empresas_ordenadas = sorted(
            self.empresas.items(),
            key=lambda item: item[1].get("prioridade", 50),
            reverse=True,
        )

        for empresa, config in empresas_ordenadas:
            if self._empresa_bloqueada(empresa):
                logger.warning(
                    "ats.empresa_bloqueada", integrador=self.nome, empresa=empresa
                )
                continue

            async with _ats_semaphore:
                try:
                    logger.info("ats.extraindo", integrador=self.nome, empresa=empresa)
                    vagas_empresa = await self.extrair_vagas(empresa, config)
                    self._registrar_sucesso(empresa)
                    for vaga in vagas_empresa:
                        if vaga is not None:
                            vagas.append(vaga)
                    logger.info(
                        "ats.extraido_ok",
                        integrador=self.nome,
                        empresa=empresa,
                        total=len(vagas_empresa),
                    )
                except Exception as e:
                    logger.warning(
                        "ats.extraido_erro",
                        integrador=self.nome,
                        empresa=empresa,
                        error=str(e),
                    )
                    bloquear = self._registrar_falha(empresa)
                    if bloquear:
                        logger.warning(
                            "ats.empresa_bloqueada_circuit",
                            integrador=self.nome,
                            empresa=empresa,
                        )

        logger.info("ats.concluido", integrador=self.nome, total=len(vagas))
        return vagas

    @abstractmethod
    async def extrair_vagas(self, empresa: str, config: dict) -> List[VagaBruta]: ...

    def _validar_vaga(self, titulo: str, localizacao: str, descricao: str) -> bool:
        titulo_lower = (titulo or "").lower()
        local_lower = (localizacao or "").lower()

        # Filtro de LocalizaÃ§Ã£o (Blacklist)
        location_blacklist = [
            "india",
            "united states only",
            "canada only",
            "europe only",
            "visa sponsorship required",
            "us only",
        ]
        if any(b in local_lower for b in location_blacklist):
            return False

        # Filtro de Ãrea (Blacklist - Baixa Prioridade/ExclusÃµes)
        role_blacklist = [
            "suporte tÃ©cnico",
            "help desk",
            "service desk",
            "infraestrutura",
            "redes",
            "hardware",
            "tÃ©cnico de campo",
            "vendas",
            "comercial",
            "marketing",
            "recursos humanos",
            "financeiro",
            "jurÃ­dico",
            "administrativo",
            "sales",
            "hr",
            "human resources",
            "finance",
            "legal",
            "support",
        ]
        if any(
            re.search(r"\b" + re.escape(b) + r"\b", titulo_lower)
            for b in role_blacklist
        ):
            return False

        # Filtro de Ãrea (Whitelist - Tecnologia)
        role_whitelist = [
            "software",
            "developer",
            "engineer",
            "front",
            "back",
            "full",
            "web",
            "desenvolvedor",
            "engenheiro",
            "programador",
            "analista",
            "aplicaÃ§Ãµes",
            "sistemas",
            "react",
            "next",
            "node",
            "javascript",
            "typescript",
            "nest",
            ".net",
            "java",
            "python",
            "php",
            "mobile",
            "tech lead",
            "lÃ­der tÃ©cnico",
            "architect",
            "arquiteto",
            "dados",
            "data",
        ]
        if not any(w in titulo_lower for w in role_whitelist):
            return False

        return True

    def _montar_vaga(self, empresa: str, config: dict, **kwargs) -> VagaBruta | None:
        titulo = kwargs.get("titulo", "")
        localizacao = kwargs.get("localizacao", "")
        descricao = kwargs.get("descricao", "")

        if not self._validar_vaga(titulo, localizacao, descricao):
            return None

        return VagaBruta(
            fonte=self.nome,
            fonte_detalhada=f"{self.nome}:{empresa}",
            empresa=empresa,
            **kwargs,
        )
