from celery import shared_task
from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings
from core.logger import logger
from integrations.gupy import GupyCollector
from integrations.infojobs import InfoJobsCollector

from integrations.programathor import ProgramathorCollector
from integrations.vagasbr import VagasBRCollector
from integrations.apinfo import APInfoCollector
from integrations.noventa_e_nove_jobs import NoventaENoveJobsCollector
from services.dedup_service import DedupService
from services.scoring_service import ScoringService
from services.analise_service import AnaliseService
from services.notification_service import notificar_vagas_imperdiveis
from services.telegram_bot import notificar_match, notificar_resumo_diario


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def coletar_vagas(self):
    import asyncio

    asyncio.run(_coletar())


async def _coletar():
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client.get_default_database()

    # Buscar termos dinÃ¢micos do perfil de usuÃ¡rio
    from services.search_terms import SearchTermsService

    search_service = SearchTermsService(db)
    termos = await search_service.get_termos()
    if not termos:
        termos = ["frontend", "front-end", "react", "vue", "next.js"]

    logger.info("coleta.termos_carregados", termos=termos)

    coletores = [
        GupyCollector(termos=termos),
        InfoJobsCollector(termos=termos),
        VagasBRCollector(termos=termos),
        APInfoCollector(termos=termos),
    ]

    logger.info("coleta.iniciando_coletores_rapidos")
    vagas_brutas = []
    for c in coletores:
        try:
            vagas = await c.coletar()
            vagas_brutas.extend(vagas)
            logger.info("coleta.coletor_ok", fonte=c.nome, total=len(vagas))
        except Exception as e:
            logger.warning("coleta.coletor_erro", fonte=c.nome, error=str(e))

    # --- ATS Integradores (Greenhouse, Taqe, Workable) ---
    logger.info("coleta.iniciando_ats_integradores")
    try:
        from integrations.ats import executar_integradores_ats

        vagas_ats = await executar_integradores_ats(termos)
        vagas_brutas.extend(vagas_ats)
        logger.info("coleta.ats_concluida", total=len(vagas_ats))
    except Exception as e:
        logger.error("coleta.ats_erro", error=str(e))

    logger.info("coleta.iniciando_coletores_web")
    coletores_web = [
        ProgramathorCollector(termos=termos),
        NoventaENoveJobsCollector(termos=termos),
    ]
    for c in coletores_web:
        try:
            vagas = await c.coletar()
            vagas_brutas.extend(vagas)
            logger.info("coleta.coletor_ok", fonte=c.nome, total=len(vagas))
        except Exception as e:
            logger.warning("coleta.coletor_erro", fonte=c.nome, error=str(e))

    from core.browser_manager import browser_manager

    await browser_manager.close()

    dedup = DedupService(db)
    novas = await dedup.filtrar_novas(vagas_brutas)

    if novas:
        termos_str = "frontend, front-end, react, vue, next.js"
        for vaga in novas:
            vaga.termo_busca = termos_str

        from services.location_utils import extrair_uf

        for vaga in novas:
            vaga.uf = extrair_uf(vaga.localizacao)

    inseridas = await dedup.inserir_lote(novas)

    vagas_com_score: list[dict] = []
    if novas:
        scoring = ScoringService(db)
        analise = AnaliseService()
        for vaga in novas:
            score = await scoring.calcular(vaga)
            await db["vagas"].update_one(
                {"hash": vaga.hash},
                {"$set": {"score": score}},
            )
            analise_result = analise.analisar_fake_junior(vaga)
            await db["vagas"].update_one(
                {"hash": vaga.hash},
                {"$set": {"analise": analise_result}},
            )
            vagas_com_score.append(
                {
                    "titulo": vaga.titulo,
                    "empresa": vaga.empresa,
                    "score": score,
                    "url": vaga.url,
                }
            )

    if vagas_com_score:
        notificar_vagas_imperdiveis(vagas_com_score)
        try:
            chat_id = settings.telegram_chat_id
            if chat_id:
                # Ordenar por maior score primeiro
                vagas_ordenadas = sorted(
                    vagas_com_score, key=lambda x: x["score"], reverse=True
                )
                for v in vagas_ordenadas:
                    if v["score"] >= 85:
                        await notificar_match(
                            chat_id, v["titulo"], v["empresa"], v["score"], url=v["url"]
                        )
        except Exception as e:
            logger.warning("coleta.telegram_erro", error=str(e))

    client.close()
    return {"total_brutas": len(vagas_brutas), "novas_inseridas": inseridas}


@shared_task
def resumo_diario():
    import asyncio

    asyncio.run(_enviar_resumo_diario())


async def _enviar_resumo_diario():
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client.get_default_database()

    try:
        chat_id = settings.telegram_chat_id
        if not chat_id:
            logger.info("resumo_diario.sem_chat_id")
            return

        from datetime import datetime, timedelta

        hoje = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

        novas_hoje = await db["vagas"].count_documents(
            {"coletada_em": {"$gte": hoje.isoformat()}}
        )

        pipeline_counts = {}
        for etapa in [
            "salva",
            "aplicada",
            "em_analise",
            "entrevista_rh",
            "entrevista_tecnica",
            "teste_tecnico",
            "contratado",
            "rejeitado",
        ]:
            pipeline_counts[etapa] = await db["pipeline"].count_documents(
                {"etapa": etapa}
            )

        top_cursor = db["vagas"].find({"ativa": True}).sort("score", -1).limit(5)
        top_vagas = [
            {
                "titulo": v.get("titulo"),
                "empresa": v.get("empresa"),
                "score": v.get("score"),
            }
            async for v in top_cursor
        ]

        await notificar_resumo_diario(chat_id, novas_hoje, pipeline_counts, top_vagas)

    except Exception as e:
        logger.error("resumo_diario.erro", error=str(e))
    finally:
        client.close()
