from datetime import datetime
from typing import List, Optional
import httpx
from integrations.base import BaseCollector
from models.vaga import VagaBruta
from core.logger import logger


class GupyCollector(BaseCollector):
    BASE_URL = "https://employability-portal.gupy.io/api/v1/jobs"

    def __init__(self, termos: Optional[List[str]] = None) -> None:
        super().__init__(nome="gupy")
        self.termos = termos or []

    async def coletar(self) -> List[VagaBruta]:
        vagas: List[VagaBruta] = []
        headers = {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Origin": "https://portal.gupy.io",
            "Referer": "https://portal.gupy.io/",
        }
        async with httpx.AsyncClient(timeout=30, headers=headers) as client:
            for termo in self.termos:
                params = {"jobName": termo, "limit": 50, "offset": 0}
                try:
                    resp = await client.get(self.BASE_URL, params=params)
                    resp.raise_for_status()
                    dados = resp.json()
                    vagas.extend(self._parse(dados))
                    logger.info("gupy.coletor_ok", termo=termo, total=len(dados.get("data", [])))
                except httpx.HTTPError as e:
                    logger.warning("gupy.erro", termo=termo, error=str(e))
                    continue
        return vagas

    def _parse(self, dados: dict) -> List[VagaBruta]:
        resultados = []
        for item in dados.get("data", []):
            pub_date = None
            raw_date = item.get("publishedDate")
            if raw_date:
                try:
                    pub_date = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
                except (ValueError, AttributeError):
                    pass

            empresa = item.get("careerPageName") or item.get("companyName") or ""
            local = ", ".join(filter(None, [item.get("city"), item.get("state")])) or None
            descricao = (item.get("description") or "")[:5000]

            resultados.append(VagaBruta(
                titulo=(item.get("name") or "").strip(),
                empresa=empresa.strip(),
                descricao=descricao,
                localizacao=local,
                url=item.get("jobUrl") or "",
                fonte="gupy",
                id_externo=str(item.get("id", "")),
                data_publicacao=pub_date,
            ))
        return resultados
