import json
from datetime import datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from ai import client as ai_client
from core.logger import logger


async def _save_analysis(
    db: AsyncIOMotorDatabase, vaga_id: str, user_id: str, data: dict, raw: dict
) -> None:
    doc = {
        "vaga_id": vaga_id,
        "user_id": user_id,
        **data,
        "raw_llm": raw,
        "created_at": datetime.utcnow(),
    }
    await db["vaga_analysis"].update_one(
        {"vaga_id": vaga_id, "user_id": user_id},
        {"$set": doc},
        upsert=True,
    )


async def _save_match(
    db: AsyncIOMotorDatabase, vaga_id: str, user_id: str, data: dict, raw: dict
) -> None:
    doc = {
        "vaga_id": vaga_id,
        "user_id": user_id,
        **data,
        "raw_llm": raw,
        "created_at": datetime.utcnow(),
    }
    await db["match_results"].update_one(
        {"vaga_id": vaga_id, "user_id": user_id},
        {"$set": doc},
        upsert=True,
    )


async def _next_versao(db: AsyncIOMotorDatabase, vaga_id: str, user_id: str) -> int:
    last = await db["curriculo_versoes"].find_one(
        {"vaga_id": vaga_id, "user_id": user_id},
        sort=[("versao", -1)],
    )
    return (last.get("versao", 0) + 1) if last else 1


async def _save_versao(
    db: AsyncIOMotorDatabase,
    vaga_id: str,
    user_id: str,
    original: dict,
    otimizado: str,
    changes: list,
) -> None:
    versao = await _next_versao(db, vaga_id, user_id)
    doc = {
        "user_id": user_id,
        "vaga_id": vaga_id,
        "versao": versao,
        "conteudo_original": original,
        "conteudo_otimizado": {"resumo_profissional": otimizado},
        "changes_log": changes
        or [
            {"tipo": "resumo", "descricao": "Resumo profissional otimizado para a vaga"}
        ],
        "created_at": datetime.utcnow(),
    }
    await db["curriculo_versoes"].insert_one(doc)


# ─── Tool Handlers ────────────────────────────────────────────


async def handle_analyze_vaga(
    user_id: str, vaga_id: str, db: AsyncIOMotorDatabase
) -> dict:
    vaga = await db["vagas"].find_one({"_id": ObjectId(vaga_id)})
    if not vaga:
        return {"success": False, "error": "Vaga não encontrada"}

    result = await ai_client.analisar_vaga(
        titulo=vaga.get("titulo", ""),
        descricao=vaga.get("descricao", ""),
        empresa=vaga.get("empresa", ""),
        fonte=vaga.get("fonte", ""),
    )

    if not result:
        return {
            "success": False,
            "error": "Não foi possível analisar a vaga no momento",
        }

    stacks = ", ".join(result.get("stack_principal", [])) or "não identificada"
    nivel = result.get("nivel", result.get("senioridade_detectada", "não identificado"))
    resumo = result.get("resumo", "")
    obg = result.get("requisitos_obrigatorios", [])
    des = result.get("requisitos_desejaveis", [])
    soft = result.get("soft_skills", [])
    ats = result.get("palavras_chave_ats", [])
    sal_min = result.get("salario_estimado_min")
    sal_max = result.get("salario_estimado_max")

    await _save_analysis(
        db,
        vaga_id,
        user_id,
        {
            "stack_principal": result.get("stack_principal", []),
            "nivel": nivel,
            "fake_junior": result.get("fake_junior", False),
            "salario_estimado_min": sal_min,
            "salario_estimado_max": sal_max,
            "resumo": resumo,
            "requisitos_obrigatorios": obg,
            "requisitos_desejaveis": des,
            "soft_skills": soft,
            "palavras_chave_ats": ats,
            "senioridade_detectada": result.get("senioridade_detectada", ""),
            "modalidade": result.get("modalidade", ""),
            "idiomas": result.get("idiomas", []),
            "tempo_experiencia_anos": result.get("tempo_experiencia_anos"),
            "riscos": result.get("riscos", []),
            "pontos_fortes": result.get("pontos_fortes", []),
            "recomendacoes": result.get("recomendacoes", []),
        },
        result,
    )

    lines = [
        f"## Análise: {vaga.get('titulo', '')}",
        f"**Empresa:** {vaga.get('empresa', '')}",
        f"**Stack principal:** {stacks}",
        f"**Nível:** {nivel}",
    ]
    if sal_min or sal_max:
        lines.append(f"**Salário estimado:** R$ {sal_min or '?'} - R$ {sal_max or '?'}")
    if resumo:
        lines.append(f"\n**Resumo:**\n{resumo}")
    if obg:
        items = "\n".join(f"- {r.get('descricao', r)}" for r in obg[:8])
        lines.append(f"\n**Requisitos obrigatórios:**\n{items}")
    if des:
        items = "\n".join(f"- {r.get('descricao', r)}" for r in des[:6])
        lines.append(f"\n**Desejáveis:**\n{items}")
    if soft:
        items = ", ".join(soft)
        lines.append(f"\n**Soft skills:** {items}")
    if ats:
        items = ", ".join(ats[:10])
        lines.append(f"\n**Palavras-chave ATS:** {items}")

    lines.append(
        f"\n---\n*Análise salva em {datetime.utcnow().strftime('%d/%m/%Y %H:%M')}*"
    )

    return {"success": True, "result": "\n".join(lines), "raw": result}


