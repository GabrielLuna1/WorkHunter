from typing import Optional
from core.logger import logger


class BrowserManager:
    _instance: Optional["BrowserManager"] = None
    _browser = None
    _playwright = None

    def __new__(cls) -> "BrowserManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def get_browser(self):
        if self._browser is None:
            from playwright.async_api import async_playwright

            self._playwright = await async_playwright().start()

            launch_args = [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
            ]

            self._browser = await self._playwright.chromium.launch(
                headless=True,
                args=launch_args,
            )
            logger.info("browser_manager.iniciado")
        return self._browser

    async def new_context(self):
        browser = await self.get_browser()
        return await browser.new_context()

    async def close(self) -> None:
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None
        logger.info("browser_manager.fechado")


browser_manager = BrowserManager()
