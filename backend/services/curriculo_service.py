import asyncio
from datetime import datetime
from typing import Optional
from bson import ObjectId

from core.database import database
from models.curriculo_model import CurriculoSchema
from services.resume_parser import parse_resume
from services.profile_extractor import extract_and_save_profile


COLLECTION = "curriculo_versoes"


def _db():
    return database.get_db()


async def salvar_curriculo(
    curriculo: CurriculoSchema, user_id: str = "default"
) -> dict:
    """
    Upsert do currÃ­culo. Sempre mantÃ©m a versÃ£o anterior arquivada.
    """
    collection = _db()[COLLECTION]

    # Busca currÃ­culo existente para versionar
    existente = await collection.find_one({"user_id": user_id, "ativo": True})

    versao = 1
    if existente:
        versao = existente.get("versao", 1) + 1
        # Arquiva a versÃ£o anterior (soft)
        await collection.update_one(
            {"_id": existente["_id"]}, {"$set": {"ativo": False}}
        )

    doc = curriculo.model_dump()
    doc["user_id"] = user_id
    doc["versao"] = versao
    doc["ativo"] = True
    doc["processando"] = True
    doc["etapa_processamento"] = "salvo"
    doc["atualizado_em"] = datetime.utcnow()

    result = await collection.insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    return doc


async def atualizar_status_processamento(
    doc_id: str,
    processando: bool,
    etapa: str = "",
) -> None:
    collection = _db()[COLLECTION]
    update = {
        "$set": {
            "processando": processando,
            "etapa_processamento": etapa,
            "atualizado_em": datetime.utcnow(),
        }
    }
    await collection.update_one({"_id": ObjectId(doc_id)}, update)


async def processar_curriculo(
    doc_id: str, file_path: str, user_id: str = "default"
) -> None:
    """
    Processa currÃ­culo em background: parser â atualiza doc â extrai perfil.
    """
    try:
        await atualizar_status_processamento(doc_id, True, "Analisando documento...")
        curriculo = await parse_resume(file_path)
        await asyncio.sleep(0)

        await atualizar_status_processamento(doc_id, True, "Salvando dados...")
        collection = _db()[COLLECTION]
        dados = curriculo.model_dump()
        dados["processando"] = True
        dados["etapa_processamento"] = "salvando"
        await collection.update_one(
            {"_id": ObjectId(doc_id)},
            {"$set": dados},
        )

        await atualizar_status_processamento(
            doc_id, True, "Extraindo perfil profissional..."
        )
        doc = await collection.find_one({"_id": ObjectId(doc_id)})
        if doc:
            doc["_id"] = str(doc["_id"])
            await extract_and_save_profile(user_id, doc, _db())

        await atualizar_status_processamento(doc_id, False, "concluido")
    except Exception as e:
        from core.logger import logger

        logger.error("curriculo.processamento_erro", error=str(e), doc_id=doc_id)
        await atualizar_status_processamento(doc_id, False, f"erro: {e}")


async def buscar_curriculo_ativo(user_id: str = "default") -> dict | None:
    collection = _db()[COLLECTION]
    doc = await collection.find_one(
        {"user_id": user_id, "ativo": True}, sort=[("versao", -1)]
    )
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


async def listar_versoes(user_id: str = "default") -> list[dict]:
    collection = _db()[COLLECTION]
    cursor = collection.find(
        {"user_id": user_id},
        {
            "nome": 1,
            "versao": 1,
            "atualizado_em": 1,
            "ativo": 1,
            "fonte_arquivo": 1,
            "nome_versao": 1,
        },
    ).sort("versao", -1)
    versoes = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        versoes.append(doc)
    return versoes


async def restaurar_versao(versao_id: str, user_id: str = "default") -> dict | None:
    collection = _db()[COLLECTION]

    # Desativa a versÃ£o atual
    await collection.update_many(
        {"user_id": user_id, "ativo": True}, {"$set": {"ativo": False}}
    )

    # Ativa a versÃ£o solicitada
    result = await collection.update_one(
        {"_id": ObjectId(versao_id), "user_id": user_id},
        {"$set": {"ativo": True, "atualizado_em": datetime.utcnow()}},
    )

    if result.modified_count == 0:
        return None

    return await buscar_curriculo_ativo(user_id)


async def atualizar_versao(
    versao_id: str, dados: dict, user_id: str = "default"
) -> dict | None:
    """
    Atualiza campos de uma versÃ£o especÃ­fica.
    `dados` pode conter qualquer campo editÃ¡vel do currÃ­culo.
    """
    collection = _db()[COLLECTION]
    dados["atualizado_em"] = datetime.utcnow()

    # Remove campos que nÃ£o devem ser alterados via update
    dados.pop("_id", None)
    dados.pop("user_id", None)
    dados.pop("versao", None)
    dados.pop("ativo", None)
    dados.pop("criado_em", None)

    from pymongo import ReturnDocument

    result = await collection.find_one_and_update(
        {"_id": ObjectId(versao_id), "user_id": user_id},
        {"$set": dados},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        return None
    result["_id"] = str(result["_id"])
    return result


async def deletar_versao(versao_id: str, user_id: str = "default") -> bool:
    """Remove permanentemente uma versÃ£o."""
    db = _db()
    collection = db[COLLECTION]
    doc = await collection.find_one({"_id": ObjectId(versao_id), "user_id": user_id})
    if not doc:
        return False

    foi_ativa = doc.get("ativo", False)
    await collection.delete_one({"_id": ObjectId(versao_id)})

    # Se nÃ£o restam versÃµes apÃ³s a exclusÃ£o, limpa dados derivados
    restam = await collection.count_documents({"user_id": user_id})
    if restam == 0:
        await db["profiles"].delete_many({"user_id": user_id})
        await db["curriculos"].delete_many({"user_id": user_id})
        await db["perfil_usuario"].delete_many({"user_id": user_id})

    if foi_ativa and restam > 0:
        restante = collection.find({"user_id": user_id}).sort("versao", -1).limit(1)
        async for r in restante:
            await collection.update_one({"_id": r["_id"]}, {"$set": {"ativo": True}})
    return True


async def duplicar_versao(versao_id: str, user_id: str = "default") -> dict | None:
    """Duplica uma versÃ£o existente com nova versÃ£o."""
    collection = _db()[COLLECTION]
    original = await collection.find_one(
        {"_id": ObjectId(versao_id), "user_id": user_id}
    )
    if not original:
        return None

    # Pega maior versao atual
    ultima = (
        await collection.find({"user_id": user_id})
        .sort("versao", -1)
        .limit(1)
        .to_list(1)
    )
    nova_versao = (ultima[0]["versao"] + 1) if ultima else 1

    original.pop("_id", None)
    original["versao"] = nova_versao
    original["ativo"] = False
    original["criado_em"] = datetime.utcnow()
    original["atualizado_em"] = datetime.utcnow()
    original["nome_versao"] = (
        f"CÃ³pia de {original.get('nome_versao') or f'v{nova_versao - 1}'}"
    )

    result = await collection.insert_one(original)
    original["_id"] = str(result.inserted_id)
    return original


async def renomear_versao(
    versao_id: str, novo_nome: str, user_id: str = "default"
) -> dict | None:
    """Renomeia uma versÃ£o."""
    collection = _db()[COLLECTION]
    from pymongo import ReturnDocument

    result = await collection.find_one_and_update(
        {"_id": ObjectId(versao_id), "user_id": user_id},
        {"$set": {"nome_versao": novo_nome, "atualizado_em": datetime.utcnow()}},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        return None
    result["_id"] = str(result["_id"])
    return result
