import asyncio
import os
import tempfile
import json
from datetime import datetime
from typing import Any
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

from services.curriculo_service import (
    buscar_curriculo_ativo,
    listar_versoes,
    restaurar_versao,
    atualizar_versao,
    deletar_versao,
    duplicar_versao,
    renomear_versao,
    processar_curriculo,
)
from services.curriculo_export import generate_pdf, generate_docx
from core.database import database

router = APIRouter(tags=["curriculo"])


def _serialize(doc: Any) -> Any:
    if isinstance(doc, datetime):
        return doc.isoformat()
    if isinstance(doc, dict):
        return {k: _serialize(v) for k, v in doc.items()}
    if isinstance(doc, list):
        return [_serialize(v) for v in doc]
    return doc


# Fields to exclude from regular GET responses (heavy/internal)
_EXCLUDE_FIELDS = {"texto_bruto", "arquivo_original_path"}


def _slim(doc: dict) -> dict:
    """Remove heavy fields from response to keep payloads lean."""
    return {k: v for k, v in doc.items() if k not in _EXCLUDE_FIELDS}


ALLOWED_EXTENSIONS = {".pdf"}
MAX_FILE_SIZE_MB = 10


UPLOAD_DIR = Path(__file__).parent.parent / "uploads" / "curriculos"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_curriculo(file: UploadFile = File(...)):
    filename = file.filename or "curriculo.pdf"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato nÃ£o suportado: {ext}. Envie apenas arquivos PDF.",
        )

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo muito grande: {size_mb:.1f}MB. MÃ¡ximo: {MAX_FILE_SIZE_MB}MB.",
        )

    # Save to temp and parse immediately (fast, no AI)
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    from services.resume_parser import parse_resume
    from services.curriculo_service import (
        salvar_curriculo,
        atualizar_status_processamento,
    )
    from services.profile_extractor import extract_and_save_profile
    import shutil

    curriculo = await parse_resume(tmp_path)

    # Create document with full parsed data
    doc = await salvar_curriculo(curriculo)

    # Move file to permanent location
    perm_filename = f"{doc['_id']}{ext}"
    perm_path = UPLOAD_DIR / perm_filename
    shutil.move(tmp_path, perm_path)

    # Update file path and mark as processing for profile extraction
    await atualizar_versao(doc["_id"], {"arquivo_original_path": str(perm_path)})
    await atualizar_status_processamento(
        doc["_id"], True, "Extraindo perfil profissional..."
    )

    # Refresh doc after updates
    doc_completo = await buscar_curriculo_ativo()

    # Background: only profile extraction (slow AI part)
    async def extrair_perfil():
        try:
            doc_atual = await buscar_curriculo_ativo()
            if doc_atual:
                doc_atual["_id"] = doc_atual.get("_id", doc["_id"])
                await extract_and_save_profile("default", doc_atual, database.get_db())
            await atualizar_status_processamento(doc["_id"], False, "concluido")
        except Exception:
            from core.logger import logger

            logger.error("curriculo.extrair_perfil_erro", doc_id=doc["_id"])
            await atualizar_status_processamento(
                doc["_id"], False, "erro na extracao de perfil"
            )

    asyncio.create_task(extrair_perfil())

    return JSONResponse(
        content={"success": True, "data": _serialize(_slim(doc_completo or doc))}
    )


@router.get("/")
async def get_curriculo():
    doc = await buscar_curriculo_ativo()
    if not doc:
        return JSONResponse(content={"data": None})
    return JSONResponse(content={"data": _serialize(_slim(doc))})


@router.get("/versoes")
async def get_versoes():
    versoes = await listar_versoes()
    return JSONResponse(content={"data": _serialize(versoes)})


from fastapi.responses import FileResponse


