import json
import re
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorDatabase
from core.logger import logger
from ai import client as ai_client


_EXTRACT_PROMPT = """VocÃª Ã© um analisador de currÃ­culos especializado em extrair perfis profissionais estruturados.

Com base no currÃ­culo abaixo, extraia UM OBJETO JSON com o seguinte schema (sem markdown, sem texto extra, apenas JSON):

{
  "nome": "",
  "email": "",
  "telefone": "",
  "cidade": "",
  "estado": "",
  "pais": "",
  "linkedin": "",
  "github": "",
  "portfolio": "",
  "titulo_profissional": "",
  "senioridade": "junior|pleno|senior|especialista",
  "anos_experiencia": 0,
  "total_empresas": 0,
  "tempo_total_experiencia": "",
  "stack_principal": ["React", "Node.js"],
  "skills": {
    "frontend": [],
    "backend": [],
    "database": [],
    "cloud": [],
    "devops": [],
    "mobile": [],
    "ia": [],
    "outros": []
  },
  "idiomas": [
    {"nome": "InglÃªs", "nivel": "IntermediÃ¡rio"}
  ]
}

REGRAS:
- Use o tÃ­tulo/primeiro cargo das experiÃªncias como titulo_profissional.
- Senioridade: baseie-se em cargo atual, tempo total, complexidade dos projetos. Valores vÃ¡lidos: junior, pleno, senior, especialista.
- anos_experiencia: total de anos de carreira (estime por datas).
- total_empresas: nÃºmero de empresas distintas no histÃ³rico.
- stack_principal: as tecnologias MAIS RECORRENTES (mÃ¡ximo 6).
- skills: distribua as tecnologias detectadas nas categorias corretas.
- idiomas: extraia do campo de idiomas do currÃ­culo.
- Se um campo nÃ£o for encontrado, deixe vazio/0/[] (nunca null).

CURRÃCULO:
"""


def _parse_json(text: str) -> dict | None:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group())
    except json.JSONDecodeError:
        return None


def _extract_deterministic(curriculo: dict) -> dict:
    estruturado = curriculo.get("estruturado") or curriculo

    nome = estruturado.get("nome", "")
    email = estruturado.get("email", "")
    telefone = estruturado.get("telefone", "")
    cidade = estruturado.get("cidade", "")
    linkedin = estruturado.get("linkedin", "")
    github = estruturado.get("github", "")
    portfolio = estruturado.get("portfolio", "")

    experiencias = estruturado.get("experiencias", [])
    total_empresas = len(
        set(e.get("empresa", "") for e in experiencias if e.get("empresa"))
    )
    total_experiencias = len(experiencias)

    skills_raw = estruturado.get("skills", [])
    skills_flat = [s for s in skills_raw if isinstance(s, str)]

    cargo_atual = experiencias[0].get("cargo", "") if experiencias else ""

    return {
        "nome": nome,
        "email": email,
        "telefone": telefone,
        "cidade": cidade,
        "estado": "",
        "pais": "",
        "linkedin": linkedin,
        "github": github,
        "portfolio": portfolio,
        "titulo_profissional": cargo_atual,
        "senioridade": "",
        "anos_experiencia": 0,
        "total_empresas": total_empresas,
        "tempo_total_experiencia": "",
        "stack_principal": skills_flat[:6],
        "skills": _classify_skills(skills_flat),
        "idiomas": [
            {"nome": i.get("idioma", ""), "nivel": i.get("nivel", "")}
            for i in (estruturado.get("idiomas") or [])
        ],
    }


_KNOWN_FRONTEND = {
    "react",
    "next.js",
    "nextjs",
    "vue",
    "vue.js",
    "angular",
    "svelte",
    "html",
    "css",
    "javascript",
    "typescript",
    "tailwind",
    "bootstrap",
    "sass",
    "less",
    "webpack",
    "vite",
    "redux",
    "jquery",
    "ajax",
}
_KNOWN_BACKEND = {
    "node.js",
    "nodejs",
    "node",
    "python",
    "django",
    "flask",
    "fastapi",
    "java",
    "spring",
    "spring boot",
    "c#",
    "csharp",
    "asp.net",
    ".net",
    "go",
    "golang",
    "rust",
    "php",
    "laravel",
    "ruby",
    "rails",
    "express",
    "nestjs",
    "graphql",
    "rest",
    "api",
    "microservices",
}
_KNOWN_DATABASE = {
    "postgresql",
    "postgres",
    "mysql",
    "mariadb",
    "mongodb",
    "redis",
    "sqlite",
    "oracle",
    "sql server",
    "elasticsearch",
    "dynamodb",
    "firebase",
    "supabase",
    "prisma",
    "typeorm",
    "drizzle",
}
_KNOWN_CLOUD = {
    "aws",
    "azure",
    "gcp",
    "google cloud",
    "vercel",
    "netlify",
    "heroku",
    "digitalocean",
    "cloudflare",
    "s3",
    "lambda",
    "ec2",
    "cloud run",
}
_KNOWN_DEVOPS = {
    "docker",
    "kubernetes",
    "k8s",
    "ci/cd",
    "github actions",
    "gitlab ci",
    "jenkins",
    "terraform",
    "ansible",
    "nginx",
    "linux",
    "bash",
    "shell",
}
_KNOWN_MOBILE = {
    "react native",
    "flutter",
    "kotlin",
    "swift",
    "android",
    "ios",
    "dart",
    "kotlin multiplatform",
    "expo",
}
_KNOWN_IA = {
    "machine learning",
    "deep learning",
    "nlp",
    "ia",
    "inteligÃªncia artificial",
    "llm",
    "gpt",
    "openai",
    "langchain",
    "pytorch",
    "tensorflow",
    "scikit-learn",
    "pandas",
    "numpy",
    "rag",
    "vector database",
}


