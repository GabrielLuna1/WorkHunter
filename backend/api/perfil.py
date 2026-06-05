from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from core.database import database
from models.perfil_usuario import PerfilUsuario

router = APIRouter()


async def get_db() -> AsyncIOMotorDatabase:
    ok = await database.ensure_connected()
    if not ok:
        raise HTTPException(status_code=503, detail="Banco de dados indisponivel")
    return database.get_db()


@router.get("/", response_model=PerfilUsuario | None)
async def obter_perfil(db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await db["perfil_usuario"].find_one({})
    if doc:
        doc.pop("_id", None)
    return doc


@router.put("/", response_model=PerfilUsuario)
async def salvar_perfil(
    perfil: PerfilUsuario, db: AsyncIOMotorDatabase = Depends(get_db)
):
    await db["perfil_usuario"].delete_many({})
    doc = perfil.model_dump()
    await db["perfil_usuario"].insert_one(doc)
    return perfil
