import re
from models.vaga import VagaBruta

class WorkModelExtractor:
    @staticmethod
    def extrair(vaga: VagaBruta) -> str:
        """
        Extrai o modelo de trabalho (remoto, hibrido, presencial, ou nao_informado)
        a partir da localizaÃ§Ã£o, tÃ­tulo e descriÃ§Ã£o da vaga.
        """
        texto = f"{vaga.titulo} {vaga.localizacao or ''} {vaga.descricao}".lower()
        
        # PadrÃµes para Remoto
        if re.search(r'\b(remoto|remote|home office|home-office|100% remoto|teletrabalho|work from home|wfh)\b', texto):
            return "remoto"
            
        # PadrÃµes para HÃ­brido
        if re.search(r'\b(h[iÃ­]brido|hybrid|modelo h[iÃ­]brido|hibrid)\b', texto):
            return "hibrido"
            
        # PadrÃµes para Presencial
        if re.search(r'\b(presencial|on-site|onsite|in-office|in office|no local)\b', texto):
            return "presencial"
            
        return "nao_informado"
