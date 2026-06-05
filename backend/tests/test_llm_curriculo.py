"""
Teste de validação da LLM local para operações de currículo.

Uso:
    python -m tests.test_llm_curriculo

Testa 3 cenários:
  1. Parse de currículo (estruturar texto bruto em JSON)
  2. Otimização para vaga alvo (reformular sem alucinações)
  3. Geração de cover letter

Saída: Relatório salvo em logs/test_llm_curriculo_{timestamp}.md
"""

import asyncio
import json
import re
import os
import sys
from datetime import datetime
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.config import settings
from core.logger import logger
import httpx


CURRICULO_EXEMPLO = """
João Silva
joao.silva@email.com
(11) 98765-4321
São Paulo, SP

Resumo Profissional:
Desenvolvedor Full Stack com 5 anos de experiência em Python, JavaScript e React.
Atuação em projetos de alto tráfego com foco em performance e escalabilidade.

Experiência:
Tech Solutions Ltda - Desenvolvedor Full Stack (2021-2025)
- Desenvolvimento de APIs REST com FastAPI e Django
- Implementação de testes automatizados (pytest, jest)
- Otimização de queries SQL que reduziram tempo de resposta em 40%

Startup ABC Ltda - Desenvolvedor Frontend (2019-2021)
- Criação de interfaces com React, TypeScript e Tailwind CSS
- Integração com APIs de terceiros (Stripe, Google Maps)
- Participação em squads ágeis com Scrum

Formação:
Universidade de São Paulo - Bacharelado em Ciência da Computação (2015-2019)

Skills:
Python, JavaScript, TypeScript, React, FastAPI, Django, PostgreSQL, MongoDB, Docker, AWS, pytest
"""

VAGA_EXEMPLO = {
    "titulo": "Desenvolvedor Python Sênior",
    "empresa": "TechCorp",
    "descricao": """
Buscamos um Desenvolvedor Python Sênior para integrar nosso time de plataforma.

Requisitos:
- 5+ anos de experiência com Python
- Experiência com FastAPI ou Django
- Conhecimento em bancos relacionais (PostgreSQL)
- Docker e AWS
- Testes automatizados

Diferenciais:
- Experiência com mensageria (RabbitMQ, Kafka)
- Conhecimento em Go
- Experiência com arquitetura de microserviços

Oferecemos:
- Salário compatível com o mercado
- Home office
- Vale refeição
- Plano de saúde
    """.strip(),
}

REPORT_DIR = "logs"


