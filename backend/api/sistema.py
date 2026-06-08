import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Body
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase
from core.database import database
from core.logger import logger
from integrations.gupy import GupyCollector
from integrations.infojobs import InfoJobsCollector
from integrations.vagasbr import VagasBRCollector
from integrations.apinfo import APInfoCollector
from services.dedup_service import DedupService
from services.scoring_service import ScoringService
from services.analise_service import AnaliseService
from services.notification_service import notificar_vagas_imperdiveis
from services.search_terms import SearchTermsService
from services.relevance_filter import RelevanceFilter, limpar_vagas_irrelevantes

router = APIRouter()


async def get_db() -> AsyncIOMotorDatabase:
    ok = await database.ensure_connected()
    if not ok:
        raise HTTPException(status_code=503, detail="Banco de dados indisponivel")
    return database.get_db()


class ColetarRequest(BaseModel):
    termos: Optional[list[str]] = None


@router.get("/health")
async def health(db: AsyncIOMotorDatabase = Depends(get_db)):
    db_ok = await database.ensure_connected()
    total_vagas = await db["vagas"].count_documents({})
    ultima_coleta = await db["vagas"].find_one(sort=[("coletada_em", -1)])
    stats = {
        "status": "ok",
        "database": db_ok,
        "total_vagas": total_vagas,
        "ultima_coleta": ultima_coleta["coletada_em"].isoformat()
        if ultima_coleta
        else None,
        "versao": "1.1.0",
    }
    return stats


_coleta_em_andamento = False


@router.post("/coletar-agora")
async def coletar_agora(
    background_tasks: BackgroundTasks, payload: dict = Body(default={})
):
    global _coleta_em_andamento

    if _coleta_em_andamento:
        raise HTTPException(
            status_code=409,
            detail="Já existe uma coleta em andamento. Aguarde a conclusão antes de iniciar outra.",
        )

    raw_termos = payload.get("termos") or []
    termo_busca = payload.get("termo_busca")

    if isinstance(raw_termos, list) and len(raw_termos) > 0:
        termos = [t.strip() for t in raw_termos if t.strip()]
    elif termo_busca:
        termos = [termo_busca.strip()]
    else:
        search_service = SearchTermsService(database.get_db())
        termos = await search_service.get_termos()

    if not termos:
        raise HTTPException(
            status_code=400,
            detail="Nenhum termo de busca encontrado no perfil. Preencha seus cargos alvo ou área de foco.",
        )

    _coleta_em_andamento = True
    background_tasks.add_task(executar_coleta, termos)
    return {
        "status": "iniciado",
        "mensagem": "Coleta em background iniciada",
        "termos": termos,
    }


@router.post("/coletar-agora/cancelar")
async def cancelar_coleta():
    global _coleta_em_andamento
    db = database.get_db()
    from datetime import datetime

    await db["coleta_status"].update_one(
        {"_id": "status"},
        {
            "$set": {
                "status": "cancelado",
                "mensagem": "Coleta cancelada pelo usuário.",
                "progresso": 100,
                "coletor_atual": "",
                "atualizado_em": datetime.utcnow(),
            },
            "$push": {"detalhes": "⏹️ Coleta cancelada manualmente."},
        },
    )
    _coleta_em_andamento = False
    return {"status": "cancelado", "mensagem": "Coleta cancelada."}


