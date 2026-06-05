from datetime import datetime
from typing import List

from core.logger import logger
from models.vaga import VagaBruta


INTEGRADORES = []


def _descobrir_integradores():
    global INTEGRADORES
    if INTEGRADORES:
        return INTEGRADORES

    from integrations.ats.base_ats import ATSIntegrador
    import inspect
    import pkgutil
    import importlib

    import integrations.ats as package

    integradores = []
    for _, module_name, _ in pkgutil.iter_modules(package.__path__):
        if module_name in ("__init__", "base_ats"):
            continue
        try:
            module = importlib.import_module(
                f".{module_name}", package=package.__name__
            )
            for name, obj in inspect.getmembers(module):
                if (
                    inspect.isclass(obj)
                    and issubclass(obj, ATSIntegrador)
                    and obj is not ATSIntegrador
                ):
                    integradores.append(obj)
        except Exception as e:
            logger.warning(
                "ats.erro_descobrir_modulo", modulo=module_name, error=str(e)
            )

    INTEGRADORES = integradores
    return integradores


async def _atualizar_progresso(db, mensagem: str, progresso: int, detalhe: str):
    await db["coleta_status"].update_one(
        {"_id": "status"},
        {
            "$set": {
                "status": "rodando",
                "mensagem": mensagem,
                "progresso": progresso,
                "coletor_atual": "ATS Integradores",
                "atualizado_em": datetime.utcnow(),
            },
            "$push": {"detalhes": detalhe},
        },
    )


async def executar_integradores_ats(termos: list[str], db=None) -> List[VagaBruta]:
    integradores = _descobrir_integradores()
    integradores.sort(key=lambda cls: cls.prioridade, reverse=True)

    todas_vagas: List[VagaBruta] = []
    total = len(integradores)

    for idx, cls in enumerate(integradores):
        nome = cls.__name__
        progresso_base = int(76 + (idx / total) * 14)

        if db:
            await _atualizar_progresso(
                db,
                f"ATS: {nome}...",
                progresso_base,
                f"ðŸ” Iniciando {nome}",
            )

        try:
            instancia = cls()
            vagas = await instancia.coletar()
            todas_vagas.extend(vagas)
            if db:
                await _atualizar_progresso(
                    db,
                    f"ATS: {nome} concluÃ­do ({len(vagas)} vagas)",
                    progresso_base,
                    f"âœ… {nome}: {len(vagas)} vagas encontradas",
                )
        except Exception as e:
            logger.error("ats.erro_integrador", integrador=cls.__name__, error=str(e))
            if db:
                await _atualizar_progresso(
                    db,
                    f"ATS: {nome} falhou",
                    progresso_base,
                    f"âŒ {nome}: {str(e)}",
                )

    logger.info(
        "ats.executado",
        total_integradores=len(integradores),
        total_vagas=len(todas_vagas),
    )
    return todas_vagas


__all__ = [
    "executar_integradores_ats",
]
