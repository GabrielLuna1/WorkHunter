from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.categoria_vaga import CategoriaVaga, CategoriaUpdate
from core.logger import logger


COLECAO = "categorias_vaga"


DEFAULT_CATEGORIAS = [
    {
        "id": "tech",
        "label": "Tecnologia",
        "keywords_include": [
            "desenvolvedor",
            "developer",
            "front-end",
            "frontend",
            "back-end",
            "backend",
            "full stack",
            "fullstack",
            "react",
            "vue",
            "angular",
            "node",
            "python",
            "java",
            "javascript",
            "typescript",
            "devops",
            "data science",
            "machine learning",
            "engenheiro de software",
            "software engineer",
            "qa",
            "ux designer",
            "ui designer",
            "cloud",
            "aws",
            "kubernetes",
            "docker",
        ],
        "keywords_exclude": [],
        "score_bonus": 10,
        "cor": "#3b82f6",
        "ordem": 1,
    },
    {
        "id": "va",
        "label": "Virtual Assistant",
        "keywords_include": [
            "virtual assistant",
            "assistente virtual",
            "xactimate",
            "administrative assistant",
            "executive assistant",
            "personal assistant",
            "remote assistant",
            "office assistant",
            "call answering",
            "chat support",
            "data entry",
            "scheduling coordinator",
            "customer service",
            "customer support",
        ],
        "keywords_exclude": [
            "desenvolvedor",
            "developer",
            "software engineer",
            "engenheiro",
            "analista de sistemas",
            "ux designer",
            "data scientist",
        ],
        "score_bonus": 25,
        "cor": "#8b5cf6",
        "ordem": 2,
    },
    {
        "id": "admin",
        "label": "Administrativo",
        "keywords_include": [
            "administrativo",
            "assistente administrativo",
            "auxiliar administrativo",
            "rh",
            "recursos humanos",
            "secretaria",
            "recepcionista",
        ],
        "keywords_exclude": [
            "desenvolvedor",
            "developer",
            "software engineer",
        ],
        "score_bonus": 5,
        "cor": "#f59e0b",
        "ordem": 3,
    },
    {
        "id": "irrelevant",
        "label": "Irrelevante",
        "keywords_include": [
            "plumber",
            "baker",
            "arborist",
            "courier",
            "genetic counseling",
            "motorista",
            "porteiro",
            "zelador",
            "cozinheiro",
            "garcom",
            "vendedor",
            "cajero",
            "mexico",
            "santander",
            "online hotel",
            "reservations",
            "hotel booker",
            "recreation aide",
            "recreation specialist",
            "supply chain",
            "warehouse",
        ],
        "keywords_exclude": [],
        "score_bonus": -100,
        "cor": "#ef4444",
        "ordem": 99,
    },
]


class CategoriaService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self._cache: List[CategoriaVaga] | None = None

    async def get_all(self) -> List[CategoriaVaga]:
        docs = await self.db[COLECAO].find().sort("ordem", 1).to_list(length=100)
        return [CategoriaVaga(**d) for d in docs]

    async def get_ativas(self) -> List[CategoriaVaga]:
        docs = (
            await self.db[COLECAO]
            .find({"ativa": True})
            .sort("ordem", 1)
            .to_list(length=100)
        )
        return [CategoriaVaga(**d) for d in docs]

    async def get_by_id(self, cat_id: str) -> CategoriaVaga | None:
        doc = await self.db[COLECAO].find_one({"id": cat_id})
        return CategoriaVaga(**doc) if doc else None

    async def upsert(self, cat_id: str, data: CategoriaUpdate) -> CategoriaVaga:
        update = {k: v for k, v in data.model_dump().items() if v is not None}
        update["updated_at"] = __import__("datetime").datetime.utcnow()
        await self.db[COLECAO].update_one(
            {"id": cat_id},
            {"$set": update},
            upsert=True,
        )
        doc = await self.db[COLECAO].find_one({"id": cat_id})
        return CategoriaVaga(**doc)

    async def seed_defaults(self) -> int:
        existing = await self.db[COLECAO].count_documents({})
        if existing > 0:
            return 0
        for cat in DEFAULT_CATEGORIAS:
            cat["created_at"] = __import__("datetime").datetime.utcnow()
            cat["updated_at"] = cat["created_at"]
            await self.db[COLECAO].update_one(
                {"id": cat["id"]},
                {"$set": cat},
                upsert=True,
            )
        logger.info("categorias.seed_concluido", total=len(DEFAULT_CATEGORIAS))
        return len(DEFAULT_CATEGORIAS)

    async def delete(self, cat_id: str) -> bool:
        r = await self.db[COLECAO].delete_one({"id": cat_id})
        return r.deleted_count > 0
