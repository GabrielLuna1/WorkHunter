from typing import List, Optional
import hashlib
import re
import asyncio
import httpx
from bs4 import BeautifulSoup
from integrations.base import BaseCollector
from models.vaga import VagaBruta
from core.logger import logger


class APInfoCollector(BaseCollector):
    BASE_URL = "https://www.apinfo.com"
    SEARCH_URL = f"{BASE_URL}/apinfo/inc/list4.cfm"

    def __init__(self, termos: Optional[List[str]] = None) -> None:
        super().__init__(nome="apinfo")
        self.termos = termos or []

    async def coletar(self) -> List[VagaBruta]:
        vagas: List[VagaBruta] = []
        vistos: set = set()
        logger.info("apinfo.iniciando", termos=self.termos)

        try:
            return await asyncio.wait_for(
                self._coletar_interno(vagas, vistos), timeout=30.0
            )
        except asyncio.TimeoutError:
            logger.warning("apinfo.timeout_30s")
            return vagas

    async def _coletar_interno(self, vagas, vistos) -> List[VagaBruta]:
        logger.info("apinfo.coletar_interno")

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/127.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }

        async with httpx.AsyncClient(
            follow_redirects=True, timeout=20, headers=headers
        ) as client:
            for termo in self.termos:
                try:
                    vagas_termo = await self._coletar_termo(client, termo, vistos)
                    vagas.extend(vagas_termo)
                    logger.info("apinfo.termo_ok", termo=termo, total=len(vagas_termo))
                except Exception as e:
                    logger.warning("apinfo.erro_termo", termo=termo, error=str(e))

        return vagas

    async def _coletar_termo(
        self, client: httpx.AsyncClient, termo: str, vistos: set
    ) -> List[VagaBruta]:
        vagas: List[VagaBruta] = []

        # 1. Primeiro request para estabelecer sessÃ£o
        try:
            r = await client.get(
                self.BASE_URL,
                headers={"Referer": self.BASE_URL},
                timeout=15,
            )
            r.raise_for_status()
        except Exception as e:
            logger.warning("apinfo.erro_get_inicial", termo=termo, error=str(e))
            return vagas

        await asyncio.sleep(1.5)

        # 2. POST de busca
        data = {
            "keyw": termo[:40],
            "onde": "1",
            "andor": "1",
            "ddmmaa1": "",
            "ddmmaa2": "",
            "pag": "1",
        }
        resp = await client.post(
            self.SEARCH_URL,
            data=data,
            headers={"Referer": self.BASE_URL},
            timeout=15,
        )
        if resp.status_code != 200:
            logger.warning("apinfo.erro_http", status=resp.status_code, termo=termo)
            return vagas

        html = resp.content.decode("iso-8859-1", errors="replace")
        soup = BeautifulSoup(html, "lxml")

        # Extrai pkey e tcv para paginaÃ§Ã£o
        pkey = ""
        tcv = "0"
        form = soup.select_one('form[action="list4.cfm"]')
        if form:
            pk = form.select_one('input[name="pkey"]')
            if pk:
                pkey = pk.get("value", "")
            tc = form.select_one('input[name="tcv"]')
            if tc:
                tcv = tc.get("value", "0")

        # Extrai total de pÃ¡ginas
        total_paginas = 1
        pag_el = soup.select_one("div.n-paginas strong")
        if pag_el:
            m = re.search(r"de\s+(\d+)", pag_el.get_text())
            if m:
                total_paginas = int(m.group(1))

        max_paginas = min(total_paginas, 2)  # Limite de 2 páginas

        for pagina in range(1, max_paginas + 1):
            if pagina > 1:
                await asyncio.sleep(1)
                data["pag"] = str(pagina)
                data["pkey"] = pkey
                data["tcv"] = tcv
                resp = await client.post(
                    self.SEARCH_URL,
                    data=data,
                    headers={"Referer": self.SEARCH_URL},
                )
                if resp.status_code != 200:
                    break
                html = resp.content.decode("iso-8859-1", errors="replace")
                soup = BeautifulSoup(html, "lxml")

                # Atualiza pkey
                form = soup.select_one('form[action="list4.cfm"]')
                if form:
                    pk = form.select_one('input[name="pkey"]')
                    if pk:
                        pkey = pk.get("value", "")

            cards = soup.select("div.box-vagas.linha.pd")
            if not cards:
                break

            for card in cards:
                try:
                    vaga = self._extract_card(card, vistos)
                    if vaga:
                        vagas.append(vaga)
                except Exception:
                    continue

        return vagas

    def _extract_card(self, card, vistos: set) -> Optional[VagaBruta]:
        # URL
        link_el = card.select_one("a.btn3")
        if not link_el:
            return None
        href = link_el.get("href", "")
        full_url = f"{self.BASE_URL}{href}" if href.startswith("/") else href

        if full_url in vistos:
            return None
        vistos.add(full_url)

        # TÃ­tulo
        titulo_el = card.select_one("div.cargo span")
        titulo = titulo_el.get_text(strip=True) if titulo_el else ""
        if not titulo:
            return None

        # Empresa (texto apÃ³s "Empresa .....:")
        empresa = ""
        texto_div = card.select_one("div.texto")
        if texto_div:
            texto_raw = str(texto_div)
            m = re.search(r"Empresa\s*\.{3,}\s*:\s*([^<]+)", texto_raw)
            if m:
                empresa = m.group(1).strip()

        # LocalizaÃ§Ã£o (formato: "Cidade - UF - data")
        localizacao = ""
        info = card.select_one("div.info-data")
        if info:
            texto_info = info.get_text(strip=True)
            partes = texto_info.split(" - ")
            if len(partes) >= 2:
                localizacao = f"{partes[0].strip()} - {partes[1].strip()}"

        # DescriÃ§Ã£o
        descricao = ""
        if texto_div:
            desc_p = texto_div.select_one(
                'p[style*="white-space:pre-wrap"]'
            ) or texto_div.select_one("p")
            if desc_p:
                descricao = desc_p.get_text(" ", strip=True)

        # ID externo
        cod_m = re.search(r"codvaga=(\d+)", href)
        id_externo = (
            cod_m.group(1) if cod_m else hashlib.md5(full_url.encode()).hexdigest()[:16]
        )

        return VagaBruta(
            titulo=titulo,
            empresa=empresa,
            descricao=descricao[:5000],
            localizacao=localizacao or None,
            url=full_url,
            fonte="apinfo",
            id_externo=id_externo,
        )
