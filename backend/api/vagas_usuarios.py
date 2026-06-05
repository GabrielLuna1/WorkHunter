from datetime import datetime
from typing import Dict
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson.objectid import ObjectId
from core.database import database
from models.vaga_usuario import VagaUsuarioResponse

router = APIRouter()


async def get_db() -> AsyncIOMotorDatabase:
    ok = await database.ensure_connected()
    if not ok:
        raise HTTPException(status_code=503, detail="Banco de dados indisponivel")
    return database.get_db()


USER_ID = "default"


async def _get_or_create(db, vaga_id: str) -> dict:
    doc = await db["vagas_usuarios"].find_one({
        "user_id": USER_ID, "vaga_id": vaga_id,
    })
    if not doc:
        result = await db["vagas_usuarios"].insert_one({
            "user_id": USER_ID,
            "vaga_id": vaga_id,
            "favoritada": False,
            "aplicada": False,
            "salva": False,
            "analisada": False,
            "ignorada": False,
            "arquivada": False,
            "notas": "",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        })
        doc = await db["vagas_usuarios"].find_one({"_id": result.inserted_id})
    return doc


def _format(doc: dict) -> VagaUsuarioResponse:
    return VagaUsuarioResponse(
        id=str(doc["_id"]),
        favoritada=doc.get("favoritada", False),
        aplicada=doc.get("aplicada", False),
        salva=doc.get("salva", False),
        analisada=doc.get("analisada", False),
        ignorada=doc.get("ignorada", False),
        arquivada=doc.get("arquivada", False),
        notas=doc.get("notas", ""),
        updated_at=doc["updated_at"],
    )


@router.post("/favoritar/{vaga_id}")
async def toggle_favorito(
    vaga_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    doc = await _get_or_create(db, vaga_id)
    novo_valor = not doc.get("favoritada", False)
    await db["vagas_usuarios"].update_one(
        {"_id": doc["_id"]},
        {"$set": {"favoritada": novo_valor, "updated_at": datetime.utcnow()}},
    )
    return {"favoritada": novo_valor}


@router.get("/status/{vaga_id}", response_model=VagaUsuarioResponse)
async def obter_status(
    vaga_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    doc = await _get_or_create(db, vaga_id)
    return _format(doc)


@router.post("/bulk-status")
async def bulk_status(
    body: Dict[str, list],
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    vaga_ids = body.get("vaga_ids", [])
    if not vaga_ids:
        return {}

    docs = await db["vagas_usuarios"].find({
        "user_id": USER_ID,
        "vaga_id": {"$in": vaga_ids},
    }).to_list(length=len(vaga_ids))

    result = {}
    for d in docs:
        result[d["vaga_id"]] = {
            "favoritada": d.get("favoritada", False),
            "aplicada": d.get("aplicada", False),
            "salva": d.get("salva", False),
            "analisada": d.get("analisada", False),
            "ignorada": d.get("ignorada", False),
            "arquivada": d.get("arquivada", False),
        }
    return result


@router.patch("/{vaga_id}")
async def atualizar_vaga_usuario(
    vaga_id: str,
    body: dict,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    doc = await _get_or_create(db, vaga_id)
    campos_permitidos = {"notas", "ignorada", "arquivada", "aplicada", "salva", "analisada"}
    update = {k: v for k, v in body.items() if k in campos_permitidos}
    if not update:
        raise HTTPException(status_code=400, detail="Nenhum campo valido para atualizar")
    update["updated_at"] = datetime.utcnow()
    await db["vagas_usuarios"].update_one(
        {"_id": doc["_id"]},
        {"$set": update},
    )
    return {"ok": True}
