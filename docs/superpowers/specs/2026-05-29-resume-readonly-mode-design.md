# Resume Read-Only Mode — Architectural Shift

**Date**: 2026-05-29
**Status**: Implemented
**Context**: Product direction change — inline editing deprioritized in favor of viewing + job application pipeline

---

## 1. Strategy

### Preserve Editor Code in Feature Branch

Before any changes to `main`, snapshot the current editor state:

```bash
git checkout -b feature/tiptap-editor
git push -u origin feature/tiptap-editor
git checkout main
```

This protects:
- All 9 custom TipTap nodes (headerBlock, resumoBlock, experienciaBlock, etc.)
- Schema definitions and extension registration
- Parser pipeline (PDF/DOCX import → regex + pdfplumber annotations → TipTap JSON)
- Hybrid data structure (old format ↔ TipTap JSON roundtrip)
- Full EditorDocument component with all editing capabilities

The branch becomes a stable experimental lab for future inline editing, AI contextual suggestions, collaboration, or advanced templates.

### Main Branch Becomes View-First

The `main` branch operates the same TipTap engine in **read-only mode by default**, togglable to editable via explicit user action.

---

## 2. EditorDocument — Purely Display

### Simplified Interface

```typescript
interface EditorDocumentProps {
  content: TipTapJson | null
}
```

- Always `editable: false` — no cursor, selection, or bubble menu
- No `onChange`, `onUpdate`, or any mutation callbacks
- No block insertion buttons
- Placeholder: "Nenhum currículo carregado"
- Same TipTap engine rendering custom nodes, just in read-only mode

---

## 3. Page Header — Clean & Simple

```
Meu Currículo  [v2]           [Novo currículo] [Exportar]
```

- No saving indicators of any kind
- Version label shown inline
- "Novo currículo" replaces "+ Upload" — clearer label for the action
- "Exportar" dropdown unchanged (PDF / DOCX)

---

## 4. Persistence — Removed Entirely

- No auto-save
- No debounce timers
- No PUT calls from the curriculo page
- Data is only written via upload (import) or version operations (duplicate/restore)
- Editing code paths do not exist on main — preserved exclusively in `feature/tiptap-editor`

---

## 5. Candidatura Model

```typescript
interface Candidatura {
  _id: string
  vaga_id: string
  curriculo_id: string
  versao_id: string
  status: 'pendente' | 'enviada' | 'em_andamento' | 'recusada' | 'sucesso'
  match_score: number        // 0-100
  match_detalhes: {
    acertos: string[]        // pontos fortes para a vaga
    gaps: string[]           // requisitos não atendidos
  }
  criado_em: string
  atualizado_em: string
}
```

---

## 6. Candidate Flow (From Job Posting — Primary)

### Route: `POST /api/v1/candidaturas`
```
Body: { vaga_id, curriculo_id, versao_id }
Response: { candidatura, match_score, match_detalhes }
```

### UX Flow (Vaga Page)
```
Botão "Candidatar-se"
  → Modal lista versões de currículo
  → Cada versão mostra match score (ex: 85%)
  → Usuário seleciona + confirma
  → Toast: "Candidatura registrada — 85% match"
  → Vaga status: "Candidatado"
```

---

## 7. Vagas Compatíveis (From Resume Page — Secondary)

### Route: `GET /api/v1/curriculo/match-vagas?limit=10`
```
Response: [{ vaga, match_score, match_detalhes }]
```

### UX (Curriculo Page)
```
Seção "Vagas Compatíveis" no final da página
  → Lista: [Vaga / Empresa / Match % / Botão "Ver vaga"]
  → Máximo 10 vagas
  → Ordenado por match_score descendente
  → Clique abre a vaga em nova aba
```

---

## 8. Non-Goals

- No removal of TipTap from the project
- No deletion of custom nodes or schema
- No changes to parser pipeline
- No changes to export (PDF/DOCX) flow
- No changes to versioning system
- No AI inline editing (still analyze-only)
- No real-time collaboration setup

---

## 9. Preserved Architecture

The following remain completely unchanged:
- `frontend/src/components/curriculo/editor/nodes/*.tsx` — all 9 custom nodes
- `frontend/src/components/curriculo/editor/EditorDocument.tsx` — simplified to display-only (same nodes, no editing props)
- `frontend/src/components/curriculo/UploadZone.tsx` — unchanged
- `frontend/src/components/curriculo/VersaoSidebar.tsx` — unchanged
- `backend/services/resume_parser.py` — unchanged
- `backend/services/curriculo_export.py` — unchanged
- `backend/services/curriculo_to_tiptap.py` — unchanged
- `backend/services/curriculo_docx_export.py` — unchanged (if exists)