async def executar_coleta(termos: list[str]):
    global _coleta_em_andamento
    db = database.get_db()
    from datetime import datetime

    try:
        logger.info("coleta.iniciando_manual", termos=termos[:5])

        # Reset e marca como rodando
        await db["coleta_status"].update_one(
            {"_id": "status"},
            {
                "$set": {
                    "status": "rodando",
                    "mensagem": "Iniciando a busca de vagas...",
                    "progresso": 5,
                    "coletor_atual": "Inicializando",
                    "detalhes": ["Iniciando motores de busca de vagas..."],
                    "atualizado_em": datetime.utcnow(),
                }
            },
            upsert=True,
        )

        todos_coletores = [
            ("Gupy (API)", GupyCollector(termos=termos)),
            ("InfoJobs (HTTP)", InfoJobsCollector(termos=termos)),
            ("Vagas.com (HTTP)", VagasBRCollector(termos=termos)),
            ("APInfo (HTTP)", APInfoCollector(termos=termos)),
        ]

        vagas_brutas = []
        total_coletores = len(todos_coletores)

        for idx, (nome_exibivel, collector) in enumerate(todos_coletores):
            # Verifica se o usuário cancelou
            status_doc = await db["coleta_status"].find_one({"_id": "status"})
            if status_doc and status_doc.get("status") == "cancelado":
                logger.info("coleta.cancelada_pelo_usuario")
                _coleta_em_andamento = False
                return

            progresso = int(5 + (idx / total_coletores) * 75)  # 5% a 80%
            await db["coleta_status"].update_one(
                {"_id": "status"},
                {
                    "$set": {
                        "mensagem": f"Buscando no {nome_exibivel}...",
                        "progresso": progresso,
                        "coletor_atual": nome_exibivel,
                        "atualizado_em": datetime.utcnow(),
                    },
                    "$push": {"detalhes": f"Acessando {nome_exibivel}..."},
                },
            )

            try:
                vagas = await asyncio.wait_for(collector.coletar(), timeout=180.0)
                vagas_brutas.extend(vagas)
                logger.info("coleta.coletor_ok", fonte=collector.nome, total=len(vagas))

                await db["coleta_status"].update_one(
                    {"_id": "status"},
                    {
                        "$push": {
                            "detalhes": f"✓ {nome_exibivel}: {len(vagas)} vagas encontradas"
                        }
                    },
                )
            except asyncio.TimeoutError:
                logger.warning("coleta.coletor_timeout", fonte=collector.nome)
                await db["coleta_status"].update_one(
                    {"_id": "status"},
                    {
                        "$push": {
                            "detalhes": f"⏰ {nome_exibivel}: timeout após 120s — pulando"
                        }
                    },
                )
            except Exception as e:
                logger.warning(
                    "coleta.coletor_erro", fonte=collector.nome, error=str(e)
                )
                await db["coleta_status"].update_one(
                    {"_id": "status"},
                    {"$push": {"detalhes": f"❌ {nome_exibivel}: falha ({str(e)})"}},
                )

        await db["coleta_status"].update_one(
            {"_id": "status"},
            {
                "$set": {
                    "mensagem": "Fechando conexões de navegadores...",
                    "progresso": 82,
                    "coletor_atual": "Limpeza",
                    "atualizado_em": datetime.utcnow(),
                }
            },
        )

        from core.browser_manager import browser_manager

        await browser_manager.close()

        # Dedup
        await db["coleta_status"].update_one(
            {"_id": "status"},
            {
                "$set": {
                    "mensagem": "Filtrando vagas duplicadas...",
                    "progresso": 85,
                    "coletor_atual": "Dedup",
                    "atualizado_em": datetime.utcnow(),
                }
            },
        )
        dedup = DedupService(db)
        novas = await dedup.filtrar_novas(vagas_brutas)

        # Extrair Modelo de Trabalho
        if novas:
            await db["coleta_status"].update_one(
                {"_id": "status"},
                {
                    "$set": {
                        "mensagem": "Extraindo modelos de trabalho...",
                        "progresso": 87,
                        "coletor_atual": "Processando",
                        "atualizado_em": datetime.utcnow(),
                    }
                },
            )
            from services.work_model_extractor import WorkModelExtractor

            for vaga in novas:
                vaga.modelo_trabalho = WorkModelExtractor.extrair(vaga)

        # Filtro de relevância antes de inserir
        filtradas_irrelevantes = 0
        if novas:
            await db["coleta_status"].update_one(
                {"_id": "status"},
                {
                    "$set": {
                        "mensagem": "Aplicando filtros de relevância...",
                        "progresso": 90,
                        "coletor_atual": "Relevância",
                        "atualizado_em": datetime.utcnow(),
                    }
                },
            )
            perfil_doc = await db["perfil_usuario"].find_one({})
            perfil = None
            if perfil_doc:
                try:
                    from models.perfil_usuario import PerfilUsuario

                    perfil = PerfilUsuario(**perfil_doc)
                except Exception:
                    pass
            relevance = RelevanceFilter(db)
            novas, filtradas_irrelevantes = await relevance.filtrar(novas, perfil)

        # Filtro geográfico (remove vagas internacionais)
        filtradas_geo = 0
        if novas:
            await db["coleta_status"].update_one(
                {"_id": "status"},
                {
                    "$set": {
                        "mensagem": "Aplicando filtros geográficos...",
                        "progresso": 92,
                        "coletor_atual": "Geolocalização",
                        "atualizado_em": datetime.utcnow(),
                    }
                },
            )
            from services.geo_filter import GeoFilter

            geo = GeoFilter()
            novas, filtradas_geo = geo.filtrar(novas)

        # Taggear com termo de busca
        if novas and termos:
            termos_str = ", ".join(termos)
            for vaga in novas:
                vaga.termo_busca = termos_str

        # Extrair UF da localização
        if novas:
            await db["coleta_status"].update_one(
                {"_id": "status"},
                {
                    "$set": {
                        "mensagem": "Extraindo estados (UF)...",
                        "progresso": 94,
                        "coletor_atual": "Localização",
                        "atualizado_em": datetime.utcnow(),
                    }
                },
            )
            from services.location_utils import extrair_uf

            for vaga in novas:
                vaga.uf = extrair_uf(vaga.localizacao)

        await db["coleta_status"].update_one(
            {"_id": "status"},
            {
                "$set": {
                    "mensagem": "Salvando novas vagas encontradas...",
                    "progresso": 95,
                    "coletor_atual": "Banco de Dados",
                    "atualizado_em": datetime.utcnow(),
                }
            },
        )
        inseridas = await dedup.inserir_lote(novas)

        # Scoring e análise
        vagas_com_score: list[dict] = []
        if novas:
            await db["coleta_status"].update_one(
                {"_id": "status"},
                {
                    "$set": {
                        "mensagem": "Calculando Match Score...",
                        "progresso": 97,
                        "coletor_atual": "Scoring Service",
                        "atualizado_em": datetime.utcnow(),
                    }
                },
            )
            scoring = ScoringService(db)
            analise = AnaliseService()
            for vaga in novas:
                score = await scoring.calcular(vaga)
                analise_result = analise.analisar_fake_junior(vaga)
                await db["vagas"].update_one(
                    {"hash": vaga.hash},
                    {"$set": {"score": score, "analise": analise_result}},
                )
                logger.info("vaga_analisada", titulo=vaga.titulo, score=score)
                vagas_com_score.append(
                    {
                        "titulo": vaga.titulo,
                        "empresa": vaga.empresa,
                        "score": score,
                    }
                )

        if vagas_com_score:
            notificar_vagas_imperdiveis(vagas_com_score)

        logger.info(
            "coleta.concluida",
            total_brutas=len(vagas_brutas),
            inseridas=inseridas,
            filtradas_irrelevantes=filtradas_irrelevantes,
            filtradas_geo=filtradas_geo,
        )

        await db["coleta_status"].update_one(
            {"_id": "status"},
            {
                "$set": {
                    "status": "concluido",
                    "mensagem": f"Coleta concluída! {inseridas} novas vagas adicionadas.",
                    "progresso": 100,
                    "coletor_atual": "",
                    "atualizado_em": datetime.utcnow(),
                },
                "$push": {
                    "detalhes": f"Finalizado! {inseridas} novas vagas importadas com sucesso."
                },
            },
        )

        _coleta_em_andamento = False

    except Exception as e:
        _coleta_em_andamento = False
        logger.error("coleta.erro_geral", error=str(e))
        import traceback

        traceback.print_exc()
        await db["coleta_status"].update_one(
            {"_id": "status"},
            {
                "$set": {
                    "status": "erro",
                    "mensagem": f"Falha na coleta: {str(e)}",
                    "progresso": 100,
                    "coletor_atual": "",
                    "atualizado_em": datetime.utcnow(),
                },
                "$push": {"detalhes": f"❌ Ocorreu um erro geral: {str(e)}"},
            },
        )


@router.get("/coleta/status")
async def get_coleta_status(db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Retorna o status atual do progresso da coleta manual.
    """
    status = await db["coleta_status"].find_one({"_id": "status"})
    if not status:
        return {
            "status": "ocioso",
            "mensagem": "Nenhuma coleta ativa no momento.",
            "progresso": 0,
            "coletor_atual": "",
            "detalhes": [],
        }
    status["_id"] = str(status["_id"])
    if "atualizado_em" in status and status["atualizado_em"]:
        status["atualizado_em"] = status["atualizado_em"].isoformat()
    return status


@router.post("/limpar-vagas")
async def limpar_vagas(db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Remove vagas irrelevantes da base de dados.
    Preserva vagas que estejam no pipeline.
    """
    try:
        resultado = await limpar_vagas_irrelevantes(db)
        return resultado
    except Exception as e:
        logger.error("limpar_vagas.erro", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
