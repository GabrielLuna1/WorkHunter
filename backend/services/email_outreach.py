import re
from typing import Optional
from core.logger import logger
from core.config import settings
import httpx


SYSTEM_REPO_URL = "https://github.com/GabrielLuna1/Work-Plus"


def extrair_email_da_descricao(descricao: str) -> Optional[str]:
    pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    emails = re.findall(pattern, descricao or "")
    if emails:
        return emails[0]
    return None


async def gerar_email_outreach(
    perfil: dict,
    vaga: dict,
    otimizacao: Optional[dict] = None,
) -> Optional[dict]:
    nome = perfil.get("nome", "Candidato")
    vaga_titulo = vaga.get("titulo", "")
    empresa = vaga.get("empresa", "")
    stacks = ", ".join(s["nome"] for s in perfil.get("stacks_atuais", []))
    resumo = (
        otimizacao.get("resumo_otimizado")
        if otimizacao
        else perfil.get("resumo_profissional", "")
    )

    prompt = (
        "VocÃª Ã© um especialista em outreach profissional para oportunidades de tecnologia. "
        "Gere um email de apresentaÃ§Ã£o para o recrutador responsÃ¡vel pela vaga abaixo.\n\n"
        "REGRAS:\n"
        "1. Tom profissional, educado e confiante.\n"
        "2. Mencione o nome do candidato e seu resumo profissional.\n"
        "3. Explique POR QUE o candidato Ã© uma boa opÃ§Ã£o para a vaga (baseado nas skills reais).\n"
        "4. CRUCIAL: Mencione que o candidato desenvolveu um sistema prÃ³prio de busca e "
        "anÃ¡lise de vagas, compartilhe o link do repositÃ³rio do projeto para "
        "demonstrar competÃªncia tÃ©cnica.\n"
        "5. PeÃ§a gentilmente um retorno ou entrevista.\n"
        "6. NÃƒO minta. Use apenas informaÃ§Ãµes reais do perfil.\n"
        "7. MÃ¡ximo 4 parÃ¡grafos curtos.\n"
        "8. Retorne APENAS um JSON vÃ¡lido.\n\n"
        f"=== CANDIDATO ===\n"
        f"Nome: {nome}\n"
        f"Resumo: {resumo}\n"
        f"Stacks: {stacks}\n\n"
        f"=== VAGA ===\n"
        f"TÃ­tulo: {vaga_titulo}\n"
        f"Empresa: {empresa}\n"
        f"DescriÃ§Ã£o: {vaga.get('descricao', '')[:2000]}\n\n"
        f"=== PROJETO ===\n"
        f"RepositÃ³rio: {SYSTEM_REPO_URL}\n\n"
        "Retorne:\n"
        "{\n"
        '  "assunto": "string com assunto do email",\n'
        '  "corpo": "string com corpo do email em texto puro",\n'
        '  "nota_projeto": "breve explicaÃ§Ã£o do sistema desenvolvido pelo candidato"\n'
        "}"
    )

    payload = {
        "model": settings.lm_studio_model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 2048,
    }

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{settings.lm_studio_url}/v1/chat/completions",
                json=payload,
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            return _parse_json(content)
    except Exception as e:
        logger.warning("email_outreach.erro", error=str(e))
        return None


def _parse_json(content: str) -> Optional[dict]:
    import json
    import re

    match = re.search(r"\{.*\}", content, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group())
    except json.JSONDecodeError:
        return None
