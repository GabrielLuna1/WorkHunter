import re
from typing import Optional
from models.vaga import VagaBruta, VagaDB


class AnaliseService:
    FAKE_JUNIOR_KEYWORDS = [
        r"(?i)\b(?:senior|sÃªnior|5\+.*anos|5.*anos.*experiÃªncia|experiÃªncia.*5)\b",
        r"(?i)pÃ³s[- ]graduaÃ§Ã£o|mestrado|doutorado",
        r"(?i)lideranÃ§a\s*(?:tÃ©cnica|de\s*equipe)",
        r"(?i)arquitetura\s*(?:de\s*)?software",
        r"(?i)gerenciamento\s*(?:de\s*)?projetos",
        r"(?i)10\+.*anos|10.*anos.*experiÃªncia",
        r"(?i)experiÃªncia.*comprovada.*(?:mÃ­nima|acima)",
    ]

    FAKE_JUNIOR_TITLES = [
        r"(?i)estÃ¡gio\s*(?:em\s*)?(?:desenvolvimento|programaÃ§Ã£o)",
        r"(?i)jovem\s*aprendiz",
        r"(?i)trainee",
    ]

    SENIOR_KEYWORDS = [
        r"(?i)\b(?:senior|sÃªnior|staff|lead|tech\s*lead|principal|architect)\b",
        r"(?i)(?:10\+|10)\s*anos",
    ]

    def analisar_fake_junior(self, vaga: VagaBruta | VagaDB) -> dict:
        titulo = vaga.titulo.lower()
        descricao = vaga.descricao.lower()
        texto_completo = f"{titulo} {descricao}"

        is_junior_entry = self._is_junior_entry(titulo)
        match_count = 0
        matches = []

        for pattern in self.FAKE_JUNIOR_KEYWORDS:
            found = re.findall(pattern, descricao)
            if found:
                match_count += len(found)
                matches.extend(found)

        fake_junior = is_junior_entry and match_count >= 2

        if not fake_junior:
            senior_count = 0
            for pattern in self.SENIOR_KEYWORDS:
                if re.search(pattern, texto_completo):
                    senior_count += 1
            if senior_count >= 2 and not is_junior_entry and self._is_low_entry(titulo):
                fake_junior = True

        return {
            "fake_junior": fake_junior,
            "fake_junior_detalhes": matches[:5] if fake_junior else [],
            "nivel_estimado": self._estimar_nivel(titulo, descricao),
        }

    def _is_junior_entry(self, titulo: str) -> bool:
        for pattern in self.FAKE_JUNIOR_TITLES:
            if re.search(pattern, titulo):
                return True
        for word in ["junior", "jÃºnior", "jr", "estagio", "estÃ¡gio", "trainee"]:
            if word in titulo:
                return True
        return False

    def _is_low_entry(self, titulo: str) -> bool:
        senior_words = ["senior", "sÃªnior", "staff", "lead", "tech lead", "principal", "architect", "coordenador", "gerente", "manager"]
        for w in senior_words:
            if w in titulo:
                return False
        return True

    def _estimar_nivel(self, titulo: str, descricao: str) -> str:
        texto = f"{titulo} {descricao}".lower()
        if any(w in texto for w in ["senior", "sÃªnior", "staff", "lead"]):
            return "senior"
        if any(w in texto for w in ["pleno", "pleno/senior", "mid-level"]):
            return "pleno"
        if any(w in texto for w in ["junior", "jÃºnior", "jr", "estagio", "estÃ¡gio", "trainee"]):
            return "junior"
        return "nao_determinado"
