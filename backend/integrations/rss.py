from typing import List
import httpx
import feedparser
from integrations.base import BaseCollector
from models.vaga import VagaBruta
from core.logger import logger


REMOTE_FEEDS = {
    # Feeds internacionais desativados â€” qualidade > quantidade
    # "remoteok": "https://remoteok.com/feed",
}


class RSSCollector(BaseCollector):
    def __init__(self, feeds: List[str] | None = None) -> None:
        super().__init__(nome="rss")
        self.feeds = feeds or list(REMOTE_FEEDS.values())

    async def coletar(self) -> List[VagaBruta]:
        vagas: List[VagaBruta] = []
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        async with httpx.AsyncClient(timeout=30, headers=headers, follow_redirects=True) as client:
            for url in self.feeds:
                try:
                    resp = await client.get(url)
                    resp.raise_for_status()
                    feed = feedparser.parse(resp.text)
                    parsed = self._parse(feed, url)
                    vagas.extend(parsed)
                    logger.info("rss.coletor_ok", feed=url, total=len(parsed))
                except httpx.HTTPError as e:
                    logger.warning("rss.erro", feed=url, error=str(e))
                    continue
        return vagas

    def _parse(self, feed: feedparser.FeedParserDict, url: str) -> List[VagaBruta]:
        resultados = []
        for entry in feed.entries:
            titulo = entry.get("title", "")
            if not titulo:
                continue
            empresa = entry.get("author", entry.get("source", {}).get("title", ""))
            descricao = entry.get("summary", entry.get("description", "")) or ""
            resultados.append(VagaBruta(
                titulo=titulo,
                empresa=empresa,
                descricao=descricao[:5000],
                localizacao=entry.get("location"),
                url=entry.get("link", ""),
                fonte=f"rss",
                id_externo=entry.get("id", entry.get("link", "")),
                data_publicacao=None,
            ))
        return resultados
