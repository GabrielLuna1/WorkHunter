from datetime import datetime
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson.objectid import ObjectId
from core.logger import logger
from models.pipeline import PipelineDB, HistoricoEtapa, ETAPAS_PIPELINE, ETAPAS_REJEICAO


class PipelineService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db
        self.collection = db["pipeline"]

    async def criar(
        self,
        vaga_id: str,
        user_id: str = "default",
        etapa: str = "salva",
        curriculo_versao_id: Optional[str] = None,
    ) -> Optional[PipelineDB]:
        vaga = await self.db["vagas"].find_one({"_id": ObjectId(vaga_id)})
        if not vaga:
            return None

        existente = await self.collection.find_one(
            {"user_id": user_id, "vaga_id": vaga_id}
        )
        if existente:
            existente["id"] = str(existente["_id"])
            return PipelineDB(**existente)

        historico = [HistoricoEtapa(etapa=etapa)]
        dados = {
            "user_id": user_id,
            "vaga_id": vaga_id,
            "vaga_titulo": vaga.get("titulo", ""),
            "empresa": vaga.get("empresa", ""),
            "fonte": vaga.get("fonte", ""),
            "score": vaga.get("score", 50),
            "url": vaga.get("url", ""),
            "etapa": etapa,
            "curriculo_versao_id": curriculo_versao_id,
            "aplicada_em": datetime.utcnow() if etapa == "aplicada" else None,
            "historico": [h.model_dump() for h in historico],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        result = await self.collection.insert_one(dados)
        dados["_id"] = result.inserted_id
        logger.info("pipeline.criado", vaga=vaga.get("titulo"), etapa=etapa)

        if etapa == "aplicada":
            await self.db["vagas_usuarios"].update_one(
                {"user_id": user_id, "vaga_id": vaga_id},
                {"$set": {"aplicada": True, "updated_at": datetime.utcnow()}},
                upsert=True,
            )

        return self._format(dados)

    async def listar(
        self, etapa: Optional[str] = None, user_id: str = "default"
    ) -> list[dict]:
        filtro = {"user_id": user_id}
        if etapa:
            filtro["etapa"] = etapa

        sort_stage = {"$sort": {"updated_at": -1}}
        pipeline_stages: list[dict] = [{"$match": filtro}, sort_stage]
        docs = await self.collection.aggregate(pipeline_stages).to_list(length=200)
        return [self._format(d) for d in docs]

    async def avancar_etapa(
        self, pipeline_id: str, nova_etapa: str, observacao: Optional[str] = None
    ) -> Optional[dict]:
        doc = await self.collection.find_one({"_id": ObjectId(pipeline_id)})
        if not doc:
            return None

        etapa_atual = doc.get("etapa", "")
        if etapa_atual in ETAPAS_REJEICAO:
            logger.warning(
                "pipeline.etapa_invalida", atual=etapa_atual, tentativa=nova_etapa
            )
            return None

        update: dict = {
            "etapa": nova_etapa,
            "updated_at": datetime.utcnow(),
        }
        if nova_etapa == "aplicada" and not doc.get("aplicada_em"):
            update["aplicada_em"] = datetime.utcnow()

        historico_entry = HistoricoEtapa(etapa=nova_etapa, observacao=observacao)
        await self.collection.update_one(
            {"_id": ObjectId(pipeline_id)},
            {
                "$set": update,
                "$push": {"historico": historico_entry.model_dump()},
            },
        )

        doc = await self.collection.find_one({"_id": ObjectId(pipeline_id)})
        logger.info(
            "pipeline.avancado", id=pipeline_id, de=etapa_atual, para=nova_etapa
        )
        return self._format(doc) if doc else None

    async def atualizar(self, pipeline_id: str, dados: dict) -> Optional[dict]:
        campos_permitidos = {
            "notas",
            "proxima_acao",
            "proxima_data",
            "curriculo_gerado",
            "curriculo_path",
            "curriculo_versao_id",
        }
        update = {k: v for k, v in dados.items() if k in campos_permitidos}
        if not update:
            return None
        update["updated_at"] = datetime.utcnow()

        await self.collection.update_one(
            {"_id": ObjectId(pipeline_id)},
            {"$set": update},
        )
        doc = await self.collection.find_one({"_id": ObjectId(pipeline_id)})
        return self._format(doc) if doc else None

    async def deletar(self, pipeline_id: str) -> bool:
        result = await self.collection.delete_one({"_id": ObjectId(pipeline_id)})
        if result.deleted_count == 0:
            return False

        # Remove eventos de calendÃ¡rio vinculados a este pipeline
        delete_events = await self.db["eventos"].delete_many(
            {"pipeline_id": pipeline_id}
        )
        if delete_events.deleted_count > 0:
            logger.info(
                "pipeline.eventos_removidos",
                pipeline_id=pipeline_id,
                total=delete_events.deleted_count,
            )

        logger.info("pipeline.deletado", id=pipeline_id)
        return True

    async def listar_por_curriculo(self, curriculo_versao_id: str) -> list[dict]:
        docs = (
            await self.collection.find({"curriculo_versao_id": curriculo_versao_id})
            .sort("updated_at", -1)
            .to_list(length=50)
        )
        return [self._format(d) for d in docs]

    async def estatisticas(self, user_id: str = "default") -> dict:
        pipeline_agg = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": "$etapa", "count": {"$sum": 1}}},
        ]
        results = await self.collection.aggregate(pipeline_agg).to_list(length=20)
        stats: dict[str, int] = {r["_id"]: r["count"] for r in results}

        total = sum(stats.values())
        contratado = stats.get("contratado", 0)
        rejeitado = stats.get("rejeitado", 0)

        return {
            **{e: stats.get(e, 0) for e in ETAPAS_PIPELINE},
            "rejeitado": rejeitado,
            "total": total,
            "taxa_conversao": round((contratado / total * 100), 1) if total > 0 else 0,
            "taxa_rejeicao": round((rejeitado / total * 100), 1) if total > 0 else 0,
        }

    def _format(self, doc: dict) -> dict:
        return {
            "id": str(doc["_id"]),
            "vaga_id": doc.get("vaga_id", ""),
            "vaga_titulo": doc.get("vaga_titulo", ""),
            "empresa": doc.get("empresa", ""),
            "fonte": doc.get("fonte", ""),
            "score": doc.get("score", 50),
            "url": doc.get("url", ""),
            "etapa": doc.get("etapa", "salva"),
            "curriculo_gerado": doc.get("curriculo_gerado", False),
            "curriculo_path": doc.get("curriculo_path"),
            "curriculo_versao_id": doc.get("curriculo_versao_id"),
            "aplicada_em": doc.get("aplicada_em"),
            "notas": doc.get("notas", ""),
            "proxima_acao": doc.get("proxima_acao"),
            "proxima_data": doc.get("proxima_data"),
            "created_at": doc.get("created_at"),
            "updated_at": doc.get("updated_at"),
            "historico": doc.get("historico", []),
        }