async def handle_calcular_match(
    user_id: str, vaga_id: str, db: AsyncIOMotorDatabase
) -> dict:
    vaga = await db["vagas"].find_one({"_id": ObjectId(vaga_id)})
    if not vaga:
        return {"success": False, "error": "Vaga não encontrada"}

    curriculo = await db["curriculo_versoes"].find_one(
        {"user_id": user_id, "ativo": True}, sort=[("versao", -1)]
    )
    if not curriculo:
        return {
            "success": False,
            "error": "Nenhum currículo ativo encontrado. Faça upload em /curriculo primeiro.",
        }

    estruturado = curriculo.get("estruturado") or curriculo

    # Extrair skills (correção: curriculos usa 'skills', não 'stacks_atuais')
    skills_raw = estruturado.get("skills") or []
    skills = [{"nome": s, "nivel": ""} for s in skills_raw if isinstance(s, str)]

    experiencias = estruturado.get("experiencias", [])
    projetos = estruturado.get("projetos", [])

    # Calcula score algoritmico para unificar as métricas
    from services.scoring_service import ScoringService
    from models.vaga import VagaBruta

    try:
        vaga_obj = VagaBruta(**vaga)
    except Exception as e:
        logger.warning(f"Erro ao instanciar VagaBruta em calcular_match: {e}")
        vaga_obj = type("VagaTemp", (), vaga)()
    scoring = ScoringService(db)
    score_alg = await scoring.calcular(vaga_obj)

    result = await ai_client.calcular_match(
        vaga_titulo=vaga.get("titulo", ""),
        vaga_empresa=vaga.get("empresa", ""),
        vaga_requisitos=vaga.get("descricao", "")[:2000],
        vaga_stack=", ".join(vaga.get("analise_ia", {}).get("stack_principal", [])),
        vaga_senioridade=vaga.get("analise_ia", {}).get("nivel", ""),
        perfil_stacks=", ".join(f"{s.get('nome', '')}" for s in skills),
        perfil_experiencias="; ".join(
            f"{e.get('cargo', '')} na {e.get('empresa', '')}" for e in experiencias[:5]
        ),
        perfil_projetos="; ".join(
            f"{p.get('nome', '')}: {p.get('descricao', '')[:100]}" for p in projetos[:5]
        ),
        perfil_senioridade="",
        score_algoritmico=score_alg,
    )

    if not result:
        return {
            "success": False,
            "error": "Não foi possível calcular o match no momento",
        }

    score = result.get("score_geral", 50)
    score_tec = result.get("score_tecnico", 0)
    score_exp = result.get("score_experiencia", 0)
    score_soft = result.get("score_soft_skills", 0)
    missing = result.get("missing_skills", [])
    gaps = result.get("gaps", [])
    skills_match = result.get("skills_match", [])
    chance = result.get("chance_entrevista", "media")

    await _save_match(
        db,
        vaga_id,
        user_id,
        {
            "score_geral": score,
            "score_tecnico": score_tec,
            "score_experiencia": score_exp,
            "score_soft_skills": score_soft,
            "skills_match": skills_match,
            "missing_skills": missing,
            "gaps": gaps,
            "chance_entrevista": chance,
        },
        result,
    )

    emoji_chance = {"alta": "ðŸŸ¢", "media": "ðŸŸ¡", "baixa": "ðŸ”´"}.get(chance, "⚪")

    lines = [
        f"## Match: {vaga.get('titulo', '')} — {vaga.get('empresa', '')}",
        f"\n### Score Geral: **{score}/100** {emoji_chance}",
        f"- Técnico: {score_tec}/100",
        f"- Experiência: {score_exp}/100",
        f"- Soft Skills: {score_soft}/100",
        f"- Chance de entrevista: **{chance.upper()}**",
    ]
    if missing:
        items = "\n".join(f"- {s}" for s in missing[:8])
        lines.append(f"\n**Skills em falta:**\n{items}")
    if skills_match:
        items = "\n".join(
            f"- {s.get('skill', s)} (vaga: {s.get('nivel_vaga', '')} | você: {s.get('nivel_usuario', '')})"
            for s in skills_match[:6]
        )
        lines.append(f"\n**Skills compatíveis:**\n{items}")
    if gaps:
        items = "\n".join(
            f"- {g.get('descricao', g)} (impacto: {g.get('impacto', 'medio')})"
            for g in gaps[:4]
        )
        lines.append(f"\n**Gaps identificados:**\n{items}")

    lines.append(
        f"\n---\n*Match salvo em {datetime.utcnow().strftime('%d/%m/%Y %H:%M')}*"
    )

    return {"success": True, "result": "\n".join(lines), "raw": result}


