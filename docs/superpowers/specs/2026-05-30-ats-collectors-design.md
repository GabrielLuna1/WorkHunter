# ATS Collectors — Cobertura por Integração Direta

**Date**: 2026-05-30
**Status**: Draft
**Context**: Current coverage depends on job boards (Gupy, InfoJobs, etc.) and direct ATS integrations (Greenhouse, Taqe, Workable, Lever).

---

## 1. Arquitetura

```
backend/collectors/ats/
├── __init__.py              # auto-descoberta: lista todos integradores
├── base_ats.py              # ATSCollector(ABC) — herda BaseCollector, add mapeamento empresa→url
├── greenhouse.py            # API HTTP — Nubank, Cora, Dock, CloudWalk, etc.
├── taqe.py                  # Playwright — Mercado Livre, BTG, Ambev, Localiza, Raízen
├── workable.py              # HTTP/Playwright — iFood, Wellhub
└── lever.py                 # HTTP/Playwright — Brex, Coinbase, Rippling, Remote, Deel
```

### Integração com sistema existente

Em `sistema.py`, após o loop de coletores atuais, adicionar:

```python
from collectors.ats import executar_integradores_ats

vagas_ats = await executar_integradores_ats(termos)
vagas_brutas.extend(vagas_ats)
```

### Auto-descoberta (`__init__.py`)

```python
from collectors.ats.base_ats import ATSIntegrador
from collectors.ats.greenhouse import GreenhouseIntegrador
from collectors.ats.taqe import TaqeIntegrador
from collectors.ats.workable import WorkableIntegrador
from collectors.ats.lever import LeverIntegrador

INTEGRADORES: list[type[ATSIntegrador]] = [
    GreenhouseIntegrador,
    TaqeIntegrador,
    WorkableIntegrador,
    LeverIntegrador,
]
```

### Base ATS (`base_ats.py`)

```python
class ATSIntegrador(BaseCollector, ABC):
    """Integrador genérico para um sistema de ATS.

    Cada subclasse define:
    - self.nome: identificador único (ex: "greenhouse")
    - self.prioridade: 0-100 (define ordem de execução)
    - self.empresas: dict[nome_empresa, config_extração]
        config: { token, pais, categoria, prioridade }
    - extrair_vagas(empresa, config) → List[VagaBruta]
    """
    prioridade: int = 50
    MAX_FAILURES = 3
    TIMEOUT = 15
```

**Prioridades dos integradores:**
- Greenhouse = 100
- Workable = 90
- Taqe = 80
- Lever = 70

Integradores executam em ordem decrescente de prioridade. No futuro: `executar apenas prioridade >= 80`.

---

## 2. Mapeamento ATS → Empresas

### Tier 1 — Fase 1 (Prioridade Máxima)

#### Greenhouse (API HTTP pública)

| Empresa | Board Token | Pais | Categoria | Prioridade |
|---------|------------|------|-----------|-----------|
| Nubank | nubank | BR | fintech | 100 |
| Cora | cora | BR | fintech | 90 |
| Conta Simples | contasimples | BR | fintech | 85 |
| CloudWalk | cloudwalk | BR | fintech | 85 |
| Dock | dock | BR | fintech | 80 |
| Celcoin | celcoin | BR | fintech | 80 |
| Notion | notion | US | saas | 40 |
| Vercel | vercel | US | saas | 40 |
| Supabase | supabase | US | saas | 40 |
| Linear | linear | US | saas | 40 |
| Stripe | stripe | US | fintech | 50 |
| Airbnb | airbnb | US | travel | 20 |
| Dropbox | dropbox | US | cloud | 20 |
| Instacart | instacart | US | delivery | 20 |

**API**: `GET https://boards-api.greenhouse.io/v1/boards/{token}/jobs`

**Companies with prioridade < 50** (Airbnb, Dropbox, Instacart) are included but deprioritized — they may be skipped when time budget is tight.

#### Taqe (Playwright)

| Empresa | URL Base | Pais | Categoria | Prioridade |
|---------|---------|------|-----------|-----------|
| Mercado Livre | https://careers-meli.mercadolibre.com/ | BR | ecommerce | 100 |
| BTG Pactual | https://btgpactual.taqe.com.br/ | BR | banco | 95 |
| Ambev | https://ambev.taqe.com.br/ | BR | bebidas | 80 |
| Localiza | https://localiza.taqe.com.br/ | BR | mobilidade | 75 |
| Raízen | https://raizen.taqe.com.br/ | BR | energia | 70 |

#### Workable (HTTP + fallback Playwright)

