from typing import List, Optional
import re
from integrations.base import BaseCollector
from models.vaga import VagaBruta
from core.logger import logger
from core.browser_manager import browser_manager


class ProgramathorCollector(BaseCollector):
    BASE_URL = "https://programathor.com.br"

    def __init__(self, termos: Optional[List[str]] = None) -> None:
        super().__init__(nome="programathor")
        self.termos = termos or []

    async def coletar(self) -> List[VagaBruta]:
        vagas: List[VagaBruta] = []
        vistos: set = set()
        logger.info("programathor.iniciando", termos=self.termos)
        try:
            context = await browser_manager.new_context()
            page = await context.new_page()

            for termo in self.termos:
                url = f"{self.BASE_URL}/jobs?search={termo.replace(' ', '+')}"
                try:
                    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                    await page.wait_for_selector(".cell-list", timeout=10000)
                    cards = await page.query_selector_all(".cell-list")

                    for card in cards:
                        try:
                            link_el = await card.query_selector("a[href*='/jobs/']")
                            if not link_el:
                                continue
                            href = await link_el.get_attribute("href") or ""
                            full_url = (
                                f"{self.BASE_URL}{href}"
                                if href.startswith("/")
                                else href
                            )
                            if full_url in vistos:
                                continue
                            vistos.add(full_url)

                            titulo_el = await card.query_selector("h3")
                            if not titulo_el:
                                continue
                            titulo = await titulo_el.inner_text()
                            titulo = re.sub(r"(?i)\s*NOVA\s*", "", titulo).strip()

                            company_el = await card.query_selector(
                                ".cell-list-content-icon span:first-child"
                            )
                            empresa = (
                                await company_el.inner_text() if company_el else ""
                            )

                            loc_el = await card.query_selector(
                                ".cell-list-content-icon span:nth-child(2)"
                            )
                            localizacao = await loc_el.inner_text() if loc_el else ""
                            localizacao = localizacao.strip()

                            descricao = ""
                            try:
                                detail_page = await context.new_page()
                                await detail_page.goto(
                                    full_url,
                                    wait_until="domcontentloaded",
                                    timeout=20000,
                                )
                                desc_el = await detail_page.query_selector(
                                    ".line-height-2-4"
                                )
                                if desc_el:
                                    descricao = await desc_el.inner_text()
                                await detail_page.close()
                            except Exception:
                                pass

                            vagas.append(
                                VagaBruta(
                                    titulo=titulo,
                                    empresa=empresa,
                                    descricao=descricao[:5000],
                                    localizacao=localizacao or None,
                                    url=full_url,
                                    fonte="programathor",
                                    id_externo=href,
                                )
                            )
                        except Exception:
                            continue
                except Exception as e:
                    logger.warning("programathor.erro", termo=termo, error=str(e))

            await context.close()
        except Exception as e:
            logger.error("programathor.erro", error=str(e))
        return vagas
