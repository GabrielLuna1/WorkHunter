import { Projeto } from '@/types/curriculo'
import { SkillBadge } from './SkillBadge'
import { ExternalLink } from 'lucide-react'

export function ProjetoCard({ projeto }: { projeto: Projeto }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface-2/50 p-4 space-y-3 hover:border-hairline-strong transition-colors">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[14px] font-semibold text-ink">{projeto.nome}</p>
        {projeto.url && (
          <a
            href={projeto.url.startsWith('http') ? projeto.url : `https://${projeto.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover transition-colors p-1"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      {projeto.descricao && (
        <p className="text-[13px] text-ink-muted leading-relaxed">{projeto.descricao}</p>
      )}

      {projeto.bullets.length > 0 && (
        <ul className="space-y-1.5">
          {projeto.bullets.map((bullet, i) => (
            <li key={i} className="text-[13px] text-ink-muted flex gap-2 leading-relaxed">
              <span className="text-accent mt-1 text-[10px]">▸</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}

      {projeto.tecnologias.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2">
          {projeto.tecnologias.map((tech) => (
            <SkillBadge key={tech} skill={tech} />
          ))}
        </div>
      )}
    </div>
  )
}
