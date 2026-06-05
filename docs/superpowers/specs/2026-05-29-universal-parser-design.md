# Parser Universal Rule-Based — Architectural Refactor

**Date**: 2026-05-29
**Status**: Approved
**Context**: Current parser is hardcoded to a single resume template — section titles are exact-match only, header parsing is position-dependent, and unknown sections cause data loss. Need a universal rule-based pipeline.

---

## 1. Pipeline em 5 Etapas

```
ETAPA 1: Extração Bruta
  pdfplumber.extract_text() + docx2txt
  + extract_links_from_pdf() (annotations)
  → raw_text + hyperlinks + metadata (page, order)

ETAPA 2: Normalização
  → unicode sanitization
  → whitespace normalization
  → encoding cleanup
  → separar header block (texto antes da 1ª seção conhecida)
  → normalized_text

ETAPA 3: Classificação Fuzzy
  → split em blocos por espaçamento duplo
  → cada bloco: _classify_block(texto) → {type, confidence, raw}
  → fuzzy matching + keyword score + structural hints
  → confidence < 0.45 → customSectionBlock

ETAPA 4: Estruturação
  → cada bloco classificado → schema específico
  → extração por múltiplos patterns (tentar vários, pegar o melhor)
  → fallback raw text + confidence preservados

ETAPA 5: Renderização (existente, inalterada)
  → TipTap JSON
  → customSectionBlock para tudo que não encaixou
```

---

## 2. Dicionário Universal de Seções

```python
SECTION_DEFINITIONS = [
    (tipo, [títulos PT], [títulos EN], [títulos ES], [keywords], [abreviações])
]
```

### Tipos
- `experience`: experiência profissional
- `education`: formação acadêmica
- `skills`: habilidades técnicas
- `projects`: projetos / portfólio
- `certifications`: certificações / cursos
- `languages`: idiomas
- `summary`: resumo / objetivo / perfil
- `custom_whitelist`: open source, volunteering, achievements, publications, hackathons (preservados como customSectionBlock com metadata)

### Normalização Pré-Fuzzy
- remover acentos
- lowercase
- remover pontuação
- remover múltiplos espaços
- strip de dois-pontos, parênteses

### Idioma Dominante
- Detectar idioma predominante pelas seções reconhecidas
- Aumentar peso das keywords do idioma detectado

---

## 3. Algoritmo de Classificação

```python
def _classify_block(text: str) -> BlockClassification:
    scores = []

    # 1. Fuzzy match com headings (peso 40%)
    for title_list in [pt_titles, en_titles, es_titles]:
        for title in title_list:
            ratio = SequenceMatcher(None, normalized_first_line, title).ratio()
            scores.append(ratio * 0.4)

    # 2. Keyword match no conteúdo (peso 30%)
    keyword_hits = sum(1 for kw in keywords if kw in text_lower)
    kw_score = min(keyword_hits / max(len(keywords), 1) * 3, 1.0)
    scores.append(kw_score * 0.3)

    # 3. Structural hints (peso 30%)
    struct_score = _structural_hints(tipo, text)
    scores.append(struct_score * 0.3)

    # 4. Negative signals (reduz confidence)
    neg_score = _negative_signals(tipo, text)
    scores.append(-neg_score * 0.2)

    confidence = min(sum(scores), 1.0)

    return BlockClassification(type=tipo, confidence=confidence, raw=text)
```

### Structural Hints por Tipo
- **experience**: date ranges, company names, bullet lists
- **education**: university/college keywords, degree names, years
- **skills**: tech stack keywords (React, Python, Docker, etc.)
- **projects**: GitHub links, repository names, tech descriptions
- **certifications**: bootcamp, course platforms (Udemy, Coursera)
- **languages**: proficiency levels (fluent, native, intermediate)
- **summary**: short paragraph (1-5 lines), no dates, no bullets

### Negative Signals
- Se tipo `skills` mas contém date ranges → reduz confidence
- Se tipo `experience` mas sem empresa/data → reduz
- Se tipo `education` mas sem instituição/curso → reduz

### Thresholds
- `confidence >= 0.45`: aceito como classificado
- `confidence < 0.45`: customSectionBlock com raw text preservado
- `confidence >= 0.75` + matches estruturais fortes: extração automática
- `0.45 <= confidence < 0.75`: extração parcial + raw text preservado

### Top 3 Matches
```python
class BlockClassification:
    type: str
    confidence: float
    raw: str
    alternatives: list[tuple[str, float]]  # top 3 alternativas
```

---

## 4. Header Parsing Contextual

### Email
- Regex global no texto todo
- Preferir mailto: annotations do PDF

### Telefone
- Regex global no texto todo
- Formatos BR e internacional

### LinkedIn / GitHub / Portfolio
- PDF annotations > regex global
- Social provider detection automático:
  - linkedin.com → linkedin
  - github.com → github
  - behance.net → behance
  - vercel.app / .dev / .io → portfolio

### Nome
- Primeiro bloco de 2-5 palavras capitalizadas
- ANTES da primeira seção conhecida
- Negative filtering: sem @, sem URL, sem datas, sem números excessivos
- Tamanho: 5-80 caracteres

### Cidade
- Linha contendo indicadores geográficos (SP, Brazil, cidade:)
- Stripping de email, URL, telefone, pipes
- Tamanho máximo: 60 caracteres

---

## 5. Estrutura do Parsing Report

```python
class ParsingReport:
    total_blocks: int
    classified_blocks: int
    custom_blocks: int
    avg_confidence: float
    warnings: list[str]
    blocks: list[BlockClassification]
```

Preservado no documento para debugging e analytics futuros.

---

## 6. Preservação e Fallback

- `rawText` original SEMPRE preservado no documento
- Cada bloco mantém `raw` (texto original) + `confidence`
- `parserVersion` incluído no metadata
- Se NENHUMA seção for classificada (ex: PDF escaneado sem texto) → fallback para raw text como customSectionBlock único

---

## 7. Não-Escopo (para esta fase)

- OCR para PDFs escaneados
- Detecção de layout em duas colunas
- Extração de imagens
- Qualquer dependência de LLM/ML
- Mudanças no frontend ou renderização