| Empresa | Subdomain | Pais | Categoria | Prioridade |
|---------|----------|------|-----------|-----------|
| iFood | ifood | BR | delivery | 100 |
| Wellhub | wellhub | BR | saude | 90 |
| QuintoAndar | quintoandar | BR | imobiliario | 85 |
| Loggi | loggi | BR | logistica | 80 |
| MadeiraMadeira | madeiramadeira | BR | ecommerce | 75 |
| Olist | olist | BR | ecommerce | 70 |
| Trybe | trybe | BR | educacao | 65 |

**API**: `GET https://{subdomain}.workable.com/api/v1/jobs`

#### Lever (HTTP + fallback Playwright)

| Empresa | URL |
|---------|-----|
| Brex | https://jobs.lever.co/brex |
| Coinbase | https://jobs.lever.co/coinbase |
| Rippling | https://jobs.lever.co/rippling |
| Remote | https://jobs.lever.co/remote |
| Deel | https://jobs.lever.co/deel |

---

## 3. Técnica de Extração

### Playwright Pool

Reutilizar `browser_pool.py` existente. Cada integrador Playwright:

1. Abre página da listagem de vagas
2. Aguarda seletor de resultado (ex: `.job-card`, `[data-testid="job-list"]`)
3. Extrai cards com `page.evaluate()` (JS injection, não DOM lento)
4. Para cada card: título, link, local, data (se disponível)
5. Fecha página (mantém browser)

### Greenhouse — HTTP puro

```python
class GreenhouseIntegrador(ATSIntegrador):
    nome = "greenhouse"
    prioridade = 100
    empresas = { ... }

    async def extrair_vagas(self, empresa: str, config: dict) -> List[VagaBruta]:
        url = f"https://boards-api.greenhouse.io/v1/boards/{config['token']}/jobs"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params={"content": "true"}, timeout=self.TIMEOUT)
            data = resp.json()
        return [self._parse_job(j, empresa, config) for j in data["jobs"]]
```

### Estratégia de rate limiting

Um semáforo compartilhado entre integradores ATS:

```python
# em base_ats.py
_ats_semaphore = asyncio.Semaphore(3)  # max 3 requests simultâneos ATS
```

---

## 4. Modelo de Dados

Reutilizar `VagaBruta` existente. Cada vaga ATS preenche:

| Campo | Origem |
|-------|--------|
| titulo | título do job listing |
| empresa | nome mapeado no integrador |
| descricao | conteúdo da vaga (se disponível, senão "Vaga em {empresa}") |
| localizacao | local do job listing |
| url | link direto para a vaga |
| fonte | `"greenhouse"`, `"taqe"`, etc. |
| fonte_detalhada | `"greenhouse:nubank"`, `"taqe:mercadolivre"` — permite identificar exatamente qual empresa falhou |
| id_externo | ID único do ATS (ex: `{board_token}_{job_id}`) |
| salario_min | se exposto na listagem |
| salario_max | se exposto na listagem |
| tipo_contrato | "CLT", "PJ", etc. (se disponível) |

### Dedup

O `DedupService` existente (SHA256 hash por `fonte:id_externo:titulo:empresa`) funciona sem alterações. Os integradores ATS geram `fonte` única, então não há conflito com coletores existentes.

---

## 5. Circuit Breaker

Cada integrador mantém um contador de falhas por empresa:

```python
self._falhas: dict[str, int] = {}  # empresa -> contagem

def _registrar_sucesso(self, empresa: str):
    self._falhas[empresa] = 0

def _registrar_falha(self, empresa: str) -> bool:
    """Retorna True se a empresa deve ser ignorada pelo resto da execução."""
    self._falhas[empresa] = self._falhas.get(empresa, 0) + 1
    return self._falhas[empresa] >= self.MAX_FAILURES

def _empresa_bloqueada(self, empresa: str) -> bool:
    return self._falhas.get(empresa, 0) >= self.MAX_FAILURES
```

Se Nubank falhar 3x seguidas, o integrador pula Nubank pelo resto da execução.

---

## 6. Timeout Obrigatório

| Camada | Timeout |
|--------|---------|
| HTTP (httpx) | `timeout=15` |
| Playwright | `page.set_default_timeout(15000)` |
| Semáforo | Aguarda no máximo 30s pelo slot |

Timeout evita que um ATS travado bloqueie toda a coleta.

---

## 7. Fases de Implementação

