import hashlib
from typing import List

import httpx

from integrations.ats.base_ats import ATSIntegrador
from core.browser_manager import browser_manager
from core.logger import logger
from models.vaga import VagaBruta


class WorkableIntegrador(ATSIntegrador):
    nome = "workable"
    prioridade = 90

    @property
    def empresas(self) -> dict[str, dict]:
        return {
            "iFood": {
                "subdomain": "ifood",
                "pais": "BR",
                "categoria": "delivery",
                "prioridade": 100,
            },
            "Wellhub": {
                "subdomain": "wellhub",
                "pais": "BR",
                "categoria": "saude",
                "prioridade": 90,
            },
            "QuintoAndar": {
                "subdomain": "quintoandar",
                "pais": "BR",
                "categoria": "imobiliario",
                "prioridade": 85,
            },
            "Loggi": {
                "subdomain": "loggi",
                "pais": "BR",
                "categoria": "logistica",
                "prioridade": 80,
            },
            "MadeiraMadeira": {
                "subdomain": "madeiramadeira",
                "pais": "BR",
                "categoria": "ecommerce",
                "prioridade": 75,
            },
            "Olist": {
                "subdomain": "olist",
                "pais": "BR",
                "categoria": "ecommerce",
                "prioridade": 70,
            },
            "Trybe": {
                "subdomain": "trybe",
                "pais": "BR",
                "categoria": "educacao",
                "prioridade": 65,
            },
            "Conta Azul": {
                "subdomain": "contaazul",
                "pais": "BR",
                "categoria": "fintech",
                "prioridade": 65,
            },
            "Sami": {
                "subdomain": "sami",
                "pais": "BR",
                "categoria": "healthtech",
                "prioridade": 60,
            },
            "Flash": {
                "subdomain": "flash",
                "pais": "BR",
                "categoria": "fintech",
                "prioridade": 60,
            },
        }

    async def extrair_vagas(self, empresa: str, config: dict) -> List[VagaBruta]:
        subdomain = config["subdomain"]
        vagas: List[VagaBruta] = []

        vagas = await self._tentar_http(empresa, config, subdomain)
        if vagas:
            return vagas

        logger.info("workable.http_fallback_playwright", empresa=empresa)
        vagas = await self._tentar_playwright(empresa, config, subdomain)
        return vagas

    async def _tentar_http(
        self, empresa: str, config: dict, subdomain: str
    ) -> List[VagaBruta]:
        vagas: List[VagaBruta] = []
        url = f"https://{subdomain}.workable.com/api/v1/jobs"
        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    logger.debug(
                        "workable.http_sem_acesso",
                        empresa=empresa,
                        status=resp.status_code,
                    )
                    return []
                data = resp.json()

            for job in data.get("jobs", []):
                try:
                    titulo = (job.get("title") or "").strip()
                    if not titulo:
                        continue

                    job_id = str(job.get("id", ""))
                    id_externo = hashlib.md5(
                        f"workable:{subdomain}:{job_id}".encode()
                    ).hexdigest()[:16]

                    job_url = (
                        job.get("url") or f"https://{subdomain}.workable.com/j/{job_id}"
                    )
                    location = (
                        job.get("location", {}).get("text")
                        if isinstance(job.get("location"), dict)
                        else None
                    )
                    description = (
                        job.get("description")
                        or (job.get("shortcode") and f"Vaga em {empresa}")
                        or f"Vaga em {empresa}"
                    )

                    vagas.append(
                        self._montar_vaga(
                            empresa=empresa,
                            config=config,
                            titulo=titulo,
                            descricao=description[:5000],
                            localizacao=location,
                            url=job_url,
                            id_externo=id_externo,
                        )
                    )
                except Exception as e:
                    logger.debug(
                        "workable.erro_parse_job_http", empresa=empresa, error=str(e)
                    )
        except (httpx.HTTPError, httpx.TimeoutException) as e:
            logger.debug("workable.http_falhou", empresa=empresa, error=str(e))
            return []

        return vagas

    async def _tentar_playwright(
        self, empresa: str, config: dict, subdomain: str
    ) -> List[VagaBruta]:
        vagas: List[VagaBruta] = []
        context = await browser_manager.new_context()
        page = await context.new_page()
        page.set_default_timeout(self.TIMEOUT * 1000)

        try:
            url = f"https://{subdomain}.workable.com/"
            logger.info("workable.playwright.navegando", empresa=empresa, url=url)
            await page.goto(
                url, wait_until="domcontentloaded", timeout=self.TIMEOUT * 1000
            )
            await page.wait_for_timeout(3000)

            jobs_data = await page.evaluate("""
                () => {
                    const cards = document.querySelectorAll('[class*="job"] a, a[href*="/jobs/"], a[href*="/j/"]');
                    return Array.from(cards).slice(0, 30).map(card => ({
                        titulo: card.innerText?.trim() || card.querySelector('h2, h3, strong')?.innerText?.trim() || '',
                        url: card.href || '',
                    }));
                }
            """)

            for job in jobs_data:
                titulo = (job.get("titulo") or "").strip()
                job_url = (job.get("url") or "").strip()
                if not titulo or not job_url or len(titulo) < 5:
                    continue

                id_externo = hashlib.md5(
                    f"workable:{subdomain}:{job_url}".encode()
                ).hexdigest()[:16]

                vagas.append(
                    self._montar_vaga(
                        empresa=empresa,
                        config=config,
                        titulo=titulo,
                        descricao=f"Vaga em {empresa}",
                        url=job_url,
                        id_externo=id_externo,
                    )
                )

            await context.close()
        except Exception as e:
            await context.close()
            logger.warning("workable.playwright.falhou", empresa=empresa, error=str(e))

        return vagas