async def handle_pipeline_status(
    user_id: str, params: str, db: AsyncIOMotorDatabase
) -> dict:
    coll = db["pipeline"]
    pipeline_items = await coll.count_documents({"user_id": user_id})
    if pipeline_items == 0:
        return {
            "success": True,
            "result": "Você ainda não tem nenhuma candidatura no pipeline. Navegue pelas vagas e candidate-se para começar.",
        }

    stages = [
        "salva",
        "aplicada",
        "em_analise",
        "entrevista_rh",
        "entrevista_tecnica",
        "teste_tecnico",
        "contratado",
        "rejeitado",
    ]
    counts = {}
    for stage in stages:
        counts[stage] = await coll.count_documents({"user_id": user_id, "etapa": stage})

    candidatadas = sum(counts.get(s, 0) for s in stages[:7]) - counts.get("salva", 0)
    taxa = 0
    if candidatadas > 0:
        taxa_raw = (
            counts.get("entrevista_rh", 0)
            + counts.get("entrevista_tecnica", 0)
            + counts.get("teste_tecnico", 0)
            + counts.get("contratado", 0)
        ) / candidatadas
        taxa = round(taxa_raw * 100)

    lines = [
        f"## Pipeline de Candidaturas",
        f"\n**Total:** {pipeline_items} vagas | **Candidatadas:** {candidatadas} | **Taxa de avanço:** {taxa}%",
    ]
    stage_names = {
        "salva": "ðŸ“Œ Salvas",
        "aplicada": "ðŸ“¨ Aplicadas",
        "em_analise": "ðŸ” Em Análise",
        "entrevista_rh": "ðŸ“ž Entrevista RH",
        "entrevista_tecnica": "ðŸ’» Entrevista Técnica",
        "teste_tecnico": "ðŸ§ª Teste Técnico",
        "contratado": "✅ Contratado",
        "rejeitado": "❌ Rejeitado",
    }
    for stage in stages:
        c = counts.get(stage, 0)
        icon = stage_names.get(stage, stage)
        bar = "▬" * min(c, 20) if c > 0 else ""
        lines.append(f"\n{icon}: {c} {bar}")

    lines.append(
        f"\n---\n*Atualizado em {datetime.utcnow().strftime('%d/%m/%Y %H:%M')}*"
    )

    return {"success": True, "result": "\n".join(lines)}


