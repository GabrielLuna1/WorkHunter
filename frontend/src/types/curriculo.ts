export interface ExperienciaProfissional {
  empresa: string
  cargo: string
  data_inicio: string | null
  data_fim: string | null
  descricao: string[]
  tecnologias: string[]
}

export interface Projeto {
  nome: string
  descricao: string | null
  bullets: string[]
  tecnologias: string[]
  url: string | null
}

export interface Formacao {
  instituicao: string
  curso: string
  nivel: string | null
  data_conclusao: string | null
  em_andamento: boolean
}

export interface Certificacao {
  nome: string
  instituicao: string | null
  ano: string | null
  descricao: string | null
}

export interface Idioma {
  idioma: string
  nivel: string
}

export interface SecaoGenerica {
  titulo: string
  conteudo: string
  ordem: number
}

export interface Curriculo {
  _id?: string
  nome: string
  email: string | null
  telefone: string | null
  cidade: string | null
  linkedin: string | null
  portfolio: string | null
  github: string | null
  resumo_profissional: string | null
  experiencias: ExperienciaProfissional[]
  projetos: Projeto[]
  formacoes: Formacao[]
  certificacoes: Certificacao[]
  idiomas: Idioma[]
  skills: string[]
  secoes_personalizadas: SecaoGenerica[]
  tipTapJson?: any
  // Parsing metadata
  idioma_detectado?: string | null
  parsing_confidence?: number | null
  parsing_warnings?: string[]
  total_secoes_detectadas?: number
  // Version info
  versao: number
  nome_versao: string | null
  criado_em: string | null
  atualizado_em: string | null
  fonte_arquivo: string | null
}

export interface VersaoCurriculo {
  _id: string
  nome: string
  versao: number
  nome_versao?: string | null
  atualizado_em: string
  ativo: boolean
  fonte_arquivo: string | null
}
