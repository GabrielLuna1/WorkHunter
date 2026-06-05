from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from core.database import database
from models.perfil_usuario import PerfilUsuario
from services.seed_service import seed_perfil

router = APIRouter()


async def get_db() -> AsyncIOMotorDatabase:
    ok = await database.ensure_connected()
    if not ok:
        raise HTTPException(status_code=503, detail="Banco de dados indisponivel")
    return database.get_db()


@router.post("/perfil")
async def seed_perfil_route(db: AsyncIOMotorDatabase = Depends(get_db)):
    perfil = await seed_perfil(db)
    return {"message": "Perfil criado com sucesso", "perfil": perfil.model_dump()}
