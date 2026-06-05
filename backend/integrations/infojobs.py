from datetime import datetime
from typing import List, Optional
import httpx
from bs4 import BeautifulSoup
from integrations.base import BaseCollector
from models.vaga import VagaBruta
from core.logger import logger


MONTHS_PT = {
    "jan": 1, "fev": 2, "mar": 3, "abr": 4, "mai": 5, "jun": 6,
    "jul": 7, "ago": 8, "set": 9, "out": 10, "nov": 11, "dez": 12,
}


class InfoJobsCollector(BaseCollector):
    SEARCH_URL = "https://www.infojobs.com.br/empregos.aspx"

    def __init__(self, termos: Optional[List[str]] = None) -> None:
        super().__init__(nome="infojobs")
        self.termos = termos or []

    async def coletar(self) -> List[VagaBruta]:
        vagas: List[VagaBruta] = []
        logger.info("infojobs.iniciando", termos=self.termos)
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }
        async with httpx.AsyncClient(follow_redirects=True, timeout=30, headers=headers) as client:
            for termo in self.termos:
                try:
                    resp = await client.get(self.SEARCH_URL, params={"palabra": termo})
                    if resp.status_code != 200:
                        logger.warning("infojobs.erro_http", status=resp.status_code, termo=termo)
                        continue
                    vagas.extend(self._parse_html(resp.text))
                    logger.info("infojobs.coletor_ok", termo=termo)
                except httpx.HTTPError as e:
                    logger.warning("infojobs.erro", termo=termo, error=str(e))
                    continue
        return vagas

    def _parse_html(self, html: str) -> List[VagaBruta]:
        resultados = []
        soup = BeautifulSoup(html, "lxml")
        cards = soup.select(".js_rowCard")

        for card in cards:
            try:
                titulo_el = card.find("h2")
                if not titulo_el:
                    continue
                titulo = titulo_el.get_text(strip=True)

                links = card.find_all("a")
                empresa = ""
                job_url = ""
                for a in links:
                    href = a.get("href", "")
                    if "empresa-" in href:
                        empresa = a.get_text(strip=True)
                    elif "vaga-de-" in href:
                        rel_url = href
                        job_url = f"https://www.infojobs.com.br{rel_url}" if rel_url.startswith("/") else rel_url

                main_div = card.find("div", attrs={"data-id": True})
                job_id = main_div.get("data-id", "") if main_div else ""
                if not job_id and job_url:
                    import hashlib
                    job_id = hashlib.md5(job_url.encode()).hexdigest()[:16]

                date_el = card.find("div", attrs={"data-value": True})
                raw_date = date_el.get("data-value", "") if date_el else ""
                pub_date = None
                if raw_date:
                    try:
                        pub_date = datetime.strptime(raw_date.strip(), "%Y/%m/%d %H:%M:%S")
                    except (ValueError, AttributeError):
                        pass

                full_text = card.get_text(" ", strip=True)
                localizacao = ""
                idx = full_text.find(" - ")
                if idx > 0:
                    candidate = full_text[idx - 20:idx + 7]
                    parts = candidate.split()
                    for i, p in enumerate(parts):
                        if p == "-" and i > 0 and i < len(parts) - 1:
                            city_part = " ".join(parts[:i]).strip()
                            state_part = parts[i + 1] if len(parts[i + 1]) == 2 else ""
                            if state_part:
                                localizacao = f"{city_part} - {state_part}"

                descricao = self._extract_desc(full_text)

                resultados.append(VagaBruta(
                    titulo=titulo,
                    empresa=empresa,
                    descricao=descricao[:5000],
                    localizacao=localizacao or None,
                    url=job_url,
                    fonte="infojobs",
                    id_externo=job_id,
                    data_publicacao=pub_date,
                ))
            except Exception:
                continue
        return resultados

    def _extract_desc(self, text: str) -> str:
        markers = [
            "Buscamos um", "Buscamos", "Estamos", "Atividades",
            "Responsabilidades", "DescriÃ§Ã£o", "Principais",
            "Vaga", "O que", "Requisitos", "Sobre",
        ]
        idx = len(text)
        for m in markers:
            pos = text.find(m)
            if 0 < pos < idx:
                idx = pos
        cut = text[max(0, idx - 1):]
        return cut.strip()[:2000]
