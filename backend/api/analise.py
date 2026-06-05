from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_db
from core.auth import get_user_id

router = APIRouter()


def _doc(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    for k in ("created_at",):
        if k in doc and isinstance(doc[k], datetime):
            doc[k] = doc[k].isoformat()
    return doc


@router.get("/match/{vaga_id}")
async def obter_match(
    vaga_id: str,
    user_id: str = Depends(get_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    doc = await db["match_results"].find_one({"vaga_id": vaga_id, "user_id": user_id})
    if not doc:
        return None
    return _doc(doc)


@router.get("/vaga/{vaga_id}")
async def obter_analise(
    vaga_id: str,
    user_id: str = Depends(get_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    doc = await db["vaga_analysis"].find_one({"vaga_id": vaga_id, "user_id": user_id})
    if not doc:
        return None
    return _doc(doc)


@router.post("/match/bulk")
async def obter_matches_bulk(
    body: dict,
    user_id: str = Depends(get_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    vaga_ids = body.get("vaga_ids", [])
    if not vaga_ids:
        return {}
    cursor = db["match_results"].find(
        {"vaga_id": {"$in": vaga_ids}, "user_id": user_id},
        {"vaga_id": 1, "score_geral": 1, "_id": 0},
    )
    result = {}
    async for doc in cursor:
        result[doc["vaga_id"]] = {"score": doc.get("score_geral"), "analisado": True}
    return result


@router.get("/completa/{vaga_id}")
async def obter_analise_completa(
    vaga_id: str,
    user_id: str = Depends(get_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    vaga = await db["vagas"].find_one({"_id": ObjectId(vaga_id)})
    if not vaga:
        raise HTTPException(404, "Vaga nÃ£o encontrada")

    analise = await db["vaga_analysis"].find_one(
        {"vaga_id": vaga_id, "user_id": user_id}
    )
    match = await db["match_results"].find_one({"vaga_id": vaga_id, "user_id": user_id})
    status = await db["vagas_usuarios"].find_one(
        {"vaga_id": vaga_id, "user_id": user_id}
    )
    pipeline = await db["pipeline"].find_one({"vaga_id": vaga_id, "user_id": user_id})

    return {
        "vaga": _doc(vaga),
        "analise": _doc(analise) if analise else None,
        "match": {
            "score": match.get("score_geral") if match else None,
            "detalhes": {
                k: match[k]
                for k in [
                    "score_geral",
                    "score_tecnico",
                    "score_experiencia",
                    "score_soft_skills",
                    "chance_entrevista",
                ]
                if k in match
            }
            if match
            else None,
            "analisado_em": match.get("created_at").isoformat()
            if match and match.get("created_at")
            else None,
        }
        if match
        else None,
        "status": {
            "salva": status.get("salva", False) if status else False,
            "aplicada": status.get("aplicada", False) if status else False,
            "favoritada": status.get("favoritada", False) if status else False,
            "analisada": status.get("analisada", False) if status else False,
        }
        if status
        else None,
        "pipeline": pipeline.get("status") if pipeline else None,
    }
