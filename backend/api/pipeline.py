from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from core.database import database
from core.config import settings
from core.auth import get_user_id
from core.logger import logger
from services.pipeline_service import PipelineService
from services.telegram_bot import notificar_pipeline

router = APIRouter()


async def get_db() -> AsyncIOMotorDatabase:
    ok = await database.ensure_connected()
    if not ok:
        raise HTTPException(status_code=503, detail="Banco de dados indisponivel")
    return database.get_db()


@router.post("/{vaga_id}")
async def criar_pipeline(
    vaga_id: str,
    etapa: Optional[str] = Query("salva"),
    curriculo_versao_id: Optional[str] = Query(None),
    user_id: str = Depends(get_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    svc = PipelineService(db)
    result = await svc.criar(
        vaga_id, user_id=user_id, etapa=etapa, curriculo_versao_id=curriculo_versao_id
    )
    if not result:
        raise HTTPException(status_code=404, detail="Vaga nÃ£o encontrada")
    return result


@router.get("/")
async def listar_pipeline(
    etapa: Optional[str] = Query(None),
    user_id: str = Depends(get_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    svc = PipelineService(db)
    return await svc.listar(user_id=user_id, etapa=etapa)


@router.patch("/{pipeline_id}/etapa")
async def avancar_etapa(
    pipeline_id: str,
    etapa: str = Query(...),
    observacao: Optional[str] = Query(None),
    user_id: str = Depends(get_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    from models.pipeline import ETAPAS_PIPELINE, ETAPAS_REJEICAO

    validas = ETAPAS_PIPELINE + ETAPAS_REJEICAO
    if etapa not in validas:
        raise HTTPException(
            status_code=400,
            detail=f"Etapa invÃ¡lida. Use uma de: {', '.join(validas)}",
        )

    svc = PipelineService(db)
    result = await svc.avancar_etapa(pipeline_id, etapa, observacao)
    if not result:
        raise HTTPException(
            status_code=404, detail="Pipeline nÃ£o encontrado ou etapa invÃ¡lida"
        )

    try:
        chat_id = settings.telegram_chat_id
        if chat_id and result.get("vaga_titulo"):
            await notificar_pipeline(
                chat_id,
                result["vaga_titulo"],
                result.get("empresa", ""),
                result.get("etapa", ""),
                etapa,
            )
    except Exception as e:
        logger.warning("pipeline.telegram_erro", error=str(e))

    return result


@router.patch("/{pipeline_id}")
async def atualizar_pipeline(
    pipeline_id: str,
    body: dict,
    user_id: str = Depends(get_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    svc = PipelineService(db)
    result = await svc.atualizar(pipeline_id, body)
    if not result:
        raise HTTPException(
            status_code=400, detail="Nenhum campo vÃ¡lido para atualizar"
        )
    return result


@router.delete("/{pipeline_id}")
async def deletar_pipeline(
    pipeline_id: str,
    user_id: str = Depends(get_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    svc = PipelineService(db)
    ok = await svc.deletar(pipeline_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Pipeline nÃ£o encontrado")
    return {"ok": True}


@router.get("/estatisticas")
async def pipeline_estatisticas(
    user_id: str = Depends(get_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    svc = PipelineService(db)
    return await svc.estatisticas(user_id=user_id)


@router.get("/curriculo/{curriculo_id}")
async def pipeline_por_curriculo(
    curriculo_id: str,
    user_id: str = Depends(get_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    svc = PipelineService(db)
    return await svc.listar_por_curriculo(curriculo_id)