### Fase 1 (Agora)
- [ ] `base_ats.py` — classe base, prioridade, semáforo, circuit breaker, timeout, `executar_integradores_ats()`
- [ ] `greenhouse.py` — HTTP puro, empresas BR prioritárias (Nubank, Cora, Dock, CloudWalk, Celcoin, Conta Simples + Stripe)
- [ ] `taqe.py` — Playwright, Mercado Livre + BTG + 3
- [ ] `workable.py` — HTTP + fallback Playwright, iFood + 6
- [ ] Integração em `sistema.py`
- [ ] Métrica de cobertura ATS

### Fase 1.5 (Workday)
- [x] `workday.py` — Playwright, Santander + Salesforce, Oracle, Cisco, Dell
- [x] Mapear empresas Workday com metadados (tenant, site, prioridade)

| Empresa | Tenant | Prioridade | Categoria |
|---------|--------|-----------|-----------|
| Santander | santander.wd3.myworkdayjobs.com/Santander | 100 | banco |
| Salesforce | salesforce.wd6.myworkdayjobs.com/External_Career_Site | 60 | saas |
| Oracle | oracle.wd5.myworkdayjobs.com/ORCL_External_Career_Site | 50 | saas |
| Cisco | cisco.wd5.myworkdayjobs.com/Careers | 50 | tech |
| Dell | dell.wd5.myworkdayjobs.com/Careers | 40 | tech |

> Expansão futura: VMware, Johnson & Johnson, Roche — requer pesquisa de tenant.

### Fase 2
- [x] `lever.py` — HTTP + fallback Playwright, Brex, Rippling, Remote, Deel

| Empresa | Slug | Prioridade | Categoria |
|---------|------|-----------|-----------|
| Brex | brex | 50 | fintech |
| Rippling | rippling | 50 | saas |
| Remote | remote | 50 | hrtech |
| Deel | deel | 50 | hrtech |

- [x] ATS Proprietários — `proprio.py` (config-driven, 14 empresas)

| Empresa | URL | Prioridade | Categoria |
|---------|-----|-----------|-----------|
| Banco Inter | carreiras.bancointer.com.br | 90 | banco |
| C6 Bank | carreiras.c6bank.com.br | 90 | banco |
| Neon | neon.gupy.io | 85 | fintech |
| Stone | carreiras.stone.co | 85 | fintech |
| PagBank | carreiras.pagbank.com.br | 80 | fintech |
| Asaas | asaas.com/carreiras | 80 | fintech |
| TOTVS | totvs.gupy.io | 75 | tech |
| CI&T | ciandt.com/carreiras | 75 | tech |
| Compass UOL | compass.uol/carreiras | 70 | tech |
| Stefanini | stefanini.com/br/carreiras | 65 | consultoria |
| NTT DATA | br.nttdata.com/carreiras | 65 | consultoria |
| FCamara | fcamara.com.br/carreiras | 60 | consultoria |
| GFT | gft.com/br/pt/carreiras | 60 | consultoria |
| Capgemini | capgemini.com/br-pt/carreiras | 60 | consultoria |

> Nota: empresas como PicPay, Itaú, Bradesco, Magazine Luiza usam Gupy — já cobertas pelo GupyCollector existente.

### Fase 3
- [ ] Gupy — API expandida (já temos Gupy como fonte, mas pode ser expandida)
- [ ] Kenoby — Playwright
- [ ] SmartRecruiters — API pública
- [ ] Recruitee — API pública

---

## 8. Monitoramento

Métricas a adicionar no `sistema.py`:

| Métrica | Onde |
|---------|------|
| Total de vagas por integrador ATS | log por `collector.nome` |
| Taxa de erro por integrador | try/except no loop |
| Tempo médio de extração | timestamp antes/depois |
| Empresas sem vagas no momento | log info |
| **Cobertura ATS** | JSON consolidado por execução |

### Estrutura da métrica de cobertura

```python
{
    "greenhouse": {
        "empresas_tentadas": 14,
        "vagas_encontradas": 128,
        "erros": 1,
        "empresas_com_erro": ["instacart"],
        "duracao_segundos": 4.2
    },
    "taqe": {
        "empresas_tentadas": 5,
        "vagas_encontradas": 42,
        "erros": 0,
        "empresas_com_erro": [],
        "duracao_segundos": 12.8
    }
}
```

Isso permite avaliar rapidamente qual ATS vale a pena manter.

---

## 9. Não Escopo (para esta rodada)

- Scraping de Workday (Fase 1.5)
- Scraping de Gupy expandido (Fase 3 — já temos via API)
- Classificação automática de ATS por URL (o mapeamento é manual)
- Proxy rotation (reutilizar proxy_service.py existente se necessário)
- Monitoramento via dashboard (apenas logs por enquanto)
