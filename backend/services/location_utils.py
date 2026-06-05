import re
from typing import Optional

UF_BY_NAME = {
    "acre": "AC",
    "alagoas": "AL",
    "amapa": "AP",
    "amazonas": "AM",
    "bahia": "BA",
    "ceara": "CE",
    "distrito federal": "DF",
    "espirito santo": "ES",
    "goias": "GO",
    "maranhao": "MA",
    "mato grosso": "MT",
    "mato grosso do sul": "MS",
    "minas gerais": "MG",
    "para": "PA",
    "paraiba": "PB",
    "parana": "PR",
    "pernambuco": "PE",
    "piaui": "PI",
    "rio de janeiro": "RJ",
    "rio grande do norte": "RN",
    "rio grande do sul": "RS",
    "rondonia": "RO",
    "roraima": "RR",
    "santa catarina": "SC",
    "sao paulo": "SP",
    "sergipe": "SE",
    "tocantins": "TO",
}

UFS_BRASIL_SET = set(UF_BY_NAME.values())

CIDADE_UF_DIRETA = {
    "sao paulo": "SP",
    "rio de janeiro": "RJ",
    "belo horizonte": "MG",
    "salvador": "BA",
    "fortaleza": "CE",
    "brasilia": "DF",
    "curitiba": "PR",
    "porto alegre": "RS",
    "recife": "PE",
    "manaus": "AM",
    "belem": "PA",
    "goiania": "GO",
    "guarulhos": "SP",
    "campinas": "SP",
    "sao bernardo do campo": "SP",
    "sao jose dos campos": "SP",
    "santo andre": "SP",
    "ribeirao preto": "SP",
    "osasco": "SP",
    "sorocaba": "SP",
    "jundiai": "SP",
    "sao jose do rio preto": "SP",
    "santos": "SP",
    "diadema": "SP",
    "maringa": "PR",
    "joinville": "SC",
    "florianopolis": "SC",
    "blumenau": "SC",
    "londrina": "PR",
    "sao caetano do sul": "SP",
    "nova iguaÃ§u": "RJ",
    "duque de caxias": "RJ",
    "niteroi": "RJ",
    "campos dos goytacazes": "RJ",
    "serra": "ES",
    "vila velha": "ES",
    "cariacica": "ES",
    "macae": "RJ",
    "sao goncalo": "RJ",
    "sao joao de meriti": "RJ",
    "contagem": "MG",
    "uberlandia": "MG",
    "juiz de fora": "MG",
    "betim": "MG",
    "montes claros": "MG",
    "ribeirao das neves": "MG",
    "aracaju": "SE",
    "natal": "RN",
    "joao pessoa": "PB",
    "maceio": "AL",
    "teresina": "PI",
    "sao luis": "MA",
    "cuiaba": "MT",
    "campo grande": "MS",
    "palmas": "TO",
    "porto velho": "RO",
    "rio branco": "AC",
    "boa vista": "RR",
    "macapa": "AP",
    "vitoria": "ES",
    # Mais cidades
    "assis": "SP",
    "barueri": "SP",
    "bauru": "SP",
    "criciuma": "SC",
    "franca": "SP",
    "guaramirim": "SC",
    "jandira": "SP",
    "jau": "SP",
    "passo fundo": "RS",
    "poco verde": "SE",
    "sao joao de meriti": "RJ",
    "sao luis": "MA",
    "ribeirao preto": "SP",
    "guarulhos": "SP",
}


def extrair_uf(localizacao: Optional[str]) -> Optional[str]:
    if not localizacao:
        return None
    texto = localizacao.strip()

    # Remove sufixos como " - 28/05/26" (datas do APInfo)
    texto = re.sub(r"\s*[-â€“]\s*\d{2}/\d{2}/\d{2,4}\s*$", "", texto)

    # 1. "Cidade - UF" ou "Cidade, UF"
    m = re.search(r"[-â€“,]\s*([A-Za-z]{2})\s*$", texto)
    if m:
        uf = m.group(1).upper()
        if uf in UFS_BRASIL_SET:
            return uf

    # 2. "Cidade, Estado" (nome completo do estado)
    for nome, sigla in UF_BY_NAME.items():
        if nome in texto.lower():
            return sigla

    # 3. "Remoto" / "Home Office" / "HO"
    if (
        "remoto" in texto.lower()
        or "home office" in texto.lower()
        or texto.strip().upper() == "HO"
    ):
        return None  # Remoto nao tem UF

    # 4. Tenta match por cidade conhecida
    cidade_limpa = re.sub(r"[^a-zA-ZÃ€-Ã¿\s]", "", texto).strip().lower()
    for cidade, uf in CIDADE_UF_DIRETA.items():
        if cidade == cidade_limpa or cidade in cidade_limpa:
            return uf

    return None
