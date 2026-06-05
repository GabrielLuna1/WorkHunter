<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://capsule-render.vercel.app/api?type=waving&color=0:1a1a2e,100:d4af37&height=200&section=header&text=WORKPLUS&fontSize=60&fontColor=d4af37&animation=fadeIn&fontAlignY=35">
    <img src="https://capsule-render.vercel.app/api?type=waving&color=0:1a1a2e,100:d4af37&height=200&section=header&text=WORKPLUS&fontSize=60&fontColor=d4af37&animation=fadeIn&fontAlignY=35" width="100%">
  </picture>
</p>

<div align="center">

# WorkPlus

### *Sua plataforma inteligente de busca e gestão de vagas tech*

[![Python](https://img.shields.io/badge/Python_3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![MongoDB](https://img.shields.io/badge/MongoDB_7-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_v3-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)]()
[![Status: Active](https://img.shields.io/badge/Status-Active-2ea44f?style=flat-square)]()
[![AI: Local](https://img.shields.io/badge/AI-Local_LLM-8B5CF6?style=flat-square)]()

> WorkPlus centraliza vagas de tecnologia de 12 fontes, aplica match score por IA local e organiza tudo em um pipeline kanban — coleta, analisa e acompanha oportunidades sem você precisar visitar dezenas de sites manualmente.
>
> ⚠️ O WorkPlus **não envia currículos, não preenche formulários e não se candidata automaticamente**. Todo o processo de aplicação é manual e intencional, feito diretamente no site de cada empresa. O sistema cuida da etapa anterior: a inteligência de mercado, a triagem e a organização — para que você chegue ao momento de aplicar já com informação suficiente para decidir se aquela vaga vale seu tempo.

[⚡ Quick Start](#-quick-start) •
[🧠 Features](#-features) •
[📡 Fontes](#-fontes) •
[🏗️ Arquitetura](#️-arquitetura) •
[🖥️ Interface](#️-interface) •
[🛠️ Stack](#️-stack)

---

</div>

## 📋 Sobre o Projeto

O WorkPlus é uma plataforma pessoal de busca e gestão de vagas de tecnologia, construída para automatizar todo o processo de encontrar, avaliar e acompanhar oportunidades de emprego. Em vez de visitar dezenas de sites manualmente, o sistema faz isso de forma contínua em segundo plano e entrega apenas as vagas mais relevantes, já analisadas e pontuadas.

### Coleta de Vagas

O sistema acessa **12 fontes diferentes** — incluindo APIs públicas de plataformas de recrutamento, portais de emprego e sites de carreira corporativos. Após a coleta, as vagas passam por:
- Deduplicação (evita repetições entre fontes)
- Filtragem de relevância (baseada no perfil do usuário)
- Filtragem geográfica (apenas vagas brasileiras)
- Extração automática do modelo de trabalho (remoto, híbrido, presencial) e estado (UF)

### Pontuação e Análise

Cada vaga recebe automaticamente uma **pontuação de 0 a 100** calculada com base em título, stack tecnológica, salário, tipo de contrato, localização e reputação da fonte. O sistema também detecta automaticamente vagas "fake júnior" — aquelas com título de nível júnior mas que exigem experiência de sênior na descrição.

Para vagas de interesse, uma análise mais profunda pode ser solicitada via IA, gerando resumo da oportunidade, nível de senioridade real, stack principal estimada, score de compatibilidade personalizado e sugestões de desenvolvimento.

### Gestão de Currículo

- Upload de currículo em **PDF ou DOCX**
- Extração automática via IA para montar perfil estruturado (habilidades, experiências, preferências)
- Perfil calibra os scores de match e os termos de busca das coletas
- **Versionamento completo**: múltiplas versões, histórico de alterações, restauração e exportação

### Notificações

| Tipo | Gatilho | Canal |
|------|---------|-------|
| Alerta de vaga | Score ≥ 85 | Telegram (link direto) |
| Resumo diário | Todos os dias às 8h | Telegram (melhores vagas do dia anterior) |

---

## 🧠 Features

| | Feature | Descrição |
|:-:|---------|-----------|
| 🤖 | **Coleta de Vagas** | Busca manual em diversas fontes com um clique — você decide quando iniciar |
| 📊 | **Match Score IA** | Pontuação 0-100 por título, stack, salário, tipo, localização e fonte |
| 🧪 | **Fake Júnior Detection** | Detecta vagas que pedem requisitos de sênior mas se intitulam júnior |
| 📄 | **Currículo Inteligente** | Upload PDF/DOCX → extração automática → versionamento com diff → export |
| 💬 | **Copilot de Carreira** | Chat IA com análise de vagas, match, pipeline, busca e cover letter |
| 📋 | **Pipeline Kanban** | 8 estágios drag-and-drop com histórico e estatísticas de conversão |
| 📈 | **Radar de Mercado** | Stacks mais pedidas, salários por tecnologia, skills populares, timeline |
| 📱 | **Telegram Bot** | Notificações de match ≥85% e resumo diário às 8h |
| 📅 | **Calendário de Entrevistas** | Agende e visualize entrevistas, prazos e eventos vinculados ao pipeline |
| 🔍 | **Filtro Inteligente** | Relevância por perfil, filtro geográfico, extração automática de UF e modelo de trabalho |

---

## 📡 Fontes

O WorkPlus consulta vagas de tecnologia através de plataformas abertas e portais de emprego:

| | Fonte | Tipo |
|:-:|-------|------|
| <img src="https://www.google.com/s2/favicons?domain=greenhouse.io&sz=16" width="16"> | **Greenhouse** | Plataforma de recrutamento |
| <img src="https://www.google.com/s2/favicons?domain=lever.co&sz=16" width="16"> | **Lever** | Plataforma de recrutamento |
| <img src="https://www.google.com/s2/favicons?domain=workable.com&sz=16" width="16"> | **Workable** | Plataforma de recrutamento |
| <img src="https://www.google.com/s2/favicons?domain=gupy.io&sz=16" width="16"> | **Gupy** | Plataforma de recrutamento |
| <img src="https://www.google.com/s2/favicons?domain=infojobs.com.br&sz=16" width="16"> | **InfoJobs** | Portal de empregos |
| <img src="https://www.google.com/s2/favicons?domain=vagas.com.br&sz=16" width="16"> | **Vagas.com.br** | Portal de empregos |
| <img src="https://www.google.com/s2/favicons?domain=apinfo.com&sz=16" width="16"> | **APInfo** | Portal de empregos |
| <img src="https://www.google.com/s2/favicons?domain=programathor.com.br&sz=16" width="16"> | **Programathor** | Portal de empregos tech |
| <img src="https://www.google.com/s2/favicons?domain=99jobs.com&sz=16" width="16"> | **99Jobs** | Portal de empregos |
| <img src="https://www.google.com/s2/favicons?domain=myworkdayjobs.com&sz=16" width="16"> | **Workday** | Plataforma de recrutamento |
| <img src="https://www.google.com/s2/favicons?domain=taqe.com.br&sz=16" width="16"> | **Taqe** | Plataforma de recrutamento |
| <img src="https://www.google.com/s2/favicons?domain=bancointer.com.br&sz=16" width="16"> | **Próprio ATS** | Sites de carreira corporativos |

---

## 🏗️ Arquitetura

```mermaid
graph TB
    subgraph Frontend ["Frontend — Next.js 15 · TypeScript · Tailwind"]
        DISC["/ — Discovery"]
        HUB["/hub — Copilot Hub"]
        KANBAN["/kanban — Pipeline"]
        ANALYTICS["/analytics — Market Radar"]
        CURRICULO["/curriculo — Gestão"]
        CAL["/calendar — Eventos"]
    end

    subgraph Backend ["Backend — FastAPI · Python 3.11"]
        API["REST API — 16 Routers"]
        AI["AI Client — LM Studio"]
        CHAT["Chat IA — SSE Streaming + Tools"]
        TELEGRAM["Telegram Bot"]
        CELERY["Celery Tasks — Coleta 2/2h"]
    end

    subgraph Data ["Data Layer"]
        MONGODB[("MongoDB 7<br/>vagas · pipeline · chat<br/>curriculos · analytics")]
        REDIS[("Redis — Broker Celery")]
    end

    subgraph Integrations ["Integrações"]
        API_COL["APIs Públicas"]
        WEB_COL["Portais de Emprego"]
        ATS_COL["Sites de Carreira"]
    end

    Frontend <-->|"REST + SSE"| API
    API --> AI
    API --> TELEGRAM
    API --> CELERY
    API --> MONGODB
    CELERY --> REDIS
    CELERY --> Integrations

    AI -->|"LM Studio :1234"| LMSTUDIO["LM Studio — LLM Local"]

    style LMSTUDIO fill:#2d1b69,stroke:#8B5CF6,stroke-width:2px
```

### Fluxo de Coleta

```
Perfil do Usuário (termos de busca)
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  APIs Públicas (Gupy, Greenhouse, Lever, Workable)   │
│  Portais de Emprego (InfoJobs, Vagas.com, APInfo)    │
│  Sites de Carreira (Workday, Taqe, entre outros)     │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  Deduplicação por hash                                │
│  Filtro de Relevância (perfil do usuário)             │
│  Filtro Geográfico (apenas Brasil)                    │
│  Extração de UF e Modelo de Trabalho                  │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  Match Score (0-100)                                  │
│  Fake Júnior Detection                                │
│  Notificação Telegram (score ≥ 85)                    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
                  MongoDB (workplus)
```

---

## 🖥️ Interface

### Páginas

| Rota | Função |
|------|--------|
| `/` — **Discovery** | Grade/lista de vagas com busca e filtros (fonte, score, UF, modelo, categoria) |
| `/hub` — **Copilot Hub** | 3 colunas redimensionáveis: sessões \| chat IA \| contexto com 7 views |
| `/kanban` — **Pipeline** | 8 colunas drag-and-drop: salva → contratado / rejeitado |
| `/vagas` — **Vagas** | Lista completa com filtros avançados |
| `/analise/vaga/[id]` — **Análise** | Score de match, análise IA, histórico de status |
| `/curriculo` — **Currículo** | Upload PDF/DOCX, gerenciamento de versões |
| `/curriculo/versoes` — **Versões** | Histórico com diff entre versões |
| `/analytics` — **Market Radar** | Stacks, salários, fontes, skills, timeline 30d |
| `/calendar` — **Calendário** | Eventos de entrevistas e prazos vinculados ao pipeline |

### Copilot Hub

O chat com IA oferece 6 ferramentas executáveis:

| Ferramenta | Função |
|------------|--------|
| `analyze_vaga` | Análise profunda de qualquer vaga |
| `calcular_match` | Score de compatibilidade com breakdown |
| `analisar_match` | Forças, lacunas e sugestões de desenvolvimento |
| `pipeline_status` | Status completo de todas as candidaturas |
| `buscar_vagas` | Busca em linguagem natural no banco de vagas |
| `gerar_cover_letter` | Carta de apresentação personalizada |

---

## 🗺️ Roadmap

- [x] **v1.0** — Coleta + análise offline + pipeline básico
- [x] **v2.0** — Chat IA Copilot + Hub + Currículo inteligente
- [x] **v2.1** — Analytics + Pipeline Kanban + Telegram
- [x] **v2.4** — Notificações por e-mail + Split layout + Novas fontes ATS
- [ ] **v3.0** — Refinamentos de UX + novas integrações

---

## ⚡ Quick Start

```bash
# 1. Infraestrutura (MongoDB + Redis)
docker compose up -d mongodb redis

# 2. Backend
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8070

# 3. Frontend
cd frontend
npm install
npm run dev
```

Ou use `start.bat` na raiz para subir tudo automaticamente.

### IA Local (Opcional)

```bash
# Baixe o LM Studio em https://lmstudio.ai
# Carregue seu modelo em http://127.0.0.1:1234

# Sem IA local? A plataforma funciona,
# mas sem análise de vagas e match score
```

---

## 🛠️ Stack

<details open>
<summary><strong>Runtime & Language</strong></summary>

![Python](https://img.shields.io/badge/Python_3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js_20-339933?style=for-the-badge&logo=node.js&logoColor=white)

</details>

<details open>
<summary><strong>Backend</strong></summary>

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-37814A?style=for-the-badge&logo=celery&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB_7-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

</details>

<details open>
<summary><strong>Frontend</strong></summary>

![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_v3-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)

</details>

<details open>
<summary><strong>Inteligência Artificial</strong></summary>

![LM Studio](https://img.shields.io/badge/LM_Studio-8B5CF6?style=for-the-badge&logo=local&logoColor=white)

</details>

---

## 📁 Estrutura

```
workplus/
├── backend/
│   ├── api/                  # 16 routers FastAPI
│   │   ├── ai.py             # Chat IA + SSE streaming + tools
│   │   ├── sistema.py        # Health check, coleta manual, status
│   │   ├── vagas.py          # Listagem, busca, detalhe
│   │   ├── pipeline.py       # Pipeline CRUD + drag-and-drop
│   │   ├── resume.py         # Upload, extração, versões
│   │   ├── analytics.py      # 9 endpoints de analytics
│   │   ├── notifications.py  # Telegram + Email config
│   │   └── ...               # analise, perfil, ai, eventos...
│   ├── integrations/         # 12 integrações com fontes de vagas
│   │   ├── portais.py         # Portais brasileiros (InfoJobs, Vagas, etc)
│   │   ├── plataformas.py     # Plataformas de recrutamento (Gupy, etc)
│   │   └── ats/               # Sites de carreira (Workday, Taqe, etc)
│   ├── core/                 # Config, DB, Logger, Auth
│   ├── models/               # Pydantic models (11 coleções)
│   ├── services/             # Serviços (scoring, dedup, IA, currículo...)
│   ├── tasks/                # Celery (tarefas em segundo plano)
│   └── ai/                   # Cliente IA (LM Studio)
├── frontend/
│   └── src/
│       ├── app/              # 7 rotas (discovery, hub, kanban...)
│       ├── components/       # 30+ componentes React
│       │   ├── chat/         # ChatPanel, ChatMessage
│       │   ├── kanban/       # KanbanBoard, JobDetailSheet
│       │   ├── vagas/        # VagaCard, FilterBar
│       │   └── ui/           # ResizablePanel, Skeleton, badges
│       └── lib/              # API client, chat context, utils
├── docker-compose.yml        # MongoDB + Redis
├── start.bat                 # Auto-install + startup
└── .env.example              # Template de configuração
```

---

## 🔧 Configuração

<details>
<summary><strong>🤖 IA</strong></summary>

```env
LM_STUDIO_URL=http://127.0.0.1:1234
LM_STUDIO_MODEL=nome-do-seu-modelo
```

</details>

<details>
<summary><strong>📱 Telegram</strong></summary>

```env
TELEGRAM_BOT_TOKEN=seu_token
TELEGRAM_CHAT_ID=seu_chat_id
```

</details>

<details>
<summary><strong>📧 E-mail (IMAP/SMTP)</strong></summary>

```env
EMAIL_IMAP_SERVER=imap.gmail.com
EMAIL_IMAP_USER=seu_email@gmail.com
EMAIL_IMAP_PASS=sua_senha_ou_app_password
EMAIL_SMTP_SERVER=smtp.gmail.com
EMAIL_SMTP_PORT=587
```

</details>

<details>
<summary><strong>⚙️ Gerais</strong></summary>

```env
MONGODB_URI=mongodb://localhost:27017/workplus
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=uma-chave-segura-aqui
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=INFO
```

</details>

---

<div align="center">

### **Descubra. Organize. Analise.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)]()
[![PRs: Welcome](https://img.shields.io/badge/PRs-Welcome-ff69b4?style=for-the-badge)]()

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:d4af37,100:1a1a2e&height=120&section=footer" width="100%">

</div>