@router.get("/{versao_id}/file")
async def get_curriculo_file(versao_id: str):
    from core.database import database
    from bson import ObjectId

    collection = database.get_db()["curriculo_versoes"]
    doc = await collection.find_one({"_id": ObjectId(versao_id)})
    if not doc or not doc.get("arquivo_original_path"):
        raise HTTPException(status_code=404, detail="Arquivo original nÃ£o encontrado.")

    file_path = doc["arquivo_original_path"]
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404, detail="Arquivo original nÃ£o encontrado no disco."
        )

    return FileResponse(file_path)


class RenomearBody(BaseModel):
    nome: str


@router.put("/{versao_id}")
async def update_curriculo(versao_id: str, dados: dict):
    doc = await atualizar_versao(versao_id, dados)
    if not doc:
        raise HTTPException(status_code=404, detail="VersÃ£o nÃ£o encontrada.")
    return JSONResponse(content={"success": True, "data": _serialize(_slim(doc))})


@router.post("/versoes/{versao_id}/restaurar")
async def restaurar(versao_id: str):
    doc = await restaurar_versao(versao_id)
    if not doc:
        raise HTTPException(status_code=404, detail="VersÃ£o nÃ£o encontrada.")
    return JSONResponse(content={"success": True, "data": _serialize(_slim(doc))})


@router.delete("/versoes/{versao_id}")
async def deletar(versao_id: str):
    ok = await deletar_versao(versao_id)
    if not ok:
        raise HTTPException(status_code=404, detail="VersÃ£o nÃ£o encontrada.")
    return JSONResponse(content={"success": True})


@router.post("/versoes/{versao_id}/duplicar")
async def duplicar(versao_id: str):
    doc = await duplicar_versao(versao_id)
    if not doc:
        raise HTTPException(status_code=404, detail="VersÃ£o nÃ£o encontrada.")
    return JSONResponse(content={"success": True, "data": _serialize(_slim(doc))})


@router.put("/versoes/{versao_id}/renomear")
async def renomear(versao_id: str, body: RenomearBody):
    doc = await renomear_versao(versao_id, body.nome)
    if not doc:
        raise HTTPException(status_code=404, detail="VersÃ£o nÃ£o encontrada.")
    return JSONResponse(content={"success": True, "data": _serialize(_slim(doc))})


@router.post("/versoes/{versao_id}/set-padrao")
async def set_padrao(versao_id: str):
    doc = await restaurar_versao(versao_id)
    if not doc:
        raise HTTPException(status_code=404, detail="VersÃ£o nÃ£o encontrada.")
    return JSONResponse(content={"success": True, "data": _serialize(_slim(doc))})


@router.get("/{versao_id}/parsing-report")
async def get_parsing_report(versao_id: str):
    """Returns parsing metadata for a specific resume version."""
    collection = database.get_db()["curriculo_versoes"]
    from bson import ObjectId

    doc = await collection.find_one(
        {"_id": ObjectId(versao_id)},
        {
            "idioma_detectado": 1,
            "parsing_confidence": 1,
            "parsing_warnings": 1,
            "total_secoes_detectadas": 1,
            "fonte_arquivo": 1,
        },
    )
    if not doc:
        raise HTTPException(status_code=404, detail="VersÃ£o nÃ£o encontrada.")
    doc["_id"] = str(doc["_id"])
    return JSONResponse(content={"data": _serialize(doc)})


@router.get("/{versao_id}/export")
async def export_curriculo(
    versao_id: str,
    formato: str = Query("pdf", regex="^(pdf|docx)$"),
):
    collection = database.get_db()["curriculo_versoes"]
    from bson import ObjectId

    doc = await collection.find_one({"_id": ObjectId(versao_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="VersÃ£o nÃ£o encontrada.")

    versao_label = doc.get("nome_versao") or f"v{doc.get('versao', '?')}"

    if formato == "pdf":
        pdf_bytes = generate_pdf(doc, versao_label)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="curriculo.pdf"'},
        )
    else:
        docx_bytes = generate_docx(doc, versao_label)
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="curriculo.docx"'},
        )
