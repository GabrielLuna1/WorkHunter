# Resume Viewer & Reader

## Visão Geral

Substituir o editor TipTap por um visualizador de currículo **read-only** premium. O parser universal rule-based continua sendo o core da feature. Toda funcionalidade de edição inline (TipTap, nodes, toolbar, auto-save) foi preservada em `feature/tiptap-editor` e removida do `main`.

## Arquitetura

```
Backend parse_resume() → CurriculoSchema JSON → API → ResumeViewer → Pure React render
```

Sem TipTap. Sem ProseMirror. Sem editor nodes no runtime. O viewer renderiza direto do `CurriculoSchema`.

## Estado da Página

```
loading → (tem currículo?)
  ├── sim → viewer (exibe ResumeViewer + sidebar)
  ├── não → upload (tela de upload inicial)
  └── erro → error (mensagem + tentar novamente)
```

Upload abre como modal/drawer — não troca a tela inteira.

## Layout

Baseado na opção **A (Visualizador Centralizado)** com elementos da **C (Dashboard Inteligente)**:

```
┌──────────────┬─────────────────────────┬──────────────────┐
│ Sidebar      │ Documento Centralizado   │ Painel Direito   │
│ (240px)      │ (max-w-[210mm])          │ (retrátil, 280px)│
│              │                          │                  │
│ Logo         │ Card escuro #1e1e1e     │ Match Score      │
│ Versões      │ Borda #2a2a2a           │ Skills           │
│ ───────      │ Sombra suave            │ Vagas Compatíveis│
│ Upload       │ Renderizado sem TipTap  │ Insights IA      │
│ Exportar     │ Links clicáveis         │                  │
│ Histórico    │ Seções semânticas       │                  │
│ ───────      │                          │                  │
│ ⚡ Insights   │                          │                  │
└──────────────┴─────────────────────────┴──────────────────┘
```

### Sidebar Esquerda

- **Topo**: Logo/ícone + "Currículo"
- **Versões**: lista vertical, ativa destacada com bolinha roxa
- **Ações**: Upload (modal/drawer), Exportar (PDF/DOCX dropdown)
- **Histórico**: link para logs de versões
- **Fundo**: Toggle do painel direito (⚡ insights)
- Minimalista, sem excessos. Largura ~240px.

### Área Central (Documento)

- Card escuro centralizado (`max-w-[210mm]`, ~794px em telas grandes)
- Fundo `#1e1e1e` com borda `#2a2a2a` e sombra suave
- Padding interno `32px 40px`
- Zero elementos editoriais (sem caret, toolbar, bubble menu)
- Seções renderizadas como componentes React puros

### Painel Direito (Retrátil)

- Toggle via botão ⚡ na sidebar ou botão flutuante
- Largura ~280px quando aberto
- Conteúdo:
  - Match score com vaga ativa (barra percentual)
  - Skills detectadas pelo parser (badges)
  - Vagas compatíveis (lista com links)
  - Insights da IA (analyze-only)
- Fechado por padrão. Não polui a experiência de leitura.

## Árvore de Componentes

```
ResumeViewer
├── ResumeHeader
│   ├── nome (22px, font-semibold, #e0e0e0)
│   ├── contato (email | telefone | cidade) separado por pipes
│   └── links (LinkedIn · GitHub · Portfolio · etc) cor accent
├── ResumeBody
│   ├── ResumeSection (wrapper genérico)
│   │   ├── SummaryBlock — texto livre, parágrafo
│   │   ├── ExperienceBlock — empresa, cargo, período, bullets
│   │   ├── EducationBlock — curso, instituição, período
│   │   ├── SkillsBlock — badges arredondados
│   │   ├── CertificationBlock — nome, instituição
│   │   ├── ProjectBlock — nome, descrição, tecnologias
│   │   ├── LanguageBlock — idioma, nível
│   │   └── CustomSectionBlock — raw text preservado
│   └── ResumeEmpty — estado sem currículo carregado
```

### Props do ResumeViewer

```typescript
interface ResumeViewerProps {
  curriculo: CurriculoSchema | null
  versaoLabel: string
}
```

## Estilo Visual (Dark Mode)

### Card do Documento
- Background: `#1e1e1e` (levemente mais claro que o canvas `#1a1a1a`)
- Border: `#2a2a2a`
- Border radius: `8px`
- Box shadow: suave (mais pronunciada em dark mode)
- Padding interno: `32px 40px`
- Max width: `210mm` (largura A4)
- Fonte: `'Inter', 'Segoe UI', system-ui, sans-serif`

