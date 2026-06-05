import hashlib
from typing import List

from integrations.ats.base_ats import ATSIntegrador
from core.browser_manager import browser_manager
from core.logger import logger
from models.vaga import VagaBruta


class TaqeIntegrador(ATSIntegrador):
    nome = "taqe"
    prioridade = 80

    @property
    def empresas(self) -> dict[str, dict]:
        return {
            "Mercado Livre": {
                "url": "https://careers-meli.mercadolibre.com/",
                "pais": "BR",
                "categoria": "ecommerce",
                "prioridade": 100,
                "selector": ".jobs-list li a, [data-testid='job-card'] a",
            },
            "BTG Pactual": {
                "url": "https://btgpactual.taqe.com.br/",
                "pais": "BR",
                "categoria": "banco",
                "prioridade": 95,
                "selector": ".job-item a, [class*='job'] a",
            },
            "Ambev": {
                "url": "https://ambev.taqe.com.br/",
                "pais": "BR",
                "categoria": "bebidas",
                "prioridade": 80,
                "selector": ".job-item a, [class*='job'] a",
            },
            "Localiza": {
                "url": "https://localiza.taqe.com.br/",
                "pais": "BR",
                "categoria": "mobilidade",
                "prioridade": 75,
                "selector": ".job-item a, [class*='job'] a",
            },
            "RaÃ­zen": {
                "url": "https://raizen.taqe.com.br/",
                "pais": "BR",
                "categoria": "energia",
                "prioridade": 70,
                "selector": ".job-item a, [class*='job'] a",
            },
        }

    async def extrair_vagas(self, empresa: str, config: dict) -> List[VagaBruta]:
        vagas: List[VagaBruta] = []
        context = await browser_manager.new_context()
        page = await context.new_page()
        page.set_default_timeout(self.TIMEOUT * 1000)

        try:
            url = config["url"]
            logger.info("taqe.navegando", empresa=empresa, url=url)
            await page.goto(
                url, wait_until="domcontentloaded", timeout=self.TIMEOUT * 1000
            )
            await page.wait_for_timeout(3000)

            jobs_data = await page.evaluate("""
                () => {
                    const cards = document.querySelectorAll('a[href*="/vaga"], a[href*="/job"], [class*="job"] a, .job-item a');
                    return Array.from(cards).slice(0, 30).map(card => ({
                        titulo: card.innerText?.trim() || '',
                        url: card.href || '',
                    }));
                }
            """)

            if not jobs_data:
                jobs_data = await page.evaluate("""
                    () => {
                        const links = document.querySelectorAll('a[href*="/vaga"], a[href*="/job"], a[href*="position"]');
                        return Array.from(links).slice(0, 30).map(link => ({
                            titulo: link.innerText?.trim() || link.querySelector('h2, h3, h4, strong')?.innerText?.trim() || '',
                            url: link.href || '',
                        }));
                    }
                """)

            if not jobs_data:
                all_links = await page.query_selector_all("a")
                for link in all_links[:40]:
                    href = await link.get_attribute("href") or ""
                    text = await link.inner_text() or ""
                    if href and text and len(text) > 5:
                        jobs_data.append({"titulo": text.strip(), "url": href})

            for job in jobs_data:
                titulo = (job.get("titulo") or "").strip()
                job_url = (job.get("url") or "").strip()
                if not titulo or not job_url:
                    continue

                id_externo = hashlib.md5(
                    f"taqe:{empresa}:{job_url}".encode()
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
            logger.error("taqe.erro_extrair", empresa=empresa, error=str(e))
            raise

        return vagas