async def handle_analisar_vaga(
    user_id: str, vaga_id: str, db: AsyncIOMotorDatabase
) -> dict:
    """
    Analisa compatibilidade currículo vs vaga.
    NÃO modifica o currículo — apenas retorna insights.
    """
    vaga = await db["vagas"].find_one({"_id": ObjectId(vaga_id)})
    if not vaga:
        return {"success": False, "error": "Vaga não encontrada"}

    curriculo_doc = await db["curriculo_versoes"].find_one(
        {"user_id": user_id, "ativo": True}, sort=[("versao", -1)]
    )
    if not curriculo_doc:
        return {
            "success": False,
            "error": "Nenhum currículo encontrado. Faça upload primeiro.",
        }

    from services.resume_analyzer import analisar_match

    resultado = await analisar_match(curriculo_doc, vaga)
    if not resultado:
        return {
            "success": False,
            "error": "Não foi possível analisar o match no momento.",
        }

    lines = [
        f"## Análise de Match — {vaga.get('titulo', '')} na {vaga.get('empresa', '')}",
        f"\n**Compatibilidade:** {resultado.get('compatibilidade_geral', '?')}",
        f"**Score estimado:** {resultado.get('score_estimado', '?')}/100",
    ]

    pontos_fortes = resultado.get("pontos_fortes", [])
    if pontos_fortes:
        lines.append("\n**✅ Pontos Fortes:**")
        for p in pontos_fortes:
            lines.append(f"- {p}")

    skills_presentes = resultado.get("skills_presentes", [])
    if skills_presentes:
        lines.append(f"\n**ðŸ“‹ Skills compatíveis:** {', '.join(skills_presentes)}")

    pontos_fracos = resultado.get("pontos_fracos", [])
    if pontos_fracos:
        lines.append("\n**⚠️ Pontos Fracos / Gaps:**")
        for p in pontos_fracos:
            lines.append(f"- {p}")

    skills_faltando = resultado.get("skills_faltando", [])
    if skills_faltando:
        lines.append(f"\n**ðŸ“š Skills faltando:** {', '.join(skills_faltando)}")

    sugestoes = resultado.get("sugestoes", [])
    if sugestoes:
        lines.append("\n**ðŸ’¡ Sugestões de melhoria:**")
        for s in sugestoes:
            lines.append(f"- {s}")

    obs = resultado.get("observacao_geral", "")
    if obs:
        lines.append(f"\n_{obs}_")

    return {"success": True, "result": "\n".join(lines)}


