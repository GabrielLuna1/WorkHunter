from celery import Celery
from celery.schedules import crontab
from core.config import settings

celery_app = Celery(
    "workplus",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Sao_Paulo",
    enable_utc=True,
    beat_schedule={
        "coletar-vagas-a-cada-2h": {
            "task": "tasks.coleta.coletar_vagas",
            "schedule": 7200,
        },
        "resumo-diario-8h": {
            "task": "tasks.coleta.resumo_diario",
            "schedule": crontab(hour=8, minute=0),
        },
    },
)
