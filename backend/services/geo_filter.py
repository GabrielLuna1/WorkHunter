import re
from typing import List
from models.vaga import VagaDB
from core.logger import logger


PAISES_INTERNACIONAIS = [
    "united states",
    "usa",
    "u.s.a",
    "america",
    "philippines",
    "sri lanka",
    "azerbaijan",
    "united kingdom",
    "uk",
    "england",
    "london",
    "canada",
    "australia",
    "new zealand",
    "germany",
    "france",
    "spain",
    "italy",
    "netherlands",
    "switzerland",
    "sweden",
    "norway",
    "denmark",
    "finland",
    "belgium",
    "austria",
    "ireland",
    "portugal",
    "poland",
    "czech",
    "hungary",
    "romania",
    "ukraine",
    "russia",
    "turkey",
    "india",
    "china",
    "japan",
    "south korea",
    "singapore",
    "malaysia",
    "indonesia",
    "vietnam",
    "thailand",
    "argentina",
    "chile",
    "colombia",
    "peru",
    "mexico",
    "dubai",
    "uae",
    "united arab emirates",
    "hong kong",
    "saudi arabia",
    "qatar",
    "south africa",
    "nigeria",
    "kenya",
    "costa rica",
    "panama",
    "puerto rico",
]

CIDADES_BR = [
    "sao paulo",
    "sÃ£o paulo",
    "sp",
    "rio de janeiro",
    "rj",
    "belo horizonte",
    "bh",
    "minas gerais",
    "mg",
    "brasilia",
    "distrito federal",
    "df",
    "curitiba",
    "parana",
    "pr",
    "porto alegre",
    "rio grande do sul",
    "rs",
    "salvador",
    "bahia",
    "ba",
    "fortaleza",
    "ceara",
    "ce",
    "recife",
    "pernambuco",
    "pe",
    "manaus",
    "amazonas",
    "am",
    "belem",
    "para",
    "pa",
    "florianopolis",
    "santa catarina",
    "sc",
    "joinville",
    "blumenau",
    "campinas",
    "sao jose dos campos",
    "ribeirao preto",
    "uberlandia",
    "santos",
    "sao bernardo do campo",
    "santo andre",
    "osasco",
    "guarulhos",
    "niteroi",
    "duque de caxias",
    "brasil",
    "brazil",
    "nacional",
    "remoto",
    "home office",
    "hibrido",
]


class GeoFilter:
    def filtrar(self, vagas: List[VagaDB]) -> tuple[List[VagaDB], int]:
        aprovadas: List[VagaDB] = []
        removidas = 0

        for vaga in vagas:
            local = (vaga.localizacao or "").lower().strip()

            if not local:
                aprovadas.append(vaga)
                continue

            if self._is_brasil(local):
                aprovadas.append(vaga)
                continue

            if self._is_internacional(local):
                logger.debug(
                    "geo_filter.removida_internacional",
                    titulo=vaga.titulo[:60],
                    localizacao=local,
                )
                removidas += 1
                continue

            aprovadas.append(vaga)

        if removidas > 0:
            logger.info(
                "geo_filter.resultado",
                total_entrada=len(vagas),
                aprovadas=len(aprovadas),
                removidas=removidas,
            )

        return aprovadas, removidas

    def _is_brasil(self, local: str) -> bool:
        for cidade in CIDADES_BR:
            if cidade in local:
                return True
        return False

    def _is_internacional(self, local: str) -> bool:
        for pais in PAISES_INTERNACIONAIS:
            if pais in local:
                return True
        return False
