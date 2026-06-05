import hashlib
from typing import List

from integrations.ats.base_ats import ATSIntegrador
from core.browser_manager import browser_manager
from core.logger import logger
from models.vaga import VagaBruta


class ProprioIntegrador(ATSIntegrador):
    nome = "proprio"
    prioridade = 75

    @property
    def empresas(self) -> dict[str, dict]:
        return {
            "Banco Inter": {
                "url": "https://carreiras.bancointer.com.br/",
                "pais": "BR",
                "categoria": "banco",
                "prioridade": 90,
                "selectors": [
                    "a[href*='vaga']",
                    "a[href*='job']",
                    "a[href*='position']",
                    ".job-list a",
                ],
            },
            "C6 Bank": {
                "url": "https://carreiras.c6bank.com.br/",
                "pais": "BR",
                "categoria": "banco",
                "prioridade": 90,
                "selectors": [
                    "a[href*='vaga']",
                    "a[href*='job']",
                    "a[href*='position']",
                    ".job-list a",
                ],
            },
            "Neon": {
                "url": "https://neon.gupy.io/",
                "pais": "BR",
                "categoria": "fintech",
                "prioridade": 85,
                "selectors": [
                    "a[href*='vaga']",
                    "a[href*='job']",
                    "a[href*='position']",
                    ".job-list a",
                ],
            },
            "Stone": {
                "url": "https://carreiras.stone.co/",
                "pais": "BR",
                "categoria": "fintech",
                "prioridade": 85,
                "selectors": [
                    "a[href*='vaga']",
                    "a[href*='job']",
                    "a[href*='position']",
                    ".job-list a",
                ],
            },
            "PagBank": {
                "url": "https://carreiras.pagbank.com.br/",
                "pais": "BR",
                "categoria": "fintech",
                "prioridade": 80,
                "selectors": [
                    "a[href*='vaga']",
                    "a[href*='job']",
                    "a[href*='position']",
                    ".job-list a",
                ],
            },
            "Asaas": {
                "url": "https://asaas.com/carreiras",
                "pais": "BR",
                "categoria": "fintech",
                "prioridade": 80,
                "selectors": [
                    "a[href*='vaga']",
                    "a[href*='job']",
                    "a[href*='position']",
                    ".job-list a",
                ],
            },
            "TOTVS": {
                "url": "https://totvs.gupy.io/",
                "pais": "BR",
                "categoria": "tech",
                "prioridade": 75,
                "selectors": [
                    "a[href*='vaga']",
                    "a[href*='job']",
                    "a[href*='position']",
                    ".job-list a",
                ],
            },
            "CI&T": {
                "url": "https://ciandt.com/br/pt-br/carreiras",
                "pais": "BR",
                "categoria": "tech",
                "prioridade": 75,
                "selectors": [
                    "a[href*='vaga']",
                    "a[href*='job']",
                    "a[href*='position']",
                    ".job-list a",
                ],
            },
            "Compass UOL": {
                "url": "https://compass.uol/carreiras/",
                "pais": "BR",
                "categoria": "tech",
                "prioridade": 70,
                "selectors": [
                    "a[href*='vaga']",
                    "a[href*='job']",
                    "a[href*='position']",
                    ".job-list a",
                ],
            },
            "Stefanini": {
                "url": "https://stefanini.com/br/carreiras",
                "pais": "BR",
                "categoria": "consultoria",
                "prioridade": 65,
                "selectors": [
                    "a[href*='vaga']",
                    "a[href*='job']",
                    "a[href*='position']",
                    ".job-list a",
                ],
            },
            "NTT DATA": {
                "url": "https://br.nttdata.com/carreiras",
                "pais": "BR",
                "categoria": "consultoria",
                "prioridade": 65,
                "selectors": [
                    "a[href*='vaga']",
                    "a[href*='job']",
                    "a[href*='position']",
                    ".job-list a",
                ],
            },
            "FCamara": {
                "url": "https://fcamara.com.br/carreiras",
                "pais": "BR",
                "categoria": "consultoria",
                "prioridade": 60,
                "selectors": [
                    "a[href*='vaga']",
                    "a[href*='job']",
                    "a[href*='position']",
                    ".job-list a",
                ],
            },
            "GFT": {
                "url": "https://www.gft.com/br/pt/carreiras",
                "pais": "BR",
                "categoria": "consultoria",
                "prioridade": 60,
                "selectors": [
                    "a[href*='vaga']",
                    "a[href*='job']",
                    "a[href*='position']",
                    ".job-list a",
                ],
            },
            "Capgemini": {
                "url": "https://www.capgemini.com/br-pt/carreiras/",
                "pais": "BR",
                "categoria": "consultoria",
                "prioridade": 60,
                "selectors": [
                    "a[href*='vaga']",
                    "a[href*='job']",
                    "a[href*='position']",
                    ".job-list a",
                ],
            },
        }

    async def extrair_vagas(self, empresa: str, config: dict) -> List[VagaBruta]:
        vagas: List[VagaBruta] = []
        context = await browser_manager.new_context()
        page = await context.new_page()
        page.set_default_timeout(self.TIMEOUT * 1000)

        try:
            url = config["url"]
            selectors = config.get("selectors", ["a[href*='vaga']", "a[href*='job']"])
            logger.info("proprio.navegando", empresa=empresa, url=url)
            await page.goto(
                url, wait_until="domcontentloaded", timeout=self.TIMEOUT * 1000
            )
            await page.wait_for_timeout(4000)

            jobs_data = []
            for sel in selectors:
                try:
                    await page.wait_for_selector(sel, timeout=5000)
                    jobs_data = await page.evaluate(
                        f"""
                        (sel) => {{
                            const cards = document.querySelectorAll(sel);
                            return Array.from(cards).slice(0, 30).map(card => ({{
                                titulo: card.innerText?.trim()?.split('\\n')[0] || card.querySelector('h2, h3, h4, strong')?.innerText?.trim() || '',
                                url: card.href || '',
                            }}));
                        }}
                    """,
                        sel,
                    )
                    if jobs_data:
                        break
                except Exception:
                    continue

            if not jobs_data:
                jobs_data = await page.evaluate("""
                    () => {
                        const links = document.querySelectorAll('a');
                        const seen = new Set();
                        return Array.from(links).filter(link => {
                            const h = link.href || '';
                            const t = (link.innerText || '').trim();
                            const keywords = ['vaga', 'job', 'position', 'oportunidade', 'trainee', 'estagio', 'junior', 'pleno', 'senior', 'desenvolvedor'];
                            return t.length > 10 && keywords.some(k => t.toLowerCase().includes(k) || h.toLowerCase().includes(k)) && !seen.has(h) && seen.add(h);
                        }).slice(0, 30).map(link => ({
                            titulo: link.innerText?.trim() || '',
                            url: link.href || '',
                        }));
                    }
                """)

            for job in jobs_data:
                titulo = (job.get("titulo") or "").strip()
                job_url = (job.get("url") or "").strip()
                if not titulo or not job_url or len(titulo) < 5:
                    continue

                id_externo = hashlib.md5(
                    f"proprio:{empresa}:{job_url}".encode()
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
            logger.error("proprio.erro_extrair", empresa=empresa, error=str(e))
            raise

        return vagas
