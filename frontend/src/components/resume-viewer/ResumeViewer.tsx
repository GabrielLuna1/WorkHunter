import { Curriculo } from '@/types/curriculo'
import { MapPin, Mail, Phone, ExternalLink, Github, Linkedin, Briefcase, GraduationCap, Award, Languages, Code2 } from 'lucide-react'

interface ResumeViewerProps {
  curriculo: Curriculo | null
  versaoLabel?: string
}

export function ResumeViewer({ curriculo, versaoLabel }: ResumeViewerProps) {
  if (!curriculo || !curriculo._id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
        <div className="w-16 h-20 rounded-lg border-2 border-dashed border-hairline flex items-center justify-center">
          <div className="w-8 h-1 bg-hairline rounded-full" />
        </div>
        <p className="text-xs text-ink-tertiary">Nenhum currículo carregado</p>
      </div>
    )
  }

  const contatoLinks = [
    { icon: <Mail className="w-3.5 h-3.5" />, value: curriculo.email, href: curriculo.email ? `mailto:${curriculo.email}` : null },
    { icon: <Phone className="w-3.5 h-3.5" />, value: curriculo.telefone, href: curriculo.telefone ? `tel:${curriculo.telefone}` : null },
    { icon: <MapPin className="w-3.5 h-3.5" />, value: curriculo.cidade, href: null },
    { icon: <Linkedin className="w-3.5 h-3.5" />, value: curriculo.linkedin, href: curriculo.linkedin },
    { icon: <Github className="w-3.5 h-3.5" />, value: curriculo.github, href: curriculo.github },
    { icon: <ExternalLink className="w-3.5 h-3.5" />, value: curriculo.portfolio, href: curriculo.portfolio },
  ].filter((item) => item.value)

  return (
    <div className="w-full bg-[#1e1e1e] rounded-xl shadow-2xl border border-hairline p-8 md:p-12 text-ink">
      {/* Cabeçalho */}
      <header className="mb-8 border-b border-hairline pb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-4 text-white">
          {curriculo.nome}
        </h1>
        
        {contatoLinks.length > 0 && (
          <div className="flex flex-wrap gap-4 text-sm text-ink-muted">
            {contatoLinks.map((link, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="text-ink-tertiary">{link.icon}</span>
                {link.href ? (
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                    {link.value}
                  </a>
                ) : (
                  <span>{link.value}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Resumo Profissional */}
      {curriculo.resumo_profissional && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4 text-accent font-semibold tracking-wide uppercase text-sm">
            <Briefcase className="w-4 h-4" /> Resumo Profissional
          </div>
          <p className="text-[15px] leading-relaxed text-ink-muted whitespace-pre-wrap">
            {curriculo.resumo_profissional}
          </p>
        </section>
      )}

      {/* Experiência Profissional */}
      {curriculo.experiencias && curriculo.experiencias.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-6 text-accent font-semibold tracking-wide uppercase text-sm">
            <Briefcase className="w-4 h-4" /> Experiência Profissional
          </div>
          <div className="space-y-6">
            {curriculo.experiencias.map((exp, idx) => (
              <div key={idx} className="group">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{exp.cargo}</h3>
                    <div className="text-ink-muted font-medium">{exp.empresa}</div>
                  </div>
                  <div className="text-sm text-ink-tertiary mt-1 md:mt-0 font-mono">
                    {exp.data_inicio} {exp.data_fim ? `— ${exp.data_fim}` : '— Atual'}
                  </div>
                </div>
                {exp.descricao && exp.descricao.length > 0 && (
                  <ul className="list-disc list-outside ml-4 mt-3 space-y-2 text-[14px] leading-relaxed text-ink-muted">
                    {exp.descricao.map((bullet, i) => (
                      <li key={i}>{bullet}</li>
                    ))}
                  </ul>
                )}
                {exp.tecnologias && exp.tecnologias.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {exp.tecnologias.map((tech, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-surface border border-hairline text-[11px] text-ink-tertiary font-mono">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projetos */}
      {curriculo.projetos && curriculo.projetos.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-6 text-accent font-semibold tracking-wide uppercase text-sm">
            <Code2 className="w-4 h-4" /> Projetos em Destaque
          </div>
          <div className="space-y-6">
            {curriculo.projetos.map((proj, idx) => (
              <div key={idx}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-white">{proj.nome}</h3>
                  {proj.url && (
                    <a href={proj.url} target="_blank" rel="noopener noreferrer" className="text-ink-tertiary hover:text-accent">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                {proj.descricao && (
                  <p className="text-[14px] leading-relaxed text-ink-muted mb-3">{proj.descricao}</p>
                )}
                {proj.bullets && proj.bullets.length > 0 && (
                  <ul className="list-disc list-outside ml-4 mb-3 space-y-1.5 text-[14px] leading-relaxed text-ink-muted">
                    {proj.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
                {proj.tecnologias && proj.tecnologias.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {proj.tecnologias.map((tech, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-surface border border-hairline text-[11px] text-ink-tertiary font-mono">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Formação */}
      {curriculo.formacoes && curriculo.formacoes.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-6 text-accent font-semibold tracking-wide uppercase text-sm">
            <GraduationCap className="w-4 h-4" /> Formação Acadêmica
          </div>
          <div className="space-y-5">
            {curriculo.formacoes.map((form, idx) => (
              <div key={idx}>
                <h3 className="text-base font-semibold text-white">{form.curso}</h3>
                <div className="flex flex-col md:flex-row md:items-center md:gap-2 text-[14px] text-ink-muted mt-0.5">
                  <span className="font-medium text-ink">{form.instituicao}</span>
                  <span className="hidden md:inline text-ink-tertiary">•</span>
                  <span>{form.nivel}</span>
                  <span className="hidden md:inline text-ink-tertiary">•</span>
                  <span className="font-mono">{form.data_conclusao || 'Em andamento'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills e Idiomas (Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {curriculo.skills && curriculo.skills.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4 text-accent font-semibold tracking-wide uppercase text-sm">
              <Code2 className="w-4 h-4" /> Competências Técnicas
            </div>
            <div className="flex flex-wrap gap-2">
              {curriculo.skills.map((skill, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded bg-surface-2 border border-hairline text-[13px] text-ink font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {curriculo.idiomas && curriculo.idiomas.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4 text-accent font-semibold tracking-wide uppercase text-sm">
              <Languages className="w-4 h-4" /> Idiomas
            </div>
            <div className="space-y-3">
              {curriculo.idiomas.map((idioma, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-hairline/50 pb-2">
                  <span className="text-white font-medium">{idioma.idioma}</span>
                  <span className="text-[13px] text-ink-muted">{idioma.nivel}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Certificações */}
      {curriculo.certificacoes && curriculo.certificacoes.length > 0 && (
        <section className="mt-10 pt-8 border-t border-hairline">
          <div className="flex items-center gap-2 mb-6 text-accent font-semibold tracking-wide uppercase text-sm">
            <Award className="w-4 h-4" /> Certificações
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {curriculo.certificacoes.map((cert, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-surface border border-hairline">
                <h3 className="font-semibold text-white text-[15px] mb-1">{cert.nome}</h3>
                <div className="text-[13px] text-ink-muted">
                  {cert.instituicao} {cert.ano ? `• ${cert.ano}` : ''}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {versaoLabel && (
        <div className="mt-12 pt-6 border-t border-hairline text-center">
          <p className="text-[11px] text-ink-tertiary font-mono">
            Versão visualizada: {versaoLabel}
          </p>
        </div>
      )}
    </div>
  )
}
