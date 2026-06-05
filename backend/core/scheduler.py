from apscheduler.schedulers.asyncio import AsyncIOScheduler
from core.logger import logger

scheduler = AsyncIOScheduler(timezone="America/Sao_Paulo")

def init_scheduler():
    if not scheduler.running:
        scheduler.start()
        logger.info("scheduler.iniciado (sem jobs ativos)")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("scheduler.parado")
