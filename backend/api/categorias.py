from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from core.database import database
from models.categoria_vaga import CategoriaVaga, CategoriaUpdate
from services.categoria_service import CategoriaService

router = APIRouter()


async def get_db() -> AsyncIOMotorDatabase:
    ok = await database.ensure_connected()
    if not ok:
        raise HTTPException(status_code=503, detail="Banco indisponivel")
    return database.get_db()


@router.get("/")
async def listar_categorias(db: AsyncIOMotorDatabase = Depends(get_db)):
    svc = CategoriaService(db)
    return await svc.get_all()


@router.get("/ativas")
async def categorias_ativas(db: AsyncIOMotorDatabase = Depends(get_db)):
    svc = CategoriaService(db)
    return await svc.get_ativas()


@router.put("/{cat_id}")
async def atualizar_categoria(
    cat_id: str, data: CategoriaUpdate, db: AsyncIOMotorDatabase = Depends(get_db)
):
    svc = CategoriaService(db)
    return await svc.upsert(cat_id, data)


@router.get("/seed")
async def seed_categorias(db: AsyncIOMotorDatabase = Depends(get_db)):
    svc = CategoriaService(db)
    criadas = await svc.seed_defaults()
    return {"criadas": criadas, "status": "ok"}


@router.delete("/{cat_id}")
async def deletar_categoria(cat_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    svc = CategoriaService(db)
    ok = await svc.delete(cat_id)
    if not ok:
        raise HTTPException(404, "Categoria nao encontrada")
    return {"deleted": True}
