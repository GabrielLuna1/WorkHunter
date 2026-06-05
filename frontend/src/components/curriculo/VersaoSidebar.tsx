'use client'

import { useState } from 'react'
import {
  FileText,
  Loader2,
  Check,
  Star,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  X,
  Upload,
  Brain,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Versao {
  _id: string
  versao: number
  nome_versao?: string | null
  atualizado_em: string
  ativo: boolean
  fonte_arquivo?: string | null
}

interface VersaoSidebarProps {
  versoes: Versao[]
  versaoAtivaId: string | null
  loading: boolean
  onSelect: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, nome: string) => void
  onSetPadrao: (id: string) => void
  onNovaVersao: () => void
  onUploadClick?: () => void
  onExportClick?: () => void
  onInsightsToggle?: () => void
  showInsights?: boolean
}

function formatRelative(iso: string): string {
  try {
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHrs = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHrs / 24)

    if (diffMin < 1) return 'agora'
    if (diffMin < 60) return `${diffMin}min atrás`
    if (diffHrs < 24) return `${diffHrs}h atrás`
    if (diffDays < 7) return `${diffDays}d atrás`
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  } catch {
    return iso
  }
}

function fileIcon(fonte: string | null | undefined) {
  if (fonte === 'pdf') return '📄'
  if (fonte === 'docx' || fonte === 'doc') return '📝'
  return '📋'
}

export function VersaoSidebar({
  versoes,
  versaoAtivaId,
  loading,
  onSelect,
  onDuplicate,
  onDelete,
  onRename,
  onSetPadrao,
  onNovaVersao,
  onUploadClick,
  onInsightsToggle,
  showInsights,
}: VersaoSidebarProps) {
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)

  return (
    <div className="w-60 shrink-0 border-r border-hairline bg-surface flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-hairline">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-ink-subtle flex items-center gap-1.5 tracking-wider">
            <FileText className="w-3.5 h-3.5 text-accent" />
            VERSÕES
          </h2>
          <button
            onClick={onNovaVersao}
            className="text-[10px] text-accent hover:text-accent-hover font-medium transition-colors"
          >
            + Nova
          </button>
        </div>
        <p className="text-[10px] text-ink-tertiary mt-0.5">
          {versoes.length} versão{versoes.length !== 1 ? 'ões' : ''}
        </p>
      </div>

      {/* Version list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-4 h-4 animate-spin text-accent" />
        </div>
      ) : versoes.length === 0 ? (
        <div className="px-4 py-8 text-center text-[11px] text-ink-tertiary">
          Nenhuma versão ainda.
          <br />
          Faça upload de um currículo.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {versoes.map((v) => {
            const isAtiva = v._id === versaoAtivaId
            const label = v.nome_versao || `Versão ${v.versao}`
            return (
              <div
                key={v._id}
                className={cn(
                  'group relative px-4 py-3 cursor-pointer transition-all duration-200',
                  'hover:bg-surface-2/50',
                  isAtiva && 'bg-accent/[0.04] border-l-2 border-accent',
                  !isAtiva && 'border-l-2 border-transparent'
                )}
                onClick={() => {
                  onSelect(v._id)
                  setMenuId(null)
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  {editId === v._id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 text-[11px] bg-surface-2 border border-hairline rounded px-1.5 py-0.5 text-ink focus:outline-none focus:border-accent"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onRename(v._id, editName)
                            setEditId(null)
                          }
                          if (e.key === 'Escape') setEditId(null)
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRename(v._id, editName)
                          setEditId(null)
                        }}
                        className="text-success hover:text-green-400"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditId(null)
                        }}
                        className="text-ink-tertiary hover:text-ink-muted"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px]">{fileIcon(v.fonte_arquivo)}</span>
                          <p
                            className={cn(
                              'text-[11px] font-medium truncate',
                              isAtiva ? 'text-accent' : 'text-ink-muted'
                            )}
                          >
                            {label}
                          </p>
                          {v.ativo && (
                            <Star className="w-2.5 h-2.5 text-accent fill-accent shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5 text-ink-tertiary" />
                          <p className="text-[9px] text-ink-tertiary">
                            {formatRelative(v.atualizado_em)}
                          </p>
                        </div>
                      </div>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuId(menuId === v._id ? null : v._id)
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-ink-tertiary hover:text-ink-muted transition-all"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                        {menuId === v._id && (
                          <div
                            className="absolute right-0 top-full mt-1 bg-surface border border-hairline rounded-lg shadow-lg py-1 z-20 min-w-[140px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MenuItem
                              icon={<Pencil className="w-3 h-3" />}
                              label="Renomear"
                              onClick={() => {
                                setEditId(v._id)
                                setEditName(v.nome_versao || `Versão ${v.versao}`)
                                setMenuId(null)
                              }}
                            />
                            <MenuItem
                              icon={<Copy className="w-3 h-3" />}
                              label="Duplicar"
                              onClick={() => {
                                onDuplicate(v._id)
                                setMenuId(null)
                              }}
                            />
                            {!v.ativo && (
                              <MenuItem
                                icon={<Star className="w-3 h-3" />}
                                label="Definir padrão"
                                onClick={() => {
                                  onSetPadrao(v._id)
                                  setMenuId(null)
                                }}
                              />
                            )}
                            <div className="border-t border-hairline my-1" />
                            <MenuItem
                              icon={<Trash2 className="w-3 h-3" />}
                              label="Excluir"
                              onClick={() => {
                                onDelete(v._id)
                                setMenuId(null)
                              }}
                              danger
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-hairline p-3 space-y-1">
        {onUploadClick && (
          <ActionBtn
            icon={<Upload className="w-3.5 h-3.5" />}
            label="Upload"
            onClick={onUploadClick}
          />
        )}
      </div>

      {/* Insights toggle */}
      {onInsightsToggle && (
        <button
          onClick={onInsightsToggle}
          className={cn(
            'flex items-center gap-2 w-full px-4 py-2.5 text-[11px] border-t border-hairline transition-colors',
            showInsights
              ? 'text-accent bg-accent/[0.03]'
              : 'text-ink-tertiary hover:text-ink-muted hover:bg-surface-2'
          )}
        >
          <Brain className="w-3.5 h-3.5" />
          Insights
        </button>
      )}
    </div>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full px-3 py-1.5 text-[11px] transition-colors ${
        danger
          ? 'text-danger hover:bg-danger/10'
          : 'text-ink-muted hover:text-ink hover:bg-surface-2'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function ActionBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-ink-muted hover:text-ink hover:bg-surface-2 rounded-md transition-colors"
    >
      {icon}
      {label}
    </button>
  )
}
