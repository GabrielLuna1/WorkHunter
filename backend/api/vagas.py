from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson.objectid import ObjectId
from core.database import database
from core.logger import logger
from models.vaga import VagaResponse, VagaListaResponse
from services.categoria_service import CategoriaService

router = APIRouter()

USER_ID = "default"


async def get_db() -> AsyncIOMotorDatabase:
    ok = await database.ensure_connected()
    if not ok:
        raise HTTPException(status_code=503, detail="Banco de dados indisponivel")
    return database.get_db()


CAMPOS_ORDENACAO = {
    "coletada_em",
    "score",
    "salario_min",
    "salario_max",
    "empresa",
    "titulo",
    "data_publicacao",
}


@router.get("/", response_model=VagaListaResponse)
async def listar_vagas(
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
    fonte: Optional[str] = Query(None),
    ativa: Optional[bool] = Query(True),
    score_min: Optional[int] = Query(None, ge=0, le=100),
    score_max: Optional[int] = Query(None, ge=0, le=100),
    busca: Optional[str] = Query(None, max_length=200),
    status: Optional[str] = Query(None),
    modelo_trabalho: Optional[str] = Query(None),
    uf: Optional[list[str]] = Query(None),
    categoria: Optional[str] = Query(None),
    search_term: Optional[str] = Query(None, max_length=200),
    order_by: Optional[str] = Query("coletada_em"),
    order_dir: Optional[str] = Query("desc"),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    filtro: dict = {}
    or_conditions: list[dict] = []

    if fonte is not None:
        filtro["fonte"] = fonte
    if ativa is not None:
        filtro["ativa"] = ativa
    if modelo_trabalho is not None:
        filtro["modelo_trabalho"] = modelo_trabalho
    if uf is not None:
        uf_vals = [u.strip().upper() for u in uf if u.strip()]
        has_uf = [u for u in uf_vals if u != "REMOTO"]
        has_remoto = "REMOTO" in uf_vals
        if has_uf and has_remoto:
            filtro["$or"] = [{"uf": {"$in": has_uf}}, {"uf": None}]
        elif has_uf:
            filtro["uf"] = {"$in": has_uf}
        elif has_remoto:
            filtro["uf"] = None
    if score_min is not None or score_max is not None:
        score_filtro = {}
        if score_min is not None:
            score_filtro["$gte"] = score_min
        if score_max is not None:
            score_filtro["$lte"] = score_max
        filtro["score"] = score_filtro

    if categoria is not None:
        cat_service = CategoriaService(db)
        cat = await cat_service.get_by_id(categoria)
        if cat and cat.keywords_include:
            regex_terms = "|".join(cat.keywords_include)
            or_conditions.append(
                {
                    "$or": [
                        {"titulo": {"$regex": regex_terms, "$options": "i"}},
                        {"descricao": {"$regex": regex_terms, "$options": "i"}},
                    ]
                }
            )

    import re as _re

    if busca:
        pattern = _re.escape(busca)
        or_conditions.append(
            {
                "$or": [
                    {"titulo": {"$regex": pattern, "$options": "i"}},
                    {"empresa": {"$regex": pattern, "$options": "i"}},
                    {"descricao": {"$regex": pattern, "$options": "i"}},
                ]
            }
        )

    if search_term:
        pattern = _re.escape(search_term)
        filtro["termo_busca"] = {"$regex": pattern, "$options": "i"}

    if or_conditions:
        filtro["$and"] = or_conditions

    if order_by not in CAMPOS_ORDENACAO:
        order_by = "coletada_em"
    sort_dir = -1 if order_dir == "desc" else 1

    skip = (page - 1) * limit
    total = await db["vagas"].count_documents(filtro)

    cursor = db["vagas"].find(filtro).sort(order_by, sort_dir).skip(skip).limit(limit)
    vagas = await cursor.to_list(length=limit)

    vaga_ids = [str(v["_id"]) for v in vagas]
    status_map = {}
    if status or vaga_ids:
        status_filter: dict = {"user_id": USER_ID}
        if status:
            status_filter[status] = True
        if vaga_ids and not status:
            status_filter["vaga_id"] = {"$in": vaga_ids}
        status_docs = (
            await db["vagas_usuarios"].find(status_filter).to_list(length=len(vaga_ids))
        )
        for sd in status_docs:
            status_map[sd["vaga_id"]] = sd

    if status and vaga_ids:
        vaga_ids_com_status = set(status_map.keys())
        vagas = [v for v in vagas if str(v["_id"]) in vaga_ids_com_status]
        total = len(vaga_ids_com_status)

    data = []
    for v in vagas:
        vid = str(v["_id"])
        su = status_map.get(vid)
        usuario_status = None
        if su:
            usuario_status = {
                "favoritada": su.get("favoritada", False),
                "aplicada": su.get("aplicada", False),
                "salva": su.get("salva", False),
                "analisada": su.get("analisada", False),
                "ignorada": su.get("ignorada", False),
                "arquivada": su.get("arquivada", False),
            }
        data.append(_formatar(v, usuario_status))

    return VagaListaResponse(
        data=data,
        total=total,
        page=page,
        limit=limit,
        total_pages=max(1, (total + limit - 1) // limit),
    )


@router.get("/locais")
async def listar_locais(
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    ufs = await db["vagas"].distinct("uf", {"ativa": True})
    modelos = await db["vagas"].distinct("modelo_trabalho", {"ativa": True})

    uf_list = sorted(
        [u for u in ufs if u],
        key=lambda u: (-1 if u == "SP" else -2 if u == "RJ" else 0, u),
    )
    has_remoto = None in ufs
    return {
        "ufs": uf_list,
        "modelos_trabalho": sorted([m for m in modelos if m]),
        "possui_remoto": has_remoto,
    }


@router.get("/{vaga_id}", response_model=VagaResponse)
async def obter_vaga(
    vaga_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    vaga = await db["vagas"].find_one({"_id": ObjectId(vaga_id)})
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga nÃ£o encontrada")

    su = await db["vagas_usuarios"].find_one(
        {
            "user_id": USER_ID,
            "vaga_id": vaga_id,
        }
    )
    usuario_status = None
    if su:
        usuario_status = {
            "favoritada": su.get("favoritada", False),
            "aplicada": su.get("aplicada", False),
            "salva": su.get("salva", False),
            "analisada": su.get("analisada", False),
            "ignorada": su.get("ignorada", False),
            "arquivada": su.get("arquivada", False),
        }
    return _formatar(vaga, usuario_status)


def _formatar(v: dict, usuario_status: Optional[dict] = None) -> VagaResponse:
    return VagaResponse(
        id=str(v["_id"]),
        titulo=v["titulo"],
        empresa=v["empresa"],
        descricao=v["descricao"],
        localizacao=v.get("localizacao"),
        uf=v.get("uf"),
        modelo_trabalho=v.get("modelo_trabalho"),
        url=v["url"],
        fonte=v["fonte"],
        id_externo=v["id_externo"],
        salario_min=v.get("salario_min"),
        salario_max=v.get("salario_max"),
        tipo_contrato=v.get("tipo_contrato"),
        data_publicacao=v.get("data_publicacao"),
        score=v.get("score", 50),
        analise=v.get("analise"),
        analise_ia=v.get("analise_ia"),
        coletada_em=v["coletada_em"],
        ativa=v["ativa"],
        usuario_status=usuario_status,
    )
