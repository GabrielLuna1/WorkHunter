from typing import Optional
from core.logger import logger


class ProxyPool:
    def __init__(self) -> None:
        self._initialized = False

    def configure(self) -> None:
        self._initialized = True
        logger.info("proxy_pool.configurado", total=0)

    def get_proxy_url(self) -> Optional[str]:
        return None

    def mark_failed(self, proxy_url: str) -> None:
        pass

    @property
    def available_count(self) -> int:
        return 0

    @property
    def has_proxy(self) -> bool:
        return False


proxy_pool = ProxyPool()