def _classify_skills(skills: list[str]) -> dict:
    classified = {
        "frontend": [],
        "backend": [],
        "database": [],
        "cloud": [],
        "devops": [],
        "mobile": [],
        "ia": [],
        "outros": [],
    }
    normalized = [s.lower().strip() for s in skills]
    for i, s in enumerate(normalized):
        original = skills[i]
        if s in _KNOWN_FRONTEND:
            classified["frontend"].append(original)
        elif s in _KNOWN_BACKEND:
            classified["backend"].append(original)
        elif s in _KNOWN_DATABASE:
            classified["database"].append(original)
        elif s in _KNOWN_CLOUD:
            classified["cloud"].append(original)
        elif s in _KNOWN_DEVOPS:
            classified["devops"].append(original)
        elif s in _KNOWN_MOBILE:
            classified["mobile"].append(original)
        elif s in _KNOWN_IA:
            classified["ia"].append(original)
        else:
            classified["outros"].append(original)
    return classified


async def extract_profile(curriculo: dict) -> dict:
    estruturado = curriculo.get("estruturado") or curriculo

    texto_bruto = estruturado.get("texto_bruto") or ""
    texto_para_llm = (
        texto_bruto[:6000]
        if texto_bruto
        else json.dumps(estruturado, ensure_ascii=False, default=str)[:6000]
    )

    profile = None

    if texto_para_llm.strip():
        messages = [
            {
                "role": "user",
                "content": _EXTRACT_PROMPT + "\n" + texto_para_llm,
            }
        ]
        try:
            result = await ai_client._call_with_retry(
                messages, temperature=0.1, max_tokens=2048, timeout=90
            )
            if result:
                parsed = _parse_json(result)
                if parsed and isinstance(parsed, dict):
                    profile = parsed
                    logger.info("profile.extraido_llm")
        except Exception as e:
            logger.warning("profile.erro_llm", error=str(e))

    if not profile:
        logger.info("profile.usando_fallback_deterministico")
        profile = _extract_deterministic(curriculo)

    profile.setdefault("nome", estruturado.get("nome", ""))
    profile.setdefault("email", estruturado.get("email", ""))
    profile.setdefault("telefone", estruturado.get("telefone", ""))
    profile.setdefault("cidade", estruturado.get("cidade", ""))
    profile.setdefault("linkedin", estruturado.get("linkedin", ""))
    profile.setdefault("github", estruturado.get("github", ""))
    profile.setdefault("portfolio", estruturado.get("portfolio", ""))

    return profile


async def extract_and_save_profile(
    user_id: str, curriculo: dict, db: AsyncIOMotorDatabase
) -> dict:
    profile_data = await extract_profile(curriculo)

    estruturado = curriculo.get("estruturado") or curriculo
    curriculo_id = str(curriculo.get("_id", ""))

    doc = {
        "user_id": user_id,
        "nome": profile_data.get("nome", ""),
        "email": profile_data.get("email", ""),
        "telefone": profile_data.get("telefone", ""),
        "cidade": profile_data.get("cidade", ""),
        "estado": profile_data.get("estado", ""),
        "pais": profile_data.get("pais", ""),
        "linkedin": profile_data.get("linkedin", ""),
        "github": profile_data.get("github", ""),
        "portfolio": profile_data.get("portfolio", ""),
        "titulo_profissional": profile_data.get("titulo_profissional", ""),
        "senioridade": profile_data.get("senioridade", ""),
        "anos_experiencia": profile_data.get("anos_experiencia", 0),
        "total_empresas": profile_data.get("total_empresas", 0),
        "tempo_total_experiencia": profile_data.get("tempo_total_experiencia", ""),
        "stack_principal": profile_data.get("stack_principal", []),
        "skills": profile_data.get("skills", {}),
        "idiomas": profile_data.get("idiomas", []),
        "curriculo_ativo_id": curriculo_id,
        "updated_at": datetime.utcnow(),
    }

    await db["profiles"].update_one(
        {"user_id": user_id},
        {"$set": doc},
        upsert=True,
    )

    logger.info("profile.salvo", user_id=user_id)
    return doc
