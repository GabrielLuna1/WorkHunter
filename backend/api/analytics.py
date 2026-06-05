from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from core.database import database
from services.analytics_service import AnalyticsService

router = APIRouter()


async def get_db() -> AsyncIOMotorDatabase:
    ok = await database.ensure_connected()
    if not ok:
        raise HTTPException(status_code=503, detail="Banco de dados indisponivel")
    return database.get_db()


@router.get("/stacks")
async def stacks_mais_pedidas(limit: int = Query(15, le=50), db: AsyncIOMotorDatabase = Depends(get_db)):
    svc = AnalyticsService(db)
    data = await svc.stacks_mais_pedidas(limit)
    return [{"stack": d["_id"], "count": d["count"]} for d in data]


@router.get("/salarios")
async def media_salarial(limit: int = Query(15, le=50), db: AsyncIOMotorDatabase = Depends(get_db)):
    svc = AnalyticsService(db)
    data = await svc.media_salarial_por_stack(limit)
    return [
        {
            "stack": d["_id"],
            "count": d["count"],
            "salario_medio_min": round(d.get("salario_medio_min", 0), 0),
            "salario_medio_max": round(d.get("salario_medio_max", 0), 0),
        }
        for d in data
    ]


@router.get("/fontes")
async def vagas_por_fonte(db: AsyncIOMotorDatabase = Depends(get_db)):
    svc = AnalyticsService(db)
    data = await svc.vagas_por_fonte()
    return [{"fonte": d["_id"], "count": d["count"]} for d in data]


@router.get("/senioridade")
async def vagas_por_senioridade(db: AsyncIOMotorDatabase = Depends(get_db)):
    svc = AnalyticsService(db)
    data = await svc.vagas_por_senioridade()
    return [{"nivel": d["_id"], "count": d["count"]} for d in data]


@router.get("/timeline")
async def vagas_por_dia(dias: int = Query(30, le=90), db: AsyncIOMotorDatabase = Depends(get_db)):
    svc = AnalyticsService(db)
    data = await svc.vagas_por_dia(dias)
    return [{"data": d["_id"], "count": d["count"]} for d in data]


@router.get("/overview")
async def overview(db: AsyncIOMotorDatabase = Depends(get_db)):
    svc = AnalyticsService(db)
    return await svc.overview()


@router.get("/fontes-score")
async def score_por_fonte(db: AsyncIOMotorDatabase = Depends(get_db)):
    svc = AnalyticsService(db)
    data = await svc.score_por_fonte()
    return [
        {
            "fonte": d["_id"],
            "count": d["count"],
            "score_medio": round(d.get("score_medio", 0), 1),
            "score_max": round(d.get("score_max", 0), 1),
        }
        for d in data
    ]


@router.get("/skills")
async def skills_populares(limit: int = Query(15, le=30), db: AsyncIOMotorDatabase = Depends(get_db)):
    svc = AnalyticsService(db)
    data = await svc.skills_populares(limit)
    return [{"skill": d["_id"], "count": d["count"]} for d in data]


@router.get("/chat")
async def chat_analytics(db: AsyncIOMotorDatabase = Depends(get_db)):
    from datetime import datetime, timedelta

    sessoes_coll = db["chat_sessoes"]
    msgs_coll = db["chat_mensagens"]

    total_sessoes = await sessoes_coll.count_documents({})
    total_mensagens = await msgs_coll.count_documents({})
    sessoes_hoje = await sessoes_coll.count_documents({
        "created_at": {"$gte": datetime.utcnow() - timedelta(days=1)},
    })

    pipeline = [
        {"$match": {"metadata.tool": {"$exists": True}}},
        {"$group": {"_id": "$metadata.tool.tool", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    tools_cursor = msgs_coll.aggregate(pipeline)
    tool_counts = {}
    async for doc in tools_cursor:
        tool_counts[doc["_id"] or "unknown"] = doc["count"]

    tool_results = [
        {"$match": {"metadata.tool_result": {"$exists": True}}},
        {"$group": {"_id": "$metadata.tool_result", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    results_cursor = msgs_coll.aggregate(tool_results)
    tool_result_counts = {}
    async for doc in results_cursor:
        tool_result_counts[doc["_id"] or "unknown"] = doc["count"]

    agora = datetime.utcnow()
    daily = []
    for i in range(7):
        day_start = agora - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        count = await msgs_coll.count_documents({
            "created_at": {"$gte": day_start, "$lt": day_end},
        })
        daily.append({
            "data": day_start.strftime("%Y-%m-%d"),
            "mensagens": count,
        })
    daily.reverse()

    return {
        "total_sessoes": total_sessoes,
        "total_mensagens": total_mensagens,
        "sessoes_hoje": sessoes_hoje,
        "media_mensagens_por_sessao": round(total_mensagens / total_sessoes, 1) if total_sessoes > 0 else 0,
        "tools_executadas": tool_counts,
        "tools_resultados": tool_result_counts,
        "atividade_diaria": daily,
    }
