# Currículo Editor — TipTap/ProseMirror

**Data:** 2026-05-28
**Status:** Aprovado
**Fase:** Implementação

---

## Objetivo

Substituir a interface atual de cards/blocos separados por um editor de currículo estilo documento (Word/Google Docs/Notion) com edição inline, mantendo dados estruturados internamente.

## Stack

- **Editor:** TipTap (ProseMirror) via `@tiptap/react`
- **Custom Nodes:** headerBlock, resumoBlock, experienciaBlock, projetoBlock, formacaoBlock, certificacaoBlock, idiomaBlock, skillsBlock, customSectionBlock
- **Export:** Backend via WeasyPrint (PDF) + python-docx (DOCX)
- **Upload:** react-dropzone para drag-and-drop de PDF/DOCX

## Arquitetura

### Frontend

```
components/curriculo/
  editor/
    nodes/
      HeaderBlock.tsx
      ResumoBlock.tsx
      ExperienciaBlock.tsx
      ProjetoBlock.tsx
      FormacaoBlock.tsx
      CertificacaoBlock.tsx
      IdiomaBlock.tsx
      SkillsBlock.tsx
      CustomSectionBlock.tsx
    EditorDocument.tsx        # Componente principal do editor
  UploadZone.tsx              # Drag-and-drop upload
  VersaoSidebar.tsx           # Sidebar de versões
```

### Backend

- `models/curriculo_model.py` — adicionar `tipTapJson: dict | None`
- `services/curriculo_to_tiptap.py` — converter old format → tipTap JSON
- `services/curriculo_export.py` — gerar PDF/DOCX do tipTap JSON
- `api/resume.py` — + endpoint export, converter na resposta

### Modelo de Dados

```json
{
  "tipTapJson": {
    "type": "doc",
    "content": [
      { "type": "headerBlock", "attrs": { "nome": "...", "cargo": "..." } },
      { "type": "resumoBlock", "attrs": { "texto": "..." } },
      { "type": "experienciaBlock", "attrs": { "empresa": "...", "cargo": "...", "dataInicio": "...", "dataFim": "...", "descricao": "...", "bullets": [] } },
      { "type": "skillsBlock", "attrs": { "skills": ["React", "Python"] } },
      { "type": "customSectionBlock", "attrs": { "titulo": "Open Source", "conteudo": "..." } }
    ]
  },
  "dados_extraidos": { ... },
  "nome_versao": "...",
  "ativo": true
}
```

### Nodes TipTap

Cada node customizado define:
- `addAttributes()` — schema dos dados estruturados
- `parseHTML()` / `renderHTML()` — DOM rendering
- `addNodeView()` — React component para edição inline

### Editor

- Auto-save com debounce de 3s
- Undo/Redo via ProseMirror history
- Slash menu (`/`) para adicionar seções
- Drag handle para reordenar blocos
- Placeholder "Clique para editar..." quando vazio

### Upload

- Dropzone com react-dropzone
- Aceita .pdf, .docx, .doc
- Exibe progresso "Processando..."
- Após parser: apaga arquivo original

### Export

- `POST /api/v1/curriculo/{id}/export?formato=pdf|docx`
- Recebe os attrs do tipTapJson, renderiza HTML com layout A4
- WeasyPrint converte HTML → PDF
- Template docx com placeholders

### Versionamento

- Mantém sidebar existente
- Cada versão tem seu próprio tipTapJson
- Auto-save salva na versão ativa
- Duplicar = clonar tipTapJson
- Restaurar = trocar versão ativa

### Layout Visual

- Fundo cinza claro
- Folha A4 simulada com sombra
- Tipografia profissional (Inter ou similar)
- Espaçamento generoso entre seções
- Header com nome centralizado
- Separadores `———` entre seções
- Rodapé "Work Job Platform" (exportação)
