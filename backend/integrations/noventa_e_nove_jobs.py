from typing import List, Optional
import hashlib
from bs4 import BeautifulSoup
from integrations.base import BaseCollector
from models.vaga import VagaBruta
from core.logger import logger
from core.browser_manager import browser_manager


class NoventaENoveJobsCollector(BaseCollector):
    BASE_URL = "https://www.99jobs.com"

    def __init__(self, termos: Optional[List[str]] = None) -> None:
        super().__init__(nome="99jobs")
        self.termos = termos or []

    async def coletar(self) -> List[VagaBruta]:
        vagas: List[VagaBruta] = []
        vistos: set = set()
        logger.info("99jobs.iniciando", termos=self.termos)

        browser = await browser_manager.get_browser()
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            locale="pt-BR",
        )
        try:
            page = await context.new_page()

            for termo in self.termos:
                try:
                    url = f"{self.BASE_URL}/vagas?q={termo.replace(' ', '+')}"
                    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                    await page.wait_for_timeout(4000)

                    html = await page.content()
                    cards = self._parse_list(html, vistos)

                    for titulo, empresa, loc, job_url, pub_date in cards:
                        try:
                            descricao = await self._fetch_descricao(context, job_url)
                            id_externo = hashlib.md5(job_url.encode()).hexdigest()[:16]
                            vagas.append(
                                VagaBruta(
                                    titulo=titulo,
                                    empresa=empresa,
                                    descricao=descricao[:5000] if descricao else "",
                                    localizacao=loc or None,
                                    url=job_url,
                                    fonte="99jobs",
                                    id_externo=id_externo,
                                    data_publicacao=pub_date,
                                )
                            )
                        except Exception:
                            continue

                    logger.info("99jobs.termo_ok", termo=termo, total=len(cards))
                except Exception as e:
                    logger.warning("99jobs.erro", termo=termo, error=str(e))
                    continue
        finally:
            await context.close()

        return vagas

    def _parse_list(
        self, html: str, vistos: set
    ) -> List[tuple[str, str, str, str, Optional[str]]]:
        cards = []
        soup = BeautifulSoup(html, "lxml")

        for item in soup.select(
            "[class*=card], [class*=job], [class*=opportunity], article"
        ):
            try:
                link_el = item.select_one("a[href]")
                if not link_el:
                    continue
                href = link_el.get("href", "")
                if not href or href in vistos:
                    continue
                vistos.add(href)

                job_url = f"{self.BASE_URL}{href}" if href.startswith("/") else href
                titulo_el = item.select_one("h2, h3, [class*=title]")
                titulo = titulo_el.get_text(strip=True) if titulo_el else ""
                if not titulo:
                    continue

                empresa_el = item.select_one("[class*=company], [class*=enterprise]")
                empresa = empresa_el.get_text(strip=True) if empresa_el else ""
                loc_el = item.select_one("[class*=location], [class*=local]")
                loc = loc_el.get_text(strip=True) if loc_el else ""
                date_el = item.select_one("[class*=date], [class*=time], time")
                pub_date = (
                    date_el.get("datetime") or date_el.get_text(strip=True)
                    if date_el
                    else None
                )

                cards.append((titulo, empresa, loc, job_url, pub_date))
            except Exception:
                continue

        return cards

    async def _fetch_descricao(self, context, url: str) -> str:
        try:
            detail_page = await context.new_page()
            await detail_page.goto(url, wait_until="domcontentloaded", timeout=20000)
            await detail_page.wait_for_timeout(2000)
            html = await detail_page.content()
            await detail_page.close()
            soup = BeautifulSoup(html, "lxml")
            desc_el = soup.select_one(
                "[class*=description], [class*=descricao], [class*=about], article"
            )
            return desc_el.get_text(strip=True) if desc_el else ""
        except Exception:
            return ""
