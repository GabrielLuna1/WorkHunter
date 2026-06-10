'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { ResumeViewer } from '@/components/resume-viewer/ResumeViewer'
import { UploadZone } from '@/components/curriculo/UploadZone'
import { VersaoSidebar } from '@/components/curriculo/VersaoSidebar'
import { PageTransition } from '@/components/ui/PageTransition'
import {
  Loader2,
  Download,
  FileDown,
  FileText,
  AlertCircle,
  Brain,
  Sparkles,
  Shield,
  BarChart3,
  File,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import * as Dialog from '@radix-ui/react-dialog'

interface Versao {
  _id: string
  versao: number
  nome_versao?: string | null
  atualizado_em: string
  ativo: boolean
  fonte_arquivo?: string | null
}

const API = '/api/v1/curriculo'

type PageState = 'loading' | 'upload' | 'viewer' | 'error'

export default function CurriculoPage() {
  const [versoes, setVersoes] = useState<Versao[]>([])
  const [versaoAtiva, setVersaoAtiva] = useState<any>(null)
  const [versaoAtivaId, setVersaoAtivaId] = useState<string | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [subState, setSubState] = useState('')
  const [showInsights, setShowInsights] = useState(false)
  const [viewMode, setViewMode] = useState<'parsed' | 'original'>('parsed')

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setPageState('loading')
    setSubState('Carregando currículo...')
    try {
      const [versoesRes, curriculoRes] = await Promise.all([
        api.get(`${API}/versoes`),
        api.get(`${API}/`),
      ])
      const v = (versoesRes.data?.data || []) as Versao[]
      setVersoes(v)

      if (curriculoRes.data?.data) {
        const curriculo = curriculoRes.data.data
        setVersaoAtiva(curriculo)
        setVersaoAtivaId(curriculo._id)

        const hasData = (curriculo.experiencias?.length || 0) + (curriculo.formacoes?.length || 0) > 0
        setViewMode(hasData ? 'parsed' : 'original')
        setPageState('viewer')
      } else {
        setPageState('upload')
      }
    } catch {
      setPageState('error')
      setErrorMsg('Erro ao carregar currículo. Verifique se o servidor está rodando.')
    }
  }

  async function handleSelect(id: string) {
    setSubState('Restaurando versão...')
    try {
      const res = await api.post(`${API}/versoes/${id}/restaurar`)
      if (res.data?.data) {
        setVersaoAtiva(res.data.data)
        setVersaoAtivaId(id)
        await carregar()
      }
    } catch {
      toast.error('Erro ao restaurar versão')
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const res = await api.post(`${API}/versoes/${id}/duplicar`)
      if (res.data?.success) {
        toast.success('Versão duplicada')
        await carregar()
      }
    } catch {
      toast.error('Erro ao duplicar')
    }
  }

  async function handleDelete(id: string) {
    setDeleteTarget(id)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await api.delete(`${API}/versoes/${deleteTarget}`)
      toast.success('Versão excluída')
      setDeleteTarget(null)
      await carregar()
    } catch {
      toast.error('Erro ao excluir')
    }
  }

  async function handleRename(id: string, nome: string) {
    try {
      await api.put(`${API}/versoes/${id}/renomear`, { nome })
      await carregar()
    } catch {
      toast.error('Erro ao renomear')
    }
  }

  async function handleSetPadrao(id: string) {
    try {
      await api.post(`${API}/versoes/${id}/set-padrao`)
      toast.success('Versão definida como padrão')
      await carregar()
    } catch {
      toast.error('Erro')
    }
  }

  async function handleNovaVersao() {
    setShowUpload(true)
  }

  async function handleUploadSuccess(data: any) {
    setShowUpload(false)
    setVersaoAtiva(data)
    setVersaoAtivaId(data._id)

    const hasData = (data.experiencias?.length || 0) + (data.formacoes?.length || 0) > 0
    setViewMode(hasData ? 'parsed' : 'original')
    setPageState('viewer')
  }

  async function handleExport(formato: 'pdf' | 'docx') {
    if (!versaoAtivaId) return
    setExportOpen(false)
    setSubState(`Exportando ${formato.toUpperCase()}...`)
    try {
      const res = await api.get(`${API}/${versaoAtivaId}/export?formato=${formato}`, {
        responseType: 'blob',
      })
      const blob = new Blob([res.data])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `curriculo.${formato}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Currículo exportado como ${formato.toUpperCase()}`)
    } catch {
      toast.error('Erro ao exportar')
    }
  }

  // --- Loading state ---
  if (pageState === 'loading') {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
            </div>
            <div
              className="absolute -inset-2 rounded-2xl opacity-20 animate-pulse"
              style={{
                background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
              }}
            />
          </div>
          <span className="text-[11px] text-ink-tertiary">{subState}</span>
        </div>
      </PageTransition>
    )
  }

  // --- Error state ---
  if (pageState === 'error') {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-14 h-14 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-danger" />
          </div>
          <p className="text-sm text-ink-muted max-w-md text-center">{errorMsg}</p>
          <button
            onClick={() => carregar()}
            className="px-4 py-2 text-xs font-medium bg-surface border border-hairline text-ink-muted hover:text-ink rounded-lg transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </PageTransition>
    )
  }

  // --- Empty / Upload state ---
  if (pageState === 'upload' && !showUpload) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-canvas">
          <div className="max-w-3xl mx-auto py-16 px-4">
            <div className="text-center mb-10">
              {/* Premium empty state */}
              <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 mb-5">
                <FileText className="w-7 h-7 text-accent" />
                <div
                  className="absolute -inset-3 rounded-3xl opacity-10"
                  style={{
                    background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
                  }}
                />
              </div>
              <h1 className="text-xl font-heading font-semibold metallic-gradient tracking-tight">
                Meu Currículo
              </h1>
              <p className="text-[13px] text-ink-subtle mt-2 max-w-sm mx-auto">
                Faça upload do seu currículo para começar. A plataforma vai ler, estruturar e
                organizar seu documento automaticamente.
              </p>

              {/* Feature pills */}
              <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
                <FeaturePill icon={<Sparkles className="w-3 h-3" />} label="Parser Inteligente" />
                <FeaturePill icon={<Shield className="w-3 h-3" />} label="Preservação Total" />
                <FeaturePill icon={<BarChart3 className="w-3 h-3" />} label="Match Score" />
              </div>
            </div>
            <UploadZone onSuccess={handleUploadSuccess} />
          </div>
        </div>
      </PageTransition>
    )
  }

  // --- Main viewer ---
  const versaoLabel = versaoAtivaId
    ? `v${versoes.find((v) => v._id === versaoAtivaId)?.versao || '-'}`
    : ''

  return (
    <PageTransition>
      <div className="flex h-screen bg-canvas">
        {/* Left: Version sidebar */}
        <VersaoSidebar
          versoes={versoes}
          versaoAtivaId={versaoAtivaId}
          loading={false}
          onSelect={handleSelect}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onRename={handleRename}
          onSetPadrao={handleSetPadrao}
          onNovaVersao={handleNovaVersao}
          onUploadClick={() => setShowUpload(true)}
          onInsightsToggle={() => setShowInsights(!showInsights)}
          showInsights={showInsights}
        />

        {/* Center: Document viewer */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Minimal toolbar */}
          <header className="shrink-0 bg-canvas/80 backdrop-blur-lg border-b border-hairline/50 px-4 md:px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-semibold text-ink">Meu Currículo</h1>
              {versaoLabel && (
                <span className="text-[10px] text-ink-tertiary bg-surface-2/60 px-2 py-0.5 rounded-full border border-hairline/50">
                  {versaoLabel}
                </span>
              )}
              {}
              {versaoAtiva?.parsing_confidence != null && (
                <span
                  className="text-[9px] px-2 py-0.5 rounded-full border font-medium"
                  style={{
                    color:
                      versaoAtiva.parsing_confidence >= 0.7
                        ? 'var(--success)'
                        : versaoAtiva.parsing_confidence >= 0.4
                          ? 'var(--accent)'
                          : 'var(--warning)',
                    borderColor:
                      versaoAtiva.parsing_confidence >= 0.7
                        ? 'rgba(var(--success-rgb, 34,197,94), 0.2)'
                        : 'rgba(var(--accent-rgb, 200,184,138), 0.2)',
                    backgroundColor:
                      versaoAtiva.parsing_confidence >= 0.7
                        ? 'rgba(var(--success-rgb, 34,197,94), 0.06)'
                        : 'rgba(var(--accent-rgb, 200,184,138), 0.06)',
                  }}
                >
                  {Math.round(versaoAtiva.parsing_confidence * 100)}% parsed
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {/* View toggle */}
              <div className="flex items-center bg-surface border border-hairline rounded-lg p-0.5 mr-1">
                <button
                  onClick={() => setViewMode('parsed')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-md transition-all ${
                    viewMode === 'parsed'
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-ink-tertiary hover:text-ink-muted'
                  }`}
                >
                  <Eye className="w-3 h-3" /> Estruturado
                </button>
                <button
                  onClick={() => setViewMode('original')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-md transition-all ${
                    viewMode === 'original'
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-ink-tertiary hover:text-ink-muted'
                  }`}
                >
                  <File className="w-3 h-3" /> PDF Original
                </button>
              </div>
              <div className="relative">
                <button
                  onClick={() => setExportOpen(!exportOpen)}
                  className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 text-ink-subtle hover:text-ink bg-surface border border-hairline hover:border-hairline-strong rounded-lg transition-all duration-200 hover:shadow-sm"
                >
                  <Download className="w-3 h-3" /> Exportar
                </button>
                {exportOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-surface border border-hairline rounded-lg shadow-xl py-1 z-20 min-w-[130px]">
                    <ExportBtn label="PDF" onClick={() => handleExport('pdf')} />
                    <ExportBtn label="DOCX" onClick={() => handleExport('docx')} />
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Document area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10">
            {viewMode === 'original' && versaoAtivaId ? (
              <iframe
                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8070'}/api/v1/curriculo/${versaoAtivaId}/file`}
                className="w-full h-full min-h-[80vh] rounded-xl border border-hairline bg-white"
                title="PDF Original"
              />
            ) : (
              <ResumeViewer curriculo={versaoAtiva} versaoLabel={versaoLabel} />
            )}
          </div>
        </div>

        {/* Right: Insights panel */}
        {showInsights && (
          <div className="w-[280px] shrink-0 border-l border-hairline bg-surface overflow-y-auto">
            <div className="p-4 border-b border-hairline">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-semibold text-ink-subtle tracking-wider flex items-center gap-1.5 uppercase">
                  <Brain className="w-3.5 h-3.5 text-accent" />
                  Insights
                </h2>
                <button
                  onClick={() => setShowInsights(false)}
                  className="text-ink-tertiary hover:text-ink-muted text-xs transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {versaoAtiva ? (
                <>
                  <InsightCard
                    label="Seções Detectadas"
                    value={`${versaoAtiva.total_secoes_detectadas || 0}`}
                  />
                  <InsightCard
                    label="Skills Identificadas"
                    value={`${versaoAtiva.skills?.length || 0}`}
                  />
                  <InsightCard
                    label="Experiências"
                    value={`${versaoAtiva.experiencias?.length || 0}`}
                  />
                  <InsightCard
                    label="Idioma Principal"
                    value={
                      versaoAtiva.idioma_detectado === 'pt'
                        ? 'Português'
                        : versaoAtiva.idioma_detectado === 'en'
                          ? 'English'
                          : versaoAtiva.idioma_detectado === 'es'
                            ? 'Español'
                            : '—'
                    }
                  />
                  {versaoAtiva.parsing_warnings?.length > 0 && (
                    <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
                      <p className="text-[10px] font-medium text-warning mb-1">⚠ Alertas do Parser</p>
                      {versaoAtiva.parsing_warnings.map((w: string, i: number) => (
                        <p key={i} className="text-[10px] text-ink-muted leading-relaxed">
                          {w}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              ) : null}

              {/* Future features placeholder */}
              <div className="pt-3 border-t border-hairline">
                <p className="text-[10px] text-ink-tertiary text-center leading-relaxed">
                  Em breve: match score, vagas compatíveis, ATS compatibility e recomendações.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <Dialog.Root open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-surface border border-hairline rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <Dialog.Title className="text-sm font-semibold text-ink mb-2">
              Excluir versão?
            </Dialog.Title>
            <p className="text-[12px] text-ink-muted leading-relaxed mb-6">
              Esta ação não pode ser desfeita. A versão será removida permanentemente.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Dialog.Close className="px-3 py-1.5 text-[11px] text-ink-tertiary hover:text-ink-muted transition-colors rounded-lg">
                Cancelar
              </Dialog.Close>
              <button
                onClick={confirmDelete}
                className="px-3 py-1.5 text-[11px] font-medium text-white bg-danger hover:bg-danger/90 transition-colors rounded-lg"
              >
                Excluir
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Upload modal */}
      <Dialog.Root open={showUpload} onOpenChange={setShowUpload}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-surface border border-hairline rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <Dialog.Title className="text-sm font-semibold text-ink mb-4">
              Novo Currículo
            </Dialog.Title>
            <UploadZone onSuccess={handleUploadSuccess} />
            <div className="mt-4 text-center">
              <Dialog.Close className="text-[11px] text-ink-tertiary hover:text-ink-muted transition-colors">
                Cancelar
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </PageTransition>
  )
}

function ExportBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors"
    >
      <FileDown className="w-3 h-3" /> {label}
    </button>
  )
}

function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] text-ink-subtle bg-surface border border-hairline">
      {icon}
      {label}
    </span>
  )
}

function InsightCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-hairline/50 last:border-0">
      <span className="text-[10px] text-ink-tertiary">{label}</span>
      <span className="text-[11px] font-medium text-ink">{value}</span>
    </div>
  )
}