### Header
- Nome: 22px, font-semibold, tracking-tight, color #e0e0e0
- Contato: 12px, color #888, separado por pipes (|)
- Links: 11px, color accent (#6c5ce7), sem sublinhado
- Divider abaixo: 1px solid #2a2a2a

### Seções
- Título: 10px uppercase, font-semibold, accent, letter-spacing 1px
- Espaçamento entre seções: 20px

### Experiência / Projetos
- Cargo/nome: 12px, font-semibold, #e0e0e0
- Empresa: 11px, accent
- Período: 11px, #888, alinhado à direita
- Bullets: 11px, #999, line-height 1.6

### Skills
- Badges: background #2a2a2a, color #ccc, border-radius 4px
- Padding: 3px 8px
- Font-size: 10px

## Componentes Específicos

### ResumeHeader
Renderiza nome, contato (email | telefone | cidade) e links sociais (LinkedIn, GitHub, Portfolio, etc). Links usam `<a>` com `target="_blank"` e `rel="noopener noreferrer"`. Labels curtas sem URL completa.

### ResumeSection (Wrapper Genérico)
Wrapper que renderiza:
1. Título da seção (uppercase accent)
2. Conteúdo específico do bloco

Usa `switch` no tipo do bloco para renderizar o componente correto.

### ExperienceBlock
- Cargo + período (flex, justify-between)
- Empresa (accent)
- Lista de bullets

### EducationBlock
- Curso + período
- Instituição

### SkillsBlock
Lista de badges flex-wrap.

### CustomSectionBlock
Título + conteúdo raw preservado (texto ou lista simples).

## Remoções do main

### Remover completamente
- `EditorDocument.tsx` — inteiro (substituído por ResumeViewer)
- `editor/nodes/` — todos os 9 nodes + index.ts
- `editor/` — diretório inteiro
- TipTap packages do `package.json`:
  - `@tiptap/react`
  - `@tiptap/starter-kit`
  - `@tiptap/extension-placeholder`
  - `@tiptap/extension-underline`
  - `@tiptap/extension-link`
  - `@tiptap/extension-text-align`
  - `@tiptap/core`
  - `@tiptap/pm`

### Preservar na branch feature/tiptap-editor
- Todo o diretório `editor/`
- Código de auto-save, onChange, block buttons
- Página antiga com modo edição

### Manter no main
- `UploadZone.tsx` — adaptado para modal/drawer
- `VersaoSidebar.tsx` — reformulado com ações
- `ExperienciaCard.tsx` — pode ser reutilizado ou refatorado
- `ProjetoCard.tsx` — pode ser reutilizado ou refatorado
- `SkillBadge.tsx` — mantido
- `CurriculoSection.tsx` — mantido ou refatorado

## Upload (Modal/Drawer)

Upload não troca a tela. Abre um modal/drawer a partir da sidebar:

- Estados: `uploading | parsing (com etapas) | structuring | success | error`
- Mantém `UploadZone.tsx` com adaptações
- Callback de sucesso recarrega o viewer com o novo currículo
- Modal fecha automaticamente após sucesso

## Export

Mantido no header ou sidebar:
- Dropdown: PDF | DOCX
- Usa as mesmas rotas de exportação existentes
- Feedback visual durante o download

## Painel Inteligente (Retrátil)

Implementado em fases:
1. **Fase 1 (MVP)**: Toggle abre/fecha painel vazio com placeholder "Em breve"
2. **Fase 2**: Match score com vaga ativa
3. **Fase 3**: Skills detectadas, vagas compatíveis
4. **Fase 4**: Insights IA (analyze-only)

## Backend (sem mudanças)

O backend não precisa de alterações. Continua:
- `parse_resume()` → `CurriculoSchema` com `tipTapJson` (opcional)
- Rotas de upload, versões, export
- O `tipTapJson` gerado pelo parser continua sendo armazenado mas não usado pelo viewer

## Específico: curriculo_to_tiptap.py

Este serviço converte `CurriculoSchema` → TipTap JSON. Ele continua sendo útil para a branch `feature/tiptap-editor`. Pode ser mantido no `main` (não acionado pelo viewer) ou movido para um módulo separado. Decisão: **manter no main**, não há custo em mantê-lo e evita conflito de branches.

## Ordem de Implementação

1. Remover diretório `editor/` e dependências TipTap do `package.json`
2. Criar `ResumeViewer` com `ResumeHeader` + `ResumeBody` + blocks
3. Adaptar `page.tsx` para usar `ResumeViewer` no lugar de `EditorDocument`
4. Reformular `VersaoSidebar` com ações (upload, export)
5. Adaptar `UploadZone` como modal/drawer
6. Implementar painel direito retrátil (placeholder inicial)
7. Remover `exportOpen` do header e integrar na sidebar
8. Verificar build: `npx next build`
