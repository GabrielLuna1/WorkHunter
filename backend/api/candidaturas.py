from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson.objectid import ObjectId
from core.database import database
from core.logger import logger
from models.candidatura import CandidaturaDB, CandidaturaResponse


router = APIRouter()


async def get_db() -> AsyncIOMotorDatabase:
    ok = await database.ensure_connected()
    if not ok:
        raise HTTPException(status_code=503, detail="Banco de dados indisponivel")
    return database.get_db()


@router.get("/", response_model=List[CandidaturaResponse])
async def listar_candidaturas(
    status: str | None = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    filtro = {}
    if status:
        filtro["status"] = status
    cursor = db["candidaturas"].find(filtro).sort("atualizada_em", -1)
    docs = await cursor.to_list(length=200)
    return [_formatar(d) for d in docs]


@router.post("/{vaga_id}", response_model=CandidaturaResponse)
async def candidatar(
    vaga_id: str,
    observacoes: str | None = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    vaga = await db["vagas"].find_one({"_id": ObjectId(vaga_id)})
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga nÃ£o encontrada")

    curriculo_doc = await db["curriculo_versoes"].find_one({}, sort=[("uploaded_at", -1)])
    if not curriculo_doc or not curriculo_doc.get("estruturado"):
        raise HTTPException(
            status_code=400,
            detail="Nenhum currÃ­culo encontrado. FaÃ§a upload em /curriculo primeiro.",
        )

    existente = await db["candidaturas"].find_one({"vaga_id": vaga_id})
    if existente:
        raise HTTPException(status_code=409, detail="VocÃª jÃ¡ se candidatou a esta vaga")

    candidatura = CandidaturaDB(
        vaga_id=vaga_id,
        vaga_titulo=vaga["titulo"],
        empresa=vaga["empresa"],
        score_no_momento=vaga.get("score", 50),
        observacoes=observacoes,
        status="candidatada",
    )

    doc = candidatura.model_dump()
    result = await db["candidaturas"].insert_one(doc)
    doc["_id"] = result.inserted_id

    logger.info("candidatura.criada", vaga=vaga["titulo"])
    return _formatar(doc)


@router.patch("/{candidatura_id}/status", response_model=CandidaturaResponse)
async def atualizar_status(
    candidatura_id: str,
    status: str = Query(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    from datetime import datetime

    validos = ["salva", "candidatada", "entrevista", "rejeitada", "aprovada"]
    if status not in validos:
        raise HTTPException(
            status_code=400, detail=f"Status invÃ¡lido. Use: {', '.join(validos)}"
        )

    result = await db["candidaturas"].find_one_and_update(
        {"_id": ObjectId(candidatura_id)},
        {"$set": {"status": status, "atualizada_em": datetime.utcnow()}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Candidatura nÃ£o encontrada")
    return _formatar(result)


@router.get("/estatisticas")
async def estatisticas(db: AsyncIOMotorDatabase = Depends(get_db)):
    pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    results = await db["candidaturas"].aggregate(pipeline).to_list(length=20)
    stats = {r["_id"]: r["count"] for r in results}
    return {
        "salva": stats.get("salva", 0),
        "candidatada": stats.get("candidatada", 0),
        "entrevista": stats.get("entrevista", 0),
        "rejeitada": stats.get("rejeitada", 0),
        "aprovada": stats.get("aprovada", 0),
    }


def _formatar(d: dict) -> CandidaturaResponse:
    return CandidaturaResponse(
        id=str(d["_id"]),
        vaga_id=d["vaga_id"],
        vaga_titulo=d["vaga_titulo"],
        empresa=d["empresa"],
        status=d["status"],
        score_no_momento=d.get("score_no_momento", 50),
        curriculo_gerado=d.get("curriculo_gerado", False),
        curriculo_path=d.get("curriculo_path"),
        observacoes=d.get("observacoes"),
        criada_em=d["criada_em"],
        atualizada_em=d["atualizada_em"],
    )
