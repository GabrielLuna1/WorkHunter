from motor.motor_asyncio import AsyncIOMotorDatabase
from models.perfil_usuario import (
    PerfilUsuario,
    StackItem,
    ExperienciaItem,
    EducacaoItem,
    ProjetoItem,
    CertificadoItem,
)


PERFIL_EXEMPLO = PerfilUsuario(
    nome="Gabriel Luna",
    email="gabriellunajob@gmail.com",
    telefone="",
    cidade="",
    linkedin="",
    github="",
    resumo_profissional=(
        "Desenvolvedor Full Stack com experiÃªncia em React, Next.js, Node.js, Python e TypeScript. "
        "Focado em desenvolvimento web moderno, automaÃ§Ã£o e integraÃ§Ã£o com IA/LLMs."
    ),
    cargos_alvo=[
        "Desenvolvedor Frontend",
        "Desenvolvedor Full Stack",
        "Desenvolvedor Backend",
        "Engenheiro de Software",
        "React Developer",
        "Node.js Developer",
    ],
    area_foco=["frontend", "backend", "fullstack", "ia"],
    palavras_chave_busca=[
        "next.js",
        "react",
        "typescript",
        "python",
        "fastapi",
    ],
    stacks_atuais=[
        # Frontend
        StackItem(nome="Next.js", categoria="frontend"),
        StackItem(nome="React", categoria="frontend"),
        StackItem(nome="TypeScript", categoria="frontend"),
        StackItem(nome="Tailwind CSS", categoria="frontend"),
        StackItem(nome="JavaScript", categoria="frontend"),
        StackItem(nome="HTML5", categoria="frontend"),
        StackItem(nome="CSS3", categoria="frontend"),
        StackItem(nome="Framer Motion", categoria="frontend"),
        StackItem(nome="shadcn/ui", categoria="frontend"),
        StackItem(nome="Recharts", categoria="frontend"),
        StackItem(nome="Zustand", categoria="frontend"),
        StackItem(nome="React Leaflet", categoria="frontend"),
        # Backend
        StackItem(nome="Node.js", categoria="backend"),
        StackItem(nome="Express", categoria="backend"),
        StackItem(nome="Python", categoria="backend"),
        StackItem(nome="FastAPI", categoria="backend"),
        StackItem(nome="MongoDB", categoria="backend"),
        StackItem(nome="PostgreSQL", categoria="backend"),
        StackItem(nome="NextAuth.js", categoria="backend"),
        StackItem(nome="Redis", categoria="backend"),
        StackItem(nome="Celery", categoria="backend"),
        StackItem(nome="BeautifulSoup4", categoria="backend"),
        # AI/ML
        StackItem(nome="Ollama", categoria="ai_ml"),
        StackItem(nome="LM Studio", categoria="ai_ml"),
        StackItem(nome="LangChain", categoria="ai_ml"),
        StackItem(nome="ChromaDB", categoria="ai_ml"),
        StackItem(nome="Hugging Face", categoria="ai_ml"),
        StackItem(nome="Transformers", categoria="ai_ml"),
        StackItem(nome="Sentence-Transformers", categoria="ai_ml"),
        # DevOps
        StackItem(nome="Git", categoria="devops"),
        StackItem(nome="Docker", categoria="devops"),
        StackItem(nome="Docker Compose", categoria="devops"),
        StackItem(nome="VS Code", categoria="devops"),
        StackItem(nome="Cursor", categoria="devops"),
    ],
    stacks_aprendendo=[],
    experiencias=[],
    educacao=[],
    projetos=[],
    certificados=[],
    preferencias_localizacao=["remoto", "home office", "SÃ£o Paulo"],
    modelos_trabalho=["remoto"],
    pretensao_salarial_min=None,
    palavras_chave_evitar=[
        "marketing",
        "vendas",
        "comercial",
        "financeiro",
        "administrativo",
        "rh",
        "telemarketing",
    ],
)


async def seed_perfil(db: AsyncIOMotorDatabase) -> PerfilUsuario:
    await db["perfil_usuario"].delete_many({})
    doc = PERFIL_EXEMPLO.model_dump()
    await db["perfil_usuario"].insert_one(doc)
    return PERFIL_EXEMPLO