def escrever_relatorio(titulo: str, secoes: list[dict]) -> str:
    os.makedirs(REPORT_DIR, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    path = os.path.join(REPORT_DIR, f"test_llm_curriculo_{timestamp}.md")

    lines = [
        f"# Teste LLM — {titulo}",
        f"**Data:** {datetime.utcnow().isoformat()}",
        "",
    ]
    for secao in secoes:
        lines.append(f"## {secao['titulo']}")
        lines.append(f"**Resultado:** {secao.get('resultado', '?')}")
        if secao.get("detalhes"):
            lines.append("")
            lines.append(secao["detalhes"])
        lines.append("")

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return path


async def testar_llm_disponivel() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{settings.lm_studio_url}/v1/models")
            return resp.status_code == 200
    except Exception:
        return False


async def chamar_llm(
    prompt: str, temperatura: float = 0.1, max_tokens: int = 4096
) -> Optional[str]:
    payload = {
        "model": settings.lm_studio_model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperatura,
        "max_tokens": max_tokens,
    }
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{settings.lm_studio_url}/v1/chat/completions",
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
    except Exception as e:
        logger.warning("test_llm.erro", error=str(e))
        return None


def extrair_json(texto: str) -> Optional[dict]:
    match = re.search(r"\{.*\}", texto, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group())
    except json.JSONDecodeError:
        return None


def validar_curriculo_parse(resultado: dict) -> list[str]:
    erros = []
    if not resultado.get("nome"):
        erros.append("nome não extraído")
    if not resultado.get("stacks_atuais") or len(resultado["stacks_atuais"]) < 3:
        erros.append("poucas skills extraídas (esperado 3+)")
    if not resultado.get("experiencias") or len(resultado["experiencias"]) < 2:
        erros.append("poucas experiências extraídas (esperado 2+)")
    if not resultado.get("educacao") or len(resultado["educacao"]) < 1:
        erros.append("formação não extraída")
    stacks_inventadas = [
        s["nome"].lower()
        for s in resultado.get("stacks_atuais", [])
        if s["nome"].lower() not in CURRICULO_EXEMPLO.lower()
    ]
    if stacks_inventadas:
        erros.append(f"skills possivelmente inventadas: {stacks_inventadas}")
    return erros

    perfil_skills = {s["nome"].lower() for s in perfil.get("stacks_atuais", [])}
    skills_priorizadas = {s.lower() for s in resultado.get("stacks_priorizadas", [])}
    skills_inventadas = skills_priorizadas - perfil_skills
    if skills_inventadas:
        erros.append(f"skills inventadas na priorização: {skills_inventadas}")

    resumo = resultado.get("resumo_otimizado", "").lower()
    if "python" in vaga_descricao.lower() and "python" not in resumo:
        erros.append("resumo não menciona skill chave da vaga (Python)")

    if not resultado.get("nota_honestidade"):
        erros.append("nota_honestidade ausente")

    return erros


def validar_cover_letter(texto: str, vaga_titulo: str) -> list[str]:
    erros = []
    if not texto or len(texto) < 100:
        erros.append("texto muito curto (< 100 caracteres)")
    if vaga_titulo.lower() not in texto.lower():
        erros.append("menção à vaga ausente na cover letter")
    palavras_chave = ["experiência", "oportunidade", "contribuir"]
    if not any(p in texto.lower() for p in palavras_chave):
        erros.append(
            "falta linguagem profissional (experiência/oportunidade/contribuir)"
        )
    return erros


async def test_parse_curriculo() -> dict:
    prompt = (
        "Você é um parser de currículos. Analise o texto abaixo e retorne APENAS "
        "um JSON válido com esta estrutura:\n"
        '{"nome": string, "email": string, "telefone": string, "cidade": string, '
        '"resumo_profissional": string, '
        '"stacks_atuais": [{"nome": string, "nivel": "iniciante"|"intermediario"|"avancado"}], '
        '"experiencias": [{"empresa": string, "cargo": string, "periodo": string, "descricao": string}], '
        '"educacao": [{"instituicao": string, "curso": string, "periodo": string}], '
        '"certificados": [{"nome": string, "emissor": string, "ano": string}], '
        '"projetos": [{"nome": string, "descricao": string, "stacks": [string]}]\n'
        "}\n\n"
        f"Texto:\n{CURRICULO_EXEMPLO}"
    )

    inicio = datetime.utcnow()
    resposta = await chamar_llm(prompt, temperatura=0.1, max_tokens=4096)
    duracao = (datetime.utcnow() - inicio).total_seconds()

    if not resposta:
        return {"resultado": "FALHA", "detalhes": "LLM não respondeu"}

    parsed = extrair_json(resposta)
    if not parsed:
        return {
            "resultado": "FALHA",
            "detalhes": f"Resposta não contém JSON válido.\n```\n{resposta[:500]}\n```",
        }

    erros = validar_curriculo_parse(parsed)
    if erros:
        return {
            "resultado": "FALHA",
            "detalhes": "**Erros encontrados:**\n- "
            + "\n- ".join(erros)
            + f"\n\n**Tempo:** {duracao:.1f}s\n\n**JSON extraído:**\n```json\n{json.dumps(parsed, indent=2, ensure_ascii=False)}\n```",
        }

    return {
        "resultado": "PASSOU",
        "detalhes": f"Parse OK — {len(parsed.get('stacks_atuais', []))} skills, {len(parsed.get('experiencias', []))} experiências\n**Tempo:** {duracao:.1f}s",
    }


async def test_analisar_match() -> dict:
    curriculo = {
        "nome": "João Silva",
        "resumo_profissional": "Desenvolvedor Full Stack com 5 anos de experiência em Python, JavaScript e React.",
        "skills": [
            "Python",
            "JavaScript",
            "React",
            "FastAPI",
            "Django",
            "PostgreSQL",
            "Docker",
            "AWS",
        ],
        "experiencias": [
            {
                "empresa": "Tech Solutions Ltda",
                "cargo": "Desenvolvedor Full Stack",
                "descricao": [
                    "Desenvolvimento de APIs REST com FastAPI e Django.",
                    "Implementação de testes automatizados.",
                ],
            },
            {
                "empresa": "Startup ABC Ltda",
                "cargo": "Desenvolvedor Frontend",
                "descricao": [
                    "Criação de interfaces com React, TypeScript e Tailwind CSS.",
                    "Integração com APIs de terceiros.",
                ],
            },
        ],
        "formacoes": [{"instituicao": "USP", "curso": "Ciência da Computação"}],
    }

    from services.resume_analyzer import analisar_match

    resultado = await analisar_match(curriculo, VAGA_EXEMPLO)
    if not resultado:
        return {"resultado": "FALHA", "detalhes": "Analisador não retornou resultado"}

    erros = []
    if not resultado.get("compatibilidade_geral"):
        erros.append("Campo 'compatibilidade_geral' ausente")
    if resultado.get("score_estimado") is None:
        erros.append("Campo 'score_estimado' ausente")
    if not resultado.get("pontos_fortes"):
        erros.append("Campo 'pontos_fortes' ausente ou vazio")
    if not resultado.get("skills_faltando"):
        erros.append("Campo 'skills_faltando' ausente ou vazio")

    if erros:
        return {
            "resultado": "FALHA",
            "detalhes": "**Erros:**\n- "
            + "\n- ".join(erros)
            + f"\n\n```json\n{json.dumps(resultado, indent=2, ensure_ascii=False)}\n```",
        }

    return {
        "resultado": "PASSOU",
        "detalhes": f"Análise OK — {resultado.get('compatibilidade_geral')} | {len(resultado.get('skills_presentes', []))} skills OK, {len(resultado.get('skills_faltando', []))} faltando\n**Score:** {resultado.get('score_estimado')}/100",
    }


async def test_cover_letter() -> dict:
    prompt = (
        "Você é um especialista em redação profissional. Gere uma carta de apresentação "
        "(cover letter) para a vaga abaixo, em português, tom profissional e personalizado.\n\n"
        "NUNCA minta. Use apenas as informações do candidato fornecidas.\n\n"
        f"=== VAGA ===\n"
        f"Título: {VAGA_EXEMPLO['titulo']}\n"
        f"Empresa: {VAGA_EXEMPLO['empresa']}\n"
        f"Descrição: {VAGA_EXEMPLO['descricao'][:2000]}\n\n"
        "=== CANDIDATO ===\n"
        "Nome: João Silva\n"
        "Resumo: Desenvolvedor Full Stack com 5 anos de experiência em Python, React e infraestrutura cloud.\n"
        "Skills principais: Python, FastAPI, Django, PostgreSQL, Docker, AWS\n\n"
        "Retorne APENAS o texto da carta, sem explicações extras."
    )

    inicio = datetime.utcnow()
    resposta = await chamar_llm(prompt, temperatura=0.4, max_tokens=1500)
    duracao = (datetime.utcnow() - inicio).total_seconds()

    if not resposta:
        return {"resultado": "FALHA", "detalhes": "LLM não respondeu"}

    erros = validar_cover_letter(resposta, VAGA_EXEMPLO["titulo"])
    if erros:
        return {
            "resultado": "FALHA",
            "detalhes": "**Erros encontrados:**\n- "
            + "\n- ".join(erros)
            + f"\n\n**Tempo:** {duracao:.1f}s\n\n**Texto gerado:**\n```\n{resposta[:800]}\n```",
        }

    return {
        "resultado": "PASSOU",
        "detalhes": f"Cover letter OK — {len(resposta.split())} palavras\n**Tempo:** {duracao:.1f}s\n\n```\n{resposta[:600]}\n```",
    }


async def main():
    print("=" * 60)
    print("  TESTE LLM — Operações de Currículo")
    print("=" * 60)

    print(f"\nðŸ“¡ Verificando LLM em {settings.lm_studio_url}...")
    disponivel = await testar_llm_disponivel()
    if not disponivel:
        print(f"❌ LLM indisponível em {settings.lm_studio_url}")
        print(f"   Fallback: {settings.ollama_url}")
    else:
        print(f"✅ LLM disponível: {settings.lm_studio_model}")

    print("\n" + "-" * 60)
    print("1️⃣  Teste: Parse de Currículo")
    print("-" * 60)
    parse_result = await test_parse_curriculo()
    print(f"   Resultado: {parse_result['resultado']}")
    if parse_result.get("detalhes"):
        print(f"   {parse_result['detalhes'][:200]}...")

    print("\n" + "-" * 60)
    print("2️⃣  Teste: Análise de Match (currículo vs vaga)")
    print("-" * 60)
    otim_result = await test_analisar_match()
    print(f"   Resultado: {otim_result['resultado']}")
    if otim_result.get("detalhes"):
        print(f"   {otim_result['detalhes'][:200]}...")

    print("\n" + "-" * 60)
    print("3️⃣  Teste: Cover Letter")
    print("-" * 60)
    cover_result = await test_cover_letter()
    print(f"   Resultado: {cover_result['resultado']}")
    if cover_result.get("detalhes"):
        print(f"   {cover_result['detalhes'][:200]}...")

    secoes = [
        {
            "titulo": "Disponibilidade",
            "resultado": "✅ Online" if disponivel else "❌ Offline",
            "detalhes": f"URL: {settings.lm_studio_url}\nModelo: {settings.lm_studio_model}\nFallback: {settings.ollama_url}",
        },
        {"titulo": "1. Parse de Currículo", **parse_result},
        {"titulo": "2. Análise de Match", **otim_result},
        {"titulo": "3. Cover Letter", **cover_result},
    ]

    total = sum(
        1
        for s in secoes
        if s["titulo"] != "Disponibilidade" and s.get("resultado") == "PASSOU"
    )
    total_tests = sum(1 for s in secoes if s["titulo"] != "Disponibilidade")

    secoes.append(
        {
            "titulo": "Resumo Final",
            "resultado": f"{total}/{total_tests} testes passaram",
            "detalhes": (
                "✅ Todos os testes OK — LLM pronta para operações de currículo\n"
                if total == total_tests
                else "⚠️ Alguns testes falharam — revisar prompts ou modelo\n"
            ),
        }
    )

    relatorio_path = escrever_relatorio("Operações de Currículo", secoes)
    print(f"\nðŸ“ Relatório salvo em: {relatorio_path}")

    if disponivel:
        print(f"\n{'=' * 60}")
        print(f"  RESUMO: {total}/{total_tests} testes passaram")
        print(f"{'=' * 60}")

    return disponivel and total == total_tests


if __name__ == "__main__":
    asyncio.run(main())
