import hashlib
import json
from typing import List

import httpx
from bs4 import BeautifulSoup

from integrations.ats.base_ats import ATSIntegrador
from core.browser_manager import browser_manager
from core.logger import logger
from models.vaga import VagaBruta


class LeverIntegrador(ATSIntegrador):
    nome = "lever"
    prioridade = 70

    @property
    def empresas(self) -> dict[str, dict]:
        return {
            "Neon": {
                "slug": "neon",
                "pais": "BR",
                "categoria": "fintech",
                "prioridade": 100,
            },
            "Asaas": {
                "slug": "asaas",
                "pais": "BR",
                "categoria": "fintech",
                "prioridade": 90,
            },
            "Qulture.Rocks": {
                "slug": "qulturerocks",
                "pais": "BR",
                "categoria": "hrtech",
                "prioridade": 80,
            },
        }

    async def extrair_vagas(self, empresa: str, config: dict) -> List[VagaBruta]:
        slug = config["slug"]
        vagas: List[VagaBruta] = []

        vagas = await self._tentar_api(empresa, config, slug)
        if vagas:
            return vagas

        vagas = await self._tentar_playwright(empresa, config, slug)
        return vagas

    async def _tentar_api(
        self, empresa: str, config: dict, slug: str
    ) -> List[VagaBruta]:
        vagas: List[VagaBruta] = []
        api_url = f"https://api.lever.co/v1/postings/{slug}?mode=json"

        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
                resp = await client.get(api_url)
                if resp.status_code != 200:
                    logger.debug(
                        "lever.api_sem_acesso", empresa=empresa, status=resp.status_code
                    )
                    return []
                jobs = resp.json()

            for job in jobs:
                try:
                    titulo = (job.get("text") or job.get("title") or "").strip()
                    if not titulo:
                        continue

                    job_id = str(job.get("id", ""))
                    id_externo = hashlib.md5(
                        f"lever:{slug}:{job_id}".encode()
                    ).hexdigest()[:16]

                    categories = job.get("categories", {}) or {}
                    localizacao = (
                        categories.get("location") or job.get("location") or None
                    )
                    tipo_contrato = categories.get("commitment") or None
                    team = categories.get("team") or None

                    descricao_raw = (
                        job.get("description", {}).get("text")
                        if isinstance(job.get("description"), dict)
                        else job.get("descriptionPlain") or ""
                    )
                    descricao = descricao_raw or f"Vaga em {empresa}"
                    if team:
                        descricao = f"{descricao}\nTime: {team}"

                    job_url = ""
                    if isinstance(job.get("hostedUrl"), str):
                        job_url = job["hostedUrl"]
                    elif isinstance(job.get("applyUrl"), str):
                        job_url = job["applyUrl"]
                    else:
                        job_url = f"https://jobs.lever.co/{slug}/{job_id}"

                    vagas.append(
                        self._montar_vaga(
                            empresa=empresa,
                            config=config,
                            titulo=titulo,
                            descricao=descricao[:5000],
                            localizacao=localizacao,
                            url=job_url,
                            id_externo=id_externo,
                            tipo_contrato=tipo_contrato,
                        )
                    )
                except Exception as e:
                    logger.debug("lever.erro_parse_job", empresa=empresa, error=str(e))
        except (httpx.HTTPError, httpx.TimeoutException, json.JSONDecodeError) as e:
            logger.debug("lever.api_falhou", empresa=empresa, error=str(e))

        return vagas

    async def _tentar_playwright(
        self, empresa: str, config: dict, slug: str
    ) -> List[VagaBruta]:
        vagas: List[VagaBruta] = []
        context = await browser_manager.new_context()
        page = await context.new_page()
        page.set_default_timeout(self.TIMEOUT * 1000)

        try:
            url = f"https://jobs.lever.co/{slug}"
            logger.info("lever.playwright.navegando", empresa=empresa, url=url)
            await page.goto(
                url, wait_until="domcontentloaded", timeout=self.TIMEOUT * 1000
            )
            await page.wait_for_timeout(3000)

            jobs_data = await page.evaluate("""
                () => {
                    const cards = document.querySelectorAll('.posting-list-item a, [class*="posting"] a, a[href*="/" + document.location.pathname.split('/')[1] + "/"]');
                    return Array.from(cards).slice(0, 30).map(card => ({
                        titulo: card.querySelector('h5, h4, h3, strong')?.innerText?.trim() || card.innerText?.trim()?.split('\\n')[0] || '',
                        url: card.href || '',
                        localizacao: card.querySelector('[class*="location"], .posting-category')?.innerText?.trim() || '',
                    }));
                }
            """)

            for job in jobs_data:
                titulo = (job.get("titulo") or "").strip()
                job_url = (job.get("url") or "").strip()
                if not titulo or not job_url or len(titulo) < 5:
                    continue

                localizacao = (job.get("localizacao") or "").strip() or None
                id_externo = hashlib.md5(
                    f"lever:{slug}:{job_url}".encode()
                ).hexdigest()[:16]

                vagas.append(
                    self._montar_vaga(
                        empresa=empresa,
                        config=config,
                        titulo=titulo,
                        descricao=f"Vaga em {empresa}",
                        localizacao=localizacao,
                        url=job_url,
                        id_externo=id_externo,
                    )
                )

            await context.close()
        except Exception as e:
            await context.close()
            logger.warning("lever.playwright.falhou", empresa=empresa, error=str(e))

        return vagas
