import hashlib
from typing import List

from integrations.ats.base_ats import ATSIntegrador
from core.browser_manager import browser_manager
from core.logger import logger
from models.vaga import VagaBruta


class WorkdayIntegrador(ATSIntegrador):
    nome = "workday"
    prioridade = 85

    @property
    def empresas(self) -> dict[str, dict]:
        return {
            "Mercado Livre": {
                "url": "https://mercadolivre.wd3.myworkdayjobs.com/es-AR/Mercado_Livre",
                "pais": "BR",
                "categoria": "tech",
                "prioridade": 100,
                "list_selector": "li[data-automation-id='jobListing'], [class*='job-listing'], [role='listitem']",
                "load_more_selector": "button[aria-label*='Load'], button[data-automation-id='loadMoreButton']",
                "title_selector": "[data-automation-id='jobTitle'], a[class*='job-title'], h3 a",
            },
            "Santander": {
                "url": "https://santander.wd3.myworkdayjobs.com/Santander",
                "pais": "BR",
                "categoria": "banco",
                "prioridade": 100,
                "list_selector": "li[data-automation-id='jobListing'], [class*='job-listing'], [role='listitem']",
                "load_more_selector": "button[aria-label*='Load'], button[data-automation-id='loadMoreButton']",
                "title_selector": "[data-automation-id='jobTitle'], a[class*='job-title'], h3 a",
            },
        }

    async def extrair_vagas(self, empresa: str, config: dict) -> List[VagaBruta]:
        vagas: List[VagaBruta] = []
        context = await browser_manager.new_context()
        page = await context.new_page()
        page.set_default_timeout(self.TIMEOUT * 1000)

        try:
            url = config["url"]
            logger.info("workday.navegando", empresa=empresa, url=url)
            await page.goto(
                url, wait_until="domcontentloaded", timeout=self.TIMEOUT * 1000
            )
            await page.wait_for_timeout(5000)

            list_selector = config["list_selector"]
            load_more_selector = config["load_more_selector"]

            try:
                await page.wait_for_selector(list_selector, timeout=10000)
            except Exception:
                logger.debug("workday.seletor_lista_nao_encontrado", empresa=empresa)

            for attempt in range(5):
                try:
                    btn = await page.query_selector(load_more_selector)
                    if not btn:
                        break
                    is_disabled = await btn.get_attribute("disabled")
                    if is_disabled is not None:
                        break
                    await btn.click()
                    await page.wait_for_timeout(2000)
                except Exception:
                    break

            jobs_data = await page.evaluate(
                """
                (listSelector) => {
                    const items = document.querySelectorAll(listSelector);
                    return Array.from(items).slice(0, 50).map(item => {
                        const link = item.querySelector('a[href*="/job/"], a[href*="/jobs/"]');
                        const titleEl = item.querySelector('[data-automation-id="jobTitle"], a[class*="job-title"], h3 a, h3');
                        const locEl = item.querySelector('[data-automation-id="jobLocation"], [class*="location"]');
                        return {
                            titulo: titleEl?.innerText?.trim() || link?.innerText?.trim() || item.innerText?.trim()?.split('\\n')[0] || '',
                            url: link?.href || '',
                            localizacao: locEl?.innerText?.trim() || '',
                        };
                    });
                }
            """,
                list_selector,
            )

            if not jobs_data:
                jobs_data = await page.evaluate("""
                    () => {
                        const links = document.querySelectorAll('a[href*="/job/"]');
                        return Array.from(links).slice(0, 50).map(link => ({
                            titulo: link.innerText?.trim() || link.querySelector('span, div')?.innerText?.trim() || '',
                            url: link.href || '',
                            localizacao: '',
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
                    f"workday:{empresa}:{job_url}".encode()
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
            logger.error("workday.erro_extrair", empresa=empresa, error=str(e))
            raise

        return vagas
