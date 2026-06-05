from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from core.config import settings
from core.logger import logger


class Database:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None
    _connected: bool = False

    async def connect(self) -> None:
        try:
            self.client = AsyncIOMotorClient(
                settings.mongodb_uri,
                serverSelectionTimeoutMS=3000,
            )
            self.db = self.client.get_default_database()
            await self._create_indexes()
            self._connected = True
            logger.info("database.conectado")
        except Exception as e:
            logger.warning("database.erro_conexao", error=str(e))
            self._connected = False

    async def _create_indexes(self) -> None:
        try:
            vagas = self.db["vagas"]
            await vagas.create_index("hash", unique=True)
            await vagas.create_index("fonte")
            await vagas.create_index("data_publicacao")
            await vagas.create_index("score")
            await vagas.create_index(["fonte", "id_externo"], unique=True)
            vu = self.db["vagas_usuarios"]
            await vu.create_index(["user_id", "vaga_id"], unique=True)
            await vu.create_index("vaga_id")
            pipe = self.db["pipeline"]
            await pipe.create_index(["user_id", "vaga_id"], unique=True)
            await pipe.create_index("etapa")
            await pipe.create_index("updated_at")
            ev = self.db["eventos"]
            await ev.create_index(["user_id", "pipeline_id"], unique=True, sparse=True)
            await ev.create_index("data_inicio")
            cs = self.db["chat_sessoes"]
            await cs.create_index("user_id")
            await cs.create_index(["user_id", "updated_at"])
            cm = self.db["chat_mensagens"]
            await cm.create_index("sessao_id")
            await cm.create_index(["sessao_id", "created_at"])
            va = self.db["vaga_analysis"]
            await va.create_index(["vaga_id", "user_id"], unique=True)
            mr = self.db["match_results"]
            await mr.create_index(["vaga_id", "user_id"], unique=True)
            cv = self.db["curriculo_versoes"]
            await cv.create_index(["vaga_id", "user_id", "versao"])
            pf = self.db["profiles"]
            await pf.create_index("user_id", unique=True)
            logger.info("database.indexes_criados")
        except Exception as e:
            logger.warning("database.erro_indexes", error=str(e))

    async def ensure_connected(self) -> bool:
        if self._connected and self.db is not None:
            try:
                await self.client.admin.command("ping")
                return True
            except Exception:
                self._connected = False
        if not self._connected:
            await self.connect()
        return self._connected

    async def close(self) -> None:
        if self.client:
            self.client.close()
            self._connected = False

    def get_db(self) -> AsyncIOMotorDatabase:
        if self.db is None:
            raise RuntimeError("Database not initialized")
        return self.db

    @property
    def is_connected(self) -> bool:
        return self._connected


database = Database()


async def get_db():
    return database.get_db()