async def handle_gerar_cover_letter(
    user_id: str, vaga_id: str, db: AsyncIOMotorDatabase
) -> dict:
    vaga = await db["vagas"].find_one({"_id": ObjectId(vaga_id)})
    if not vaga:
        return {"success": False, "error": "Vaga não encontrada"}

    curriculo = await db["curriculo_versoes"].find_one(
        {"user_id": user_id, "ativo": True}, sort=[("versao", -1)]
    )
    if not curriculo:
        return {"success": False, "error": "Nenhum currículo ativo encontrado."}

    estruturado = curriculo.get("estruturado") or curriculo
    skills_raw = estruturado.get("skills") or []
    skills = [{"nome": s, "nivel": ""} for s in skills_raw if isinstance(s, str)]
    stack_str = ", ".join(f"{s.get('nome', '')} ({s.get('nivel', '')})" for s in skills)

    result = await ai_client.gerar_cover_letter(
        vaga_empresa=vaga.get("empresa", ""),
        vaga_titulo=vaga.get("titulo", ""),
        vaga_descricao=vaga.get("descricao", "")[:2000],
        perfil_nome=estruturado.get("nome", ""),
        perfil_resumo=estruturado.get("resumo_profissional", ""),
        perfil_stacks=stack_str,
    )

    if not result:
        return {
            "success": False,
            "error": "Não foi possível gerar a cover letter no momento",
        }

    assunto = result.get("assunto", "Candidatura")
    corpo = result.get("corpo", "")

    lines = [
        f"## Cover Letter — {vaga.get('titulo', '')} na {vaga.get('empresa', '')}",
        f"\n**Assunto:** {assunto}",
        f"\n{corpo}",
        f"\n---\n*Gerado por IA em {datetime.utcnow().strftime('%d/%m/%Y %H:%M')}*",
    ]

    return {"success": True, "result": "\n".join(lines), "raw": result}


