import re
from models.vaga import VagaBruta


class WorkModelExtractor:
    @staticmethod
    def extrair(vaga: VagaBruta) -> str:
        texto = f"{vaga.titulo} {vaga.localizacao or ''} {vaga.descricao}".lower()

        if re.search(
            r"\b(remoto|remote|home office|home-office|100% remoto|teletrabalho|work from home|wfh)\b",
            texto,
        ):
            return "remoto"

        if re.search(r"\b(hibrido|hybrid|modelo hibrido|hibrid)\b", texto):
            return "hibrido"

        if re.search(
            r"\b(presencial|on-site|onsite|in-office|in office|no local)\b", texto
        ):
            return "presencial"

        return "nao_informado"
