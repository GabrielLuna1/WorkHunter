import { ExperienciaProfissional } from '@/types/curriculo'
import { SkillBadge } from './SkillBadge'

interface ExperienciaCardProps {
  experiencia: ExperienciaProfissional
}

export function ExperienciaCard({ experiencia }: ExperienciaCardProps) {
  const periodo = [experiencia.data_inicio, experiencia.data_fim]
    .filter(Boolean)
    .join(' – ') || 'Período não informado'

  return (
    <div className="border-l-2 border-accent/40 pl-4 space-y-2 relative before:absolute before:-left-[9px] before:top-1.5 before:w-4 before:h-4 before:bg-surface before:border-2 before:border-accent/40 before:rounded-full">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[15px] font-semibold text-ink leading-tight">{experiencia.cargo}</p>
          <p className="text-[13px] text-ink-subtle">{experiencia.empresa}</p>
        </div>
        <span className="text-xs text-ink-tertiary whitespace-nowrap bg-surface-2 px-2 py-0.5 rounded-full">{periodo}</span>
      </div>

      {experiencia.descricao.length > 0 && (
        <ul className="space-y-1.5 mt-2">
          {experiencia.descricao.map((item, i) => (
            <li key={i} className="text-[13px] text-ink-muted flex gap-2 leading-relaxed">
              <span className="text-accent mt-1 text-[10px]">■</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}

      {experiencia.tecnologias.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-3">
          {experiencia.tecnologias.map((tech) => (
            <SkillBadge key={tech} skill={tech} />
          ))}
        </div>
      )}
    </div>
  )
}
