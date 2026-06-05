from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from core.database import database
from core.auth import get_user_id
from core.logger import logger
from services.profile_extractor import extract_and_save_profile

router = APIRouter(tags=["Perfil ExtraÃ§Ã£o"])


async def get_db() -> AsyncIOMotorDatabase:
    ok = await database.ensure_connected()
    if not ok:
        raise HTTPException(status_code=503, detail="Banco de dados indisponivel")
    return database.get_db()


@router.get("/{user_id}")
async def obter_perfil_extraido(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    doc = await db["profiles"].find_one({"user_id": user_id})
    if not doc:
        return {"data": None}
    doc["_id"] = str(doc["_id"])
    return {"data": doc}


@router.get("/")
async def obter_meu_perfil(
    user_id: str = Depends(get_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    doc = await db["profiles"].find_one({"user_id": user_id})
    if not doc:
        return {"data": None}
    doc["_id"] = str(doc["_id"])
    return {"data": doc}


@router.post("/refresh/{user_id}")
async def refresh_perfil(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    curriculo = await db["curriculo_versoes"].find_one(
        {"user_id": user_id, "ativo": True}, sort=[("versao", -1)]
    )
    if not curriculo:
        raise HTTPException(
            status_code=404,
            detail="Nenhum currÃ­culo ativo encontrado. FaÃ§a upload primeiro.",
        )

    try:
        profile = await extract_and_save_profile(user_id, curriculo, db)
        return {"success": True, "data": profile}
    except Exception as e:
        logger.error("profile.refresh_erro", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refresh")
async def refresh_meu_perfil(
    user_id: str = Depends(get_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    curriculo = await db["curriculo_versoes"].find_one(
        {"user_id": user_id, "ativo": True}, sort=[("versao", -1)]
    )
    if not curriculo:
        raise HTTPException(
            status_code=404,
            detail="Nenhum currÃ­culo ativo encontrado. FaÃ§a upload primeiro.",
        )

    try:
        profile = await extract_and_save_profile(user_id, curriculo, db)
        return {"success": True, "data": profile}
    except Exception as e:
        logger.error("profile.refresh_erro", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
