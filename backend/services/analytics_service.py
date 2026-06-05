from motor.motor_asyncio import AsyncIOMotorDatabase


class AnalyticsService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db
        self.vagas = db["vagas"]

    async def stacks_mais_pedidas(self, limit: int = 15) -> list[dict]:
        pipeline = [
            {"$match": {"analise_ia.stack_principal": {"$exists": True, "$ne": None}}},
            {"$unwind": "$analise_ia.stack_principal"},
            {"$group": {"_id": "$analise_ia.stack_principal", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": limit},
        ]
        return await self.vagas.aggregate(pipeline).to_list(length=limit)

    async def media_salarial_por_stack(self, limit: int = 15) -> list[dict]:
        pipeline = [
            {"$match": {"analise_ia.salario_estimado_min": {"$ne": None}}},
            {"$unwind": "$analise_ia.stack_principal"},
            {"$group": {
                "_id": "$analise_ia.stack_principal",
                "count": {"$sum": 1},
                "salario_medio_min": {"$avg": "$analise_ia.salario_estimado_min"},
                "salario_medio_max": {"$avg": "$analise_ia.salario_estimado_max"},
            }},
            {"$match": {"count": {"$gte": 2}}},
            {"$sort": {"salario_medio_min": -1}},
            {"$limit": limit},
        ]
        return await self.vagas.aggregate(pipeline).to_list(length=limit)

    async def vagas_por_fonte(self) -> list[dict]:
        pipeline = [
            {"$group": {"_id": "$fonte", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        return await self.vagas.aggregate(pipeline).to_list(length=20)

    async def vagas_por_senioridade(self) -> list[dict]:
        pipeline = [
            {"$match": {"analise.nivel_estimado": {"$ne": None}}},
            {"$group": {"_id": "$analise.nivel_estimado", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        return await self.vagas.aggregate(pipeline).to_list(length=10)

    async def vagas_por_dia(self, dias: int = 30) -> list[dict]:
        from datetime import datetime, timedelta
        since = datetime.utcnow() - timedelta(days=dias)
        pipeline = [
            {"$match": {"coletada_em": {"$gte": since}}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$coletada_em"}},
                "count": {"$sum": 1},
            }},
            {"$sort": {"_id": 1}},
        ]
        return await self.vagas.aggregate(pipeline).to_list(length=dias)

    async def score_por_fonte(self) -> list[dict]:
        pipeline = [
            {"$match": {"score": {"$exists": True}}},
            {"$group": {
                "_id": "$fonte",
                "count": {"$sum": 1},
                "score_medio": {"$avg": "$score"},
                "score_max": {"$max": "$score"},
            }},
            {"$sort": {"score_medio": -1}},
        ]
        return await self.vagas.aggregate(pipeline).to_list(length=20)

    async def skills_populares(self, limit: int = 15) -> list[dict]:
        pipeline = [
            {"$match": {"analise_ia.skills_requeridas": {"$exists": True, "$ne": None}}},
            {"$unwind": "$analise_ia.skills_requeridas"},
            {"$group": {"_id": "$analise_ia.skills_requeridas", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": limit},
        ]
        return await self.vagas.aggregate(pipeline).to_list(length=limit)

    async def overview(self) -> dict:
        total = await self.vagas.count_documents({})
        fake_junior = await self.vagas.count_documents({"analise.fake_junior": True})
        score_medio = await self.vagas.aggregate([
            {"$group": {"_id": None, "media": {"$avg": "$score"}}}
        ]).to_list(length=1)
        score_medio_val = round(score_medio[0]["media"], 1) if score_medio else 0

        alertas = await self.vagas.find(
            {"score": {"$gte": 85}, "ativa": True}
        ).sort("score", -1).limit(10).to_list(length=10)

        return {
            "total_vagas": total,
            "fake_junior_count": fake_junior,
            "score_medio": score_medio_val,
            "alertas": [
                {
                    "id": str(v["_id"]),
                    "titulo": v["titulo"],
                    "empresa": v["empresa"],
                    "score": v.get("score", 50),
                    "url": v["url"],
                }
                for v in alertas
            ],
        }
