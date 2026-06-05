from fastapi import APIRouter
from api.vagas import router as vagas_router
from api.sistema import router as sistema_router
from api.analise import router as analise_router
from api.perfil import router as perfil_router
from api.candidaturas import router as candidaturas_router
from api.seed import router as seed_router
from api.analytics import router as analytics_router
from api.resume import router as resume_router
from api.vagas_usuarios import router as vagas_usuarios_router
from api.pipeline import router as pipeline_router
from api.eventos import router as eventos_router
from api.ai import router as ai_router
from api.notifications import router as notifications_router
from api.categorias import router as categorias_router
from api.profile_extraction import router as profile_extraction_router

router = APIRouter()
router.include_router(categorias_router, prefix="/categorias", tags=["Categorias"])
router.include_router(vagas_router, prefix="/vagas", tags=["Vagas"])
router.include_router(sistema_router, prefix="/sistema", tags=["Sistema"])
router.include_router(analise_router, prefix="/analise", tags=["AnÃ¡lise"])
router.include_router(perfil_router, prefix="/perfil", tags=["Perfil"])
router.include_router(
    candidaturas_router, prefix="/candidaturas", tags=["Candidaturas"]
)
router.include_router(seed_router, prefix="/seed", tags=["Seed"])
router.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
router.include_router(resume_router, prefix="/curriculo", tags=["CurrÃ­culo"])
router.include_router(
    vagas_usuarios_router, prefix="/vagas-usuarios", tags=["Vagas UsuÃ¡rio"]
)
router.include_router(pipeline_router, prefix="/pipeline", tags=["Pipeline"])
router.include_router(eventos_router, prefix="/eventos", tags=["Eventos"])
router.include_router(ai_router, prefix="/ai")
router.include_router(
    notifications_router, prefix="/notifications", tags=["NotificaÃ§Ãµes"]
)
router.include_router(
    profile_extraction_router, prefix="/profile-extraction", tags=["Perfil ExtraÃ§Ã£o"]
)