async def handle_buscar_vagas(
    user_id: str, params: str, db: AsyncIOMotorDatabase
) -> dict:
    import json
    from bson import ObjectId

    pipeline_ids = set()
    async for p in db["pipeline"].find({"user_id": user_id}, {"vaga_id": 1}):
        if p.get("vaga_id"):
            pipeline_ids.add(p["vaga_id"])

    favoritadas_ids = set()
    async for vu in db["vagas_usuarios"].find(
        {"user_id": user_id, "$or": [{"favoritada": True}, {"salva": True}]},
        {"vaga_id": 1},
    ):
        if vu.get("vaga_id"):
            favoritadas_ids.add(vu["vaga_id"])

    prioritized_ids = pipeline_ids | favoritadas_ids
    prioritized_object_ids = []
    for pid in prioritized_ids:
        try:
            prioritized_object_ids.append(ObjectId(pid))
        except Exception as e:
            logger.warning(
                f"ObjectId invalido ignorado no buscar_vagas: {pid} - erro: {e}"
            )
            pass

    filtro_busca = {}
    if params and params.strip():
        try:
            parsed = json.loads(params)
            if isinstance(parsed, dict):
                conditions = []
                termo = parsed.get("busca", "").strip()
                if termo:
                    regex = {"$regex": termo, "$options": "i"}
                    conditions.append(
                        {
                            "$or": [
                                {"titulo": regex},
                                {"empresa": regex},
                                {"descricao": regex},
                            ]
                        }
                    )
                loc = parsed.get("localizacao", "").strip()
                if loc:
                    conditions.append({"localizacao": {"$regex": loc, "$options": "i"}})
                modalidade = parsed.get(
                    "modalidade", parsed.get("modelo_trabalho", "")
                ).strip()
                if modalidade:
                    conditions.append(
                        {"modelo_trabalho": {"$regex": modalidade, "$options": "i"}}
                    )
                if conditions:
                    filtro_busca["$and"] = conditions
            else:
                regex = {"$regex": str(parsed), "$options": "i"}
                filtro_busca = {
                    "$or": [
                        {"titulo": regex},
                        {"empresa": regex},
                        {"descricao": regex},
                    ]
                }
        except (json.JSONDecodeError, TypeError):
            terms = [t.strip() for t in params.strip().split() if t.strip()]
            if len(terms) > 1:
                term_conditions = []
                for term in terms:
                    term_regex = {"$regex": term, "$options": "i"}
                    term_conditions.append(
                        {
                            "$or": [
                                {"titulo": term_regex},
                                {"empresa": term_regex},
                                {"descricao": term_regex},
                            ]
                        }
                    )
                filtro_busca = {"$and": term_conditions}
            else:
                regex = {"$regex": params.strip(), "$options": "i"}
                filtro_busca = {
                    "$or": [
                        {"titulo": regex},
                        {"empresa": regex},
                        {"descricao": regex},
                    ]
                }

    or_conditions = [{"ativa": True}]
    if prioritized_object_ids:
        or_conditions.append({"_id": {"$in": prioritized_object_ids}})

    query = {"$or": or_conditions}
    if filtro_busca:
        query = {"$and": [query, filtro_busca]}

    cursor = (
        db["vagas"]
        .find(
            query,
            {
                "titulo": 1,
                "empresa": 1,
                "score": 1,
                "localizacao": 1,
                "modelo_trabalho": 1,
                "fonte": 1,
                "descricao": 1,
                "url": 1,
            },
        )
        .sort("score", -1)
        .limit(15)
    )

    vagas_encontradas = []
    async for v in cursor:
        vaga_id = str(v["_id"])
        status_pipeline = None
        if vaga_id in pipeline_ids:
            pipe_item = await db["pipeline"].find_one(
                {"user_id": user_id, "vaga_id": vaga_id},
                {"etapa": 1},
            )
            status_pipeline = pipe_item.get("etapa") if pipe_item else None

        vagas_encontradas.append(
            {
                "id": vaga_id,
                "titulo": v.get("titulo", ""),
                "empresa": v.get("empresa", ""),
                "score": v.get("score", 0),
                "localizacao": v.get("localizacao"),
                "modelo_trabalho": v.get("modelo_trabalho"),
                "fonte": v.get("fonte", ""),
                "url": v.get("url", ""),
                "no_pipeline": vaga_id in pipeline_ids,
                "status_pipeline": status_pipeline,
                "descricao_resumo": " ".join((v.get("descricao", "") or "").split())[
                    :200
                ],
            }
        )

    if not vagas_encontradas:
        return {
            "success": True,
            "result": "Nenhuma vaga encontrada com os filtros informados.",
            "raw": {"vagas": []},
        }

    stage_emoji = {
        "salva": "ðŸ“Œ",
        "aplicada": "ðŸ“¨",
        "em_analise": "ðŸ”",
        "entrevista_rh": "ðŸ“ž",
        "entrevista_tecnica": "ðŸ’»",
        "teste_tecnico": "ðŸ§ª",
        "contratado": "✅",
        "rejeitado": "❌",
    }

    lines = [f"## Resultados da Busca ({len(vagas_encontradas)} vagas)", ""]
    for i, v in enumerate(vagas_encontradas[:10], 1):
        pipeline_tag = ""
        if v["no_pipeline"]:
            emoji = stage_emoji.get(v["status_pipeline"], "ðŸ“Œ")
            pipeline_tag = (
                f" `{emoji} {v['status_pipeline']}`"
                if v["status_pipeline"]
                else " `ðŸ“Œ no pipeline`"
            )

        loc = f" | {v['localizacao']}" if v.get("localizacao") else ""
        mod = f" | {v['modelo_trabalho']}" if v.get("modelo_trabalho") else ""
        lines.append(
            f"{i}. **{v['titulo']}** @ {v['empresa']} "
            f"(score: {v['score']}){pipeline_tag}{loc}{mod}"
        )
        if v.get("descricao_resumo"):
            lines.append(f"   _{v['descricao_resumo']}..._")
        lines.append(f"   `ID: {v['id']}`")

    lines.append("")
    lines.append("---")
    lines.append(f"*Busca realizada em {datetime.utcnow().strftime('%d/%m/%Y %H:%M')}*")

    return {
        "success": True,
        "result": "\n".join(lines),
        "raw": {"vagas": vagas_encontradas},
    }


TOOL_HANDLERS = {
    "analyze_vaga": handle_analyze_vaga,
    "calcular_match": handle_calcular_match,
    "analisar_match": handle_analisar_vaga,
    "pipeline_status": handle_pipeline_status,
    "buscar_vagas": handle_buscar_vagas,
    "gerar_cover_letter": handle_gerar_cover_letter,
}
