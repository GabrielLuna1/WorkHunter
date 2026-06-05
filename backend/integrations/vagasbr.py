from typing import List, Optional
import hashlib
import httpx
from bs4 import BeautifulSoup
from integrations.base import BaseCollector
from models.vaga import VagaBruta
from core.logger import logger


class VagasBRCollector(BaseCollector):
    BASE_URL = "https://www.vagas.com.br"

    def __init__(self, termos: Optional[List[str]] = None) -> None:
        super().__init__(nome="vagasbr")
        self.termos = termos or []

    async def coletar(self) -> List[VagaBruta]:
        vagas: List[VagaBruta] = []
        vistos: set = set()
        logger.info("vagasbr.iniciando", termos=self.termos)

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/125.0.0.0 Safari/537.36"
            ),
        }

        async with httpx.AsyncClient(
            follow_redirects=True, timeout=30, headers=headers
        ) as client:
            for termo in self.termos:
                try:
                    url = f"{self.BASE_URL}/vagas-de-{termo.replace(' ', '-')}"
                    resp = await client.get(url)
                    if resp.status_code != 200:
                        logger.warning(
                            "vagasbr.erro_http",
                            status=resp.status_code,
                            termo=termo,
                        )
                        continue

                    cards = self._parse_list(resp.text, vistos)
                    if not cards:
                        continue

                    for titulo, empresa, loc, href in cards:
                        try:
                            descricao = await self._fetch_descricao(client, href)
                            full_url = (
                                f"{self.BASE_URL}{href}"
                                if href.startswith("/")
                                else href
                            )
                            id_externo = hashlib.md5(
                                full_url.encode()
                            ).hexdigest()[:16]

                            vagas.append(VagaBruta(
                                titulo=titulo,
                                empresa=empresa,
                                descricao=descricao[:5000] if descricao else "",
                                localizacao=loc or None,
                                url=full_url,
                                fonte="vagasbr",
                                id_externo=id_externo,
                            ))
                        except Exception:
                            continue

                    logger.info(
                        "vagasbr.termo_ok",
                        termo=termo,
                        total=len(cards),
                    )
                except httpx.HTTPError as e:
                    logger.warning(
                        "vagasbr.erro",
                        termo=termo,
                        error=str(e),
                    )
                    continue

        return vagas

    def _parse_list(
        self, html: str, vistos: set
    ) -> List[tuple[str, str, str, str]]:
        cards = []
        soup = BeautifulSoup(html, "lxml")

        for item in soup.select(".vaga"):
            try:
                link_el = item.select_one("a.link-detalhes-vaga")
                if not link_el:
                    continue
                href = link_el.get("href", "")
                if not href or href in vistos:
                    continue
                vistos.add(href)

                titulo = link_el.get_text(strip=True) if link_el else ""
                if not titulo:
                    continue

                empresa_el = item.select_one("span.emprVaga")
                empresa = (
                    empresa_el.get_text(strip=True) if empresa_el else ""
                )

                loc_el = item.select_one(".vaga-local")
                loc = loc_el.get_text(strip=True) if loc_el else ""

                cards.append((titulo, empresa, loc, href))
            except Exception:
                continue

        return cards

    async def _fetch_descricao(
        self, client: httpx.AsyncClient, href: str
    ) -> str:
        try:
            url = f"{self.BASE_URL}{href}" if href.startswith("/") else href
            resp = await client.get(url)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "lxml")
            desc_el = soup.select_one(".job-description") or soup.select_one("div.descricao")
            if desc_el:
                return desc_el.get_text(strip=True)
        except Exception:
            pass
        return ""
